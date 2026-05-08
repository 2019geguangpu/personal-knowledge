import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isDevImportedJsonSaveEnabled } from "@/lib/dev-imported-json-guard";
import {
  importedJsonDirAbsolute,
  sanitizeImportedJsonBasename,
} from "@/lib/imported-json-filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG = "[dev/imported-json]";

type ImportedJsonListItem = {
  base: string;
  bytes?: number;
  mtimeMs?: number;
};

/**
 * GET /api/dev/imported-json — 列出 data/imported 下 .json（dev only）
 * GET /api/dev/imported-json?base=xxx — 读取对应文件正文（dev only）
 */
export async function GET(req: Request) {
  if (!isDevImportedJsonSaveEnabled()) {
    console.warn(`${LOG} blocked NODE_ENV=${process.env.NODE_ENV}`);
    return NextResponse.json(
      { error: "该接口仅在 NODE_ENV=development（pnpm dev）时可用。" },
      { status: 403 },
    );
  }

  const baseParam = new URL(req.url).searchParams.get("base");
  const dir = importedJsonDirAbsolute();

  if (baseParam != null && baseParam !== "") {
    const name = sanitizeImportedJsonBasename(baseParam);
    if (!name.ok) {
      return NextResponse.json({ error: name.error }, { status: 400 });
    }
    const filePath = path.join(dir, `${name.base}.json`);
    try {
      const content = await readFile(filePath, "utf8");
      return NextResponse.json({ base: name.base, content });
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return NextResponse.json({ error: "文件不存在" }, { status: 404 });
      }
      console.error(`${LOG} read failed`, e);
      return NextResponse.json({ error: "读取文件失败" }, { status: 500 });
    }
  }

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ files: [] as ImportedJsonListItem[] });
    }
    console.error(`${LOG} readdir failed`, e);
    return NextResponse.json({ error: "无法列出目录" }, { status: 500 });
  }

  const files: ImportedJsonListItem[] = [];
  for (const d of entries) {
    if (!d.isFile() || !d.name.endsWith(".json")) continue;
    const rawBase = d.name.slice(0, -5);
    const s = sanitizeImportedJsonBasename(rawBase);
    if (!s.ok) continue;
    const full = path.join(dir, d.name);
    try {
      const st = await stat(full);
      files.push({ base: s.base, bytes: st.size, mtimeMs: st.mtimeMs });
    } catch {
      files.push({ base: s.base });
    }
  }
  files.sort((a, b) => a.base.localeCompare(b.base));
  return NextResponse.json({ files });
}
