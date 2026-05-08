import { NextResponse } from "next/server";
import { ingestPlainText } from "@/lib/ingest-kb";
import { parseIngestKbScope } from "@/lib/kb-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传文件字段 file" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `文件过大（上限 ${MAX_BYTES / 1024 / 1024}MB）` },
        { status: 400 },
      );
    }

    const raw = await file.text();
    if (!raw.trim()) {
      return NextResponse.json({ error: "文件内容为空或无法分块" }, { status: 400 });
    }

    const source = file.name || "upload.txt";
    let scope;
    try {
      scope = parseIngestKbScope({
        domain: formData.get("domain")?.toString(),
        sub_domain: formData.get("sub_domain")?.toString(),
        sub_domain_label: formData.get("sub_domain_label")?.toString(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "领域参数无效";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { chunkCount } = await ingestPlainText(raw, source, scope);

    return NextResponse.json({
      ok: true,
      source,
      chunkCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "导入失败";
    const clientError =
      message.includes("内容为空") || message.includes("无法分块");
    return NextResponse.json(
      { error: message },
      { status: clientError ? 400 : 500 },
    );
  }
}
