import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { z } from "zod";
import { RAG_TOP_K } from "@/lib/constants";
import { createRequestLogger, serializeError } from "@/lib/logger";
import { verifyLawSource } from "@/lib/law/source-verify";
import { searchLawChunks } from "@/lib/lancedb";
import { embedTexts } from "@/lib/siliconflow-embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  query: z.string().trim().min(1).max(2000),
  limit: z.number().int().min(1).max(20).optional(),
});

export async function POST(req: Request) {
  const traceId = req.headers.get("x-trace-id")?.trim() || randomUUID();
  const requestStart = performance.now();
  const { info, error } = createRequestLogger({
    trace_id: traceId,
    module: "api",
  });

  let query: string;
  let limit: number;
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "参数无效" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    query = parsed.data.query;
    limit = parsed.data.limit ?? RAG_TOP_K;
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
    const embedStart = performance.now();
    const [qVec] = await embedTexts([query]);
    info({
      module: "law_search",
      action: "embed_text",
      msg: "Embedding 生成完成",
      latency_ms: Math.round(performance.now() - embedStart),
    });

    const searchStart = performance.now();
    const hits = await searchLawChunks(qVec!, limit);
    info({
      module: "law_search",
      action: "vector_search",
      msg: "LanceDB 向量检索完成（law_chunks）",
      latency_ms: Math.round(performance.now() - searchStart),
      matches: hits.length,
    });

    const results = hits.map((h) => {
      const source = h.source;
      const verify = source ? verifyLawSource(source) : verifyLawSource("");
      return {
        text: h.text,
        source: h.source,
        chunk_index: h.chunk_index,
        sub_domain: h.sub_domain ?? "",
        sub_domain_label: h.sub_domain_label ?? "",
        distance: h.distance ?? null,
        verify,
      };
    });

    return new Response(
      JSON.stringify({
        trace_id: traceId,
        query,
        limit,
        count: results.length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    error({
      module: "law_search",
      action: "search",
      msg: "法律库搜索失败",
      latency_ms: Math.round(performance.now() - requestStart),
      ...serializeError(err),
    });
    const message = err instanceof Error ? err.message : "搜索失败";
    return new Response(
      JSON.stringify({ error: message, trace_id: traceId }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

