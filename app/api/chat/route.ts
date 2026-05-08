import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { RAG_TOP_K, SILICONFLOW_BASE_URL } from "@/lib/constants";
import {
  getChatModel,
  getRagSearchScoreThreshold,
  getSiliconFlowApiKey,
} from "@/lib/env";
import { buildChatSystemPrompt } from "@/lib/chat-system";
import { DEFAULT_WORK_SCOPE, parseRagFromBody } from "@/lib/kb-scope";
import { searchSimilarChunks } from "@/lib/lancedb";
import { embedTexts } from "@/lib/siliconflow-embeddings";
import { getLatestUserText } from "@/lib/ui-message-text";
import { sortListByStatTool } from "@/lib/sort-list-by-stat-tool";
import {
  createRequestLogger,
  serializeError,
} from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const traceId = req.headers.get("x-trace-id")?.trim() || randomUUID();
  const userId = req.headers.get("x-user-id")?.trim() || undefined;
  const { info, error } = createRequestLogger({
    trace_id: traceId,
    user_id: userId,
    module: "api",
  });
  const requestStart = performance.now();

  let messages: UIMessage[];
  let ragScope = DEFAULT_WORK_SCOPE;
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages 格式无效" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    ragScope = parseRagFromBody(body.rag);
  } catch (err) {
    error({
      action: "parse_body",
      msg: "请求体解析失败",
      latency_ms: Math.round(performance.now() - requestStart),
      ...serializeError(err),
    });
    return new Response(JSON.stringify({ error: "请求体无效" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = getSiliconFlowApiKey();
    const siliconflow = createOpenAI({
      apiKey,
      baseURL: SILICONFLOW_BASE_URL,
    });

    const query = getLatestUserText(messages);
    let contextBlock =
      "（未从本地向量库检索到片段；若问题与上传资料相关，请说明暂无匹配内容。）";

    if (query.length > 0) {
      const embedStart = performance.now();
      const [qVec] = await embedTexts([query]);
      info({
        module: "retrieval",
        action: "embed_text",
        msg: "Embedding 生成完成",
        latency_ms: Math.round(performance.now() - embedStart),
      });

      const searchStart = performance.now();
      const hits = await searchSimilarChunks(qVec, RAG_TOP_K, ragScope);
      const searchThreshold = getRagSearchScoreThreshold();
      info({
        module: "retrieval",
        action: "vector_search",
        msg: "LanceDB 向量检索完成",
        latency_ms: Math.round(performance.now() - searchStart),
        vector_db_matches: hits.length,
        search_score_threshold: searchThreshold ?? null,
        top_matches: hits.slice(0, 2).map((h) => ({
          source: h.source,
          chunk_index: h.chunk_index,
          distance: h.distance ?? null,
          domain: h.domain,
          sub_domain: h.sub_domain,
        })),
      });

      if (hits.length > 0) {
        contextBlock = hits
          .map(
            (h, i) =>
              `【片段 ${i + 1} · domain=${h.domain} · sub=${h.sub_domain}${
                h.sub_domain_label ? ` (${h.sub_domain_label})` : ""
              } · 来源 ${h.source} · #${h.chunk_index}】\n${h.text}`,
          )
          .join("\n\n---\n\n");
      }
    }

    const system = buildChatSystemPrompt({
      ragScope,
      contextBlock,
      latestUserQuery: query,
    });

    const modelName = getChatModel();
    const llmStart = performance.now();

    // @ai-sdk/openai v3：默认 provider() 走 /responses；SiliconFlow 仅兼容 /chat/completions，须用 .chat()
    const result = streamText({
      model: siliconflow.chat(modelName),
      system,
      messages: await convertToModelMessages(messages),
      onFinish: ({ usage }) => {
        const llmLatency = Math.round(performance.now() - llmStart);
        const prompt = (usage as any)?.promptTokens ?? (usage as any)?.prompt_tokens;
        const completion =
          (usage as any)?.completionTokens ?? (usage as any)?.completion_tokens;
        const total = (usage as any)?.totalTokens ?? (usage as any)?.total_tokens;
        const tokensUsed =
          typeof total === "number"
            ? total
            : typeof prompt === "number" && typeof completion === "number"
              ? prompt + completion
              : undefined;

        info({
          module: "llm_generation",
          action: "llm_chat",
          msg: "SiliconFlow LLM 调用完成",
          latency_ms: llmLatency,
          provider: "siliconflow",
          model_name: modelName,
          ...(typeof tokensUsed === "number" ? { tokens_used: tokensUsed } : {}),
        });

        info({
          action: "rag_request_done",
          msg: "RAG 请求完成（流式输出结束）",
          latency_ms: Math.round(performance.now() - requestStart),
        });
      },
      ...(ragScope.domain === "game"
        ? {
            tools: { sort_list_by_stat: sortListByStatTool },
            stopWhen: stepCountIs(8),
          }
        : {}),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    error({
      module: "api",
      action: "rag_chat",
      msg: "RAG 对话失败",
      latency_ms: Math.round(performance.now() - requestStart),
      ...serializeError(err),
    });
    const message = err instanceof Error ? err.message : "对话失败";
    return new Response(
      JSON.stringify({ error: message, trace_id: traceId }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
