import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { z } from "zod";
import { createRequestLogger, serializeError } from "@/lib/logger";
import { verifyLawSource } from "@/lib/law/source-verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  source: z.string().trim().min(1).max(2048),
});

export async function POST(req: Request) {
  const traceId = req.headers.get("x-trace-id")?.trim() || randomUUID();
  const requestStart = performance.now();
  const { info, error } = createRequestLogger({
    trace_id: traceId,
    module: "api",
  });

  let source: string;
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "source 参数无效" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    source = parsed.data.source;
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
    const result = verifyLawSource(source);
    info({
      module: "law_verify",
      action: "verify",
      msg: "法律来源白名单校验完成",
      latency_ms: Math.round(performance.now() - requestStart),
      host: result.host,
      allowed: result.allowed,
      tier: result.tier,
      matched_rule: result.matched_rule,
    });
    return new Response(JSON.stringify({ trace_id: traceId, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    error({
      module: "law_verify",
      action: "verify",
      msg: "法律来源白名单校验失败",
      latency_ms: Math.round(performance.now() - requestStart),
      ...serializeError(err),
    });
    return new Response(
      JSON.stringify({ error: "校验失败", trace_id: traceId }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

