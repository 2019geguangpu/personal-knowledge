import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { z } from "zod";
import { createRequestLogger, serializeError } from "@/lib/logger";
import { verifyLawSource } from "@/lib/law/source-verify";
import { serpApiWebSearch } from "@/lib/law/serpapi-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  query: z.string().trim().min(1).max(2000),
  num: z.number().int().min(1).max(10).optional(),
});

type CacheValue = {
  ts: number;
  data: unknown;
};

const cache = new Map<string, CacheValue>();
const TTL_MS = 10 * 60 * 1000;

function cacheGet(key: string): unknown | null {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return v.data;
}

function cacheSet(key: string, data: unknown) {
  cache.set(key, { ts: Date.now(), data });
}

export async function POST(req: Request) {
  const traceId = req.headers.get("x-trace-id")?.trim() || randomUUID();
  const requestStart = performance.now();
  const { info, error } = createRequestLogger({
    trace_id: traceId,
    module: "api",
  });

  let query: string;
  let num: number;
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
    num = parsed.data.num ?? 10;
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

  const cacheKey = `serpapi:google:${num}:${query}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return new Response(
      JSON.stringify({
        trace_id: traceId,
        provider: "serpapi",
        cached: true,
        query,
        num,
        ...((cached as any) ?? {}),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const searchStart = performance.now();
    const organic = await serpApiWebSearch({ query, num });
    info({
      module: "law_web_search",
      action: "serpapi_search",
      msg: "SerpAPI 全网搜索完成",
      latency_ms: Math.round(performance.now() - searchStart),
      organic_count: organic.length,
    });

    const results = organic.map((r) => {
      const verify = r.link ? verifyLawSource(r.link) : verifyLawSource("");
      return {
        position: r.position,
        title: r.title,
        link: r.link,
        snippet: r.snippet,
        verify,
      };
    });

    const payload = {
      count: results.length,
      results,
    };
    cacheSet(cacheKey, payload);

    return new Response(
      JSON.stringify({
        trace_id: traceId,
        provider: "serpapi",
        cached: false,
        query,
        num,
        ...payload,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    error({
      module: "law_web_search",
      action: "web_search",
      msg: "全网搜索失败",
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

