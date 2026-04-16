import { randomUUID } from "node:crypto";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { RAG_TOP_K, SILICONFLOW_BASE_URL } from "@/lib/constants";
import { getChatModel, getSiliconFlowApiKey } from "@/lib/env";
import { searchSimilarChunks } from "@/lib/lancedb";
import { embedTexts } from "@/lib/siliconflow-embeddings";
import { getLatestUserText } from "@/lib/ui-message-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function logChatError(requestId: string, phase: string, err: unknown) {
  if (err instanceof Error) {
    console.error(`[api/chat] ${requestId} ${phase}:`, err.message);
    console.error(err.stack);
    return;
  }
  console.error(`[api/chat] ${requestId} ${phase}:`, err);
}

export async function POST(req: Request) {
  const requestId = randomUUID();

  let messages: UIMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages 格式无效" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    logChatError(requestId, "parse body", err);
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
      const [qVec] = await embedTexts([query]);
      const hits = await searchSimilarChunks(qVec, RAG_TOP_K);
      if (hits.length > 0) {
        contextBlock = hits
          .map(
            (h, i) =>
              `【片段 ${i + 1} · 来源 ${h.source} · #${h.chunk_index}】\n${h.text}`,
          )
          .join("\n\n---\n\n");
      }
    }

    // @ai-sdk/openai v3：默认 provider() 走 /responses；SiliconFlow 仅兼容 /chat/completions，须用 .chat()
    const result = streamText({
      model: siliconflow.chat(getChatModel()),
      system: [
        "你是「本地知识库」助手，回答用户问题。",
        "优先依据下方检索到的上下文；若上下文不足，请明确说明并给出合理推断或建议。",
        "保持简洁、结构化，可使用 Markdown。",
        "",
        "--- 检索上下文 ---",
        contextBlock,
        "--- 上下文结束 ---",
      ].join("\n"),
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    logChatError(requestId, "stream / RAG pipeline", err);
    const message = err instanceof Error ? err.message : "对话失败";
    return new Response(
      JSON.stringify({ error: message, requestId }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
