import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isDevImportedJsonSaveEnabled } from "@/lib/dev-imported-json-guard";
import {
  importedJsonDirAbsolute,
  sanitizeImportedJsonBasename,
} from "@/lib/imported-json-filename";
import { normalizeVisionImportText } from "@/lib/vision-import-text-normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_JSON_CHARS = 4 * 1024 * 1024;
const LOG = "[dev/save-imported-json]";

type Body = {
  fileBase?: unknown;
  jsonText?: unknown;
};

export async function POST(req: Request) {
  if (!isDevImportedJsonSaveEnabled()) {
    console.warn(`${LOG} blocked NODE_ENV=${process.env.NODE_ENV}`);
    return NextResponse.json(
      { error: "该接口仅在 NODE_ENV=development（pnpm dev）时可用。" },
      { status: 403 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "请求体须为 JSON" }, { status: 400 });
  }

  const fileBaseRaw = body.fileBase;
  const jsonTextRaw = body.jsonText;
  if (typeof fileBaseRaw !== "string" || typeof jsonTextRaw !== "string") {
    return NextResponse.json(
      { error: "缺少 fileBase（字符串）或 jsonText（字符串）" },
      { status: 400 },
    );
  }

  if (jsonTextRaw.length > MAX_JSON_CHARS) {
    return NextResponse.json(
      { error: `jsonText 过长（>${MAX_JSON_CHARS} 字符）` },
      { status: 400 },
    );
  }

  const name = sanitizeImportedJsonBasename(fileBaseRaw);
  if (!name.ok) {
    return NextResponse.json({ error: name.error }, { status: 400 });
  }

  const normalized = normalizeVisionImportText(jsonTextRaw);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }
  const parsed = normalized.data;

  const dir = importedJsonDirAbsolute();
  const filePath = path.join(dir, `${name.base}.json`);
  const pretty = `${JSON.stringify(parsed, null, 2)}\n`;

  try {
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, pretty, "utf8");
  } catch (e) {
    console.error(`${LOG} write failed`, e);
    return NextResponse.json({ error: "写入文件失败" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    path: `data/imported/${name.base}.json`,
    bytes: Buffer.byteLength(pretty, "utf8"),
    normalizeMethod: normalized.method,
  });
}
