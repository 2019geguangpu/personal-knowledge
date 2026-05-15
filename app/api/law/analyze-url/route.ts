import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { z } from "zod";
import { createRequestLogger, serializeError } from "@/lib/logger";
import { verifyLawSource } from "@/lib/law/source-verify";
import { analyzeLawText } from "@/lib/law/siliconflow-law-analyze";
import { clampText, extractTextFromHtml } from "@/lib/law/html-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const focusSchema = z.enum([
  "legal_applicability",
  "key_points",
  "judgment_result",
  "custom",
]);

const bodySchema = z.object({
  url: z.string().url().max(2048),
  focus: z.array(focusSchema).max(4).default([]),
  custom_angle: z.string().max(500).optional(),
});

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; personal-knowledge-law/1.0; +local-dev)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `抓取失败：${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 300)}` : ""}`,
      );
    }
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: Request) {
  const traceId = req.headers.get("x-trace-id")?.trim() || randomUUID();
  const requestStart = performance.now();
  const { info, error } = createRequestLogger({
    trace_id: traceId,
    module: "api",
  });

  let url: string;
  let focus: z.infer<typeof focusSchema>[];
  let customAngle: string | undefined;
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "参数无效" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    url = parsed.data.url;
    focus = parsed.data.focus;
    customAngle = parsed.data.custom_angle?.trim() || undefined;
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

  const verify = verifyLawSource(url);
  if (!verify.allowed) {
    return new Response(
      JSON.stringify({
        error: "来源未通过核验（仅允许 A/B 级来源分析）",
        trace_id: traceId,
        verify,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const fetchStart = performance.now();
    const html = await fetchHtml(url);
    info({
      module: "law_analyze",
      action: "fetch_html",
      msg: "抓取网页完成",
      latency_ms: Math.round(performance.now() - fetchStart),
    });

    const extractStart = performance.now();
    const extracted = clampText(extractTextFromHtml(html), 12_000);
    info({
      module: "law_analyze",
      action: "extract_text",
      msg: "抽取正文完成",
      latency_ms: Math.round(performance.now() - extractStart),
      extracted_chars: extracted.length,
    });

    const llmStart = performance.now();
    const markdown = await analyzeLawText({
      url,
      extractedText: extracted,
      focus,
      customAngle,
    });
    info({
      module: "law_analyze",
      action: "llm_analyze",
      msg: "LLM 分析完成",
      latency_ms: Math.round(performance.now() - llmStart),
    });

    return new Response(
      JSON.stringify({
        trace_id: traceId,
        url,
        verify,
        focus,
        markdown,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    error({
      module: "law_analyze",
      action: "analyze_url",
      msg: "URL 分析失败",
      latency_ms: Math.round(performance.now() - requestStart),
      ...serializeError(err),
    });
    const message = err instanceof Error ? err.message : "分析失败";
    return new Response(
      JSON.stringify({ error: message, trace_id: traceId, verify }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

