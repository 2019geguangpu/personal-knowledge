import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertValidDocxDocumentId,
  fetchDocxRawContent,
  getFeishuTenantAccessToken,
  normalizeFeishuDocumentId,
} from "@/lib/feishu-client";
import { getFeishuAppId, getFeishuAppSecret } from "@/lib/env";
import { ingestPlainText } from "@/lib/ingest-kb";
import { DEFAULT_WORK_SCOPE } from "@/lib/kb-scope";
import { getLogger, serializeError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  documentIds: z.array(z.string()).min(1).max(50),
});

type FeishuImportItemResult = {
  input: string;
  documentId?: string;
  source?: string;
  chunkCount?: number;
  ok: boolean;
  error?: string;
};

export async function POST(req: Request) {
  let appId: string;
  let appSecret: string;
  try {
    appId = getFeishuAppId();
    appSecret = getFeishuAppSecret();
  } catch (e) {
    const message = e instanceof Error ? e.message : "飞书环境变量未配置";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  let documentIds: string[];
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求体无效：需要 documentIds 数组（1～50 项）" },
        { status: 400 },
      );
    }
    documentIds = parsed.data.documentIds;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const normalizedLines = documentIds
    .flatMap((line) => line.split(/\r?\n/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (normalizedLines.length === 0) {
    return NextResponse.json(
      { error: "请至少提供一个 document_id 或文档链接" },
      { status: 400 },
    );
  }

  if (normalizedLines.length > 50) {
    return NextResponse.json(
      { error: "单次最多处理 50 个文档" },
      { status: 400 },
    );
  }

  let tenantToken: string;
  try {
    tenantToken = await getFeishuTenantAccessToken(appId, appSecret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "飞书鉴权失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const results: FeishuImportItemResult[] = [];

  const log = getLogger().child({ module: "api/feishu/import" });

  for (const line of normalizedLines) {
    let documentId: string | undefined;
    try {
      documentId = normalizeFeishuDocumentId(line);
      assertValidDocxDocumentId(documentId);

      const text = await fetchDocxRawContent(documentId, tenantToken);
      const source = `feishu:${documentId}`;
      const feishuScope = {
        ...DEFAULT_WORK_SCOPE,
        sub_domain_label: "飞书文档",
      };
      const { chunkCount } = await ingestPlainText(text, source, feishuScope);

      results.push({
        input: line,
        documentId,
        source,
        chunkCount,
        ok: true,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const ref = documentId ?? line;
      log.error({
        action: "import_item",
        msg: `✗ ${ref}: ${message}`,
        document_id: documentId,
        input: line,
        ...serializeError(e),
      });
      results.push({
        input: line,
        documentId,
        ok: false,
        error: message,
      });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: okCount === results.length,
    summary: { total: results.length, succeeded: okCount, failed: results.length - okCount },
    results,
  });
}
