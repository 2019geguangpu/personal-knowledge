/**
 * 校验写入 data/imported 的 JSON 文件名（不含路径、不含 .json 后缀由调用方拼接）。
 */

import path from "node:path";

const MAX_BASE_LEN = 120;

/** 仓库内 `data/imported` 的绝对路径（仅服务端使用）。 */
export function importedJsonDirAbsolute(): string {
  return path.join(process.cwd(), "data", "imported");
}

export type SanitizeBasenameResult =
  | { ok: true; base: string }
  | { ok: false; error: string };

/** 仅允许安全字符，避免路径穿越与跨平台非法名。 */
export function sanitizeImportedJsonBasename(raw: string): SanitizeBasenameResult {
  const trimmed = raw.trim().replace(/\.json$/i, "");
  if (!trimmed) {
    return { ok: false, error: "文件名不能为空" };
  }
  if (trimmed.length > MAX_BASE_LEN) {
    return { ok: false, error: `文件名过长（>${MAX_BASE_LEN}）` };
  }
  if (/[\\/:*?"<>|\x00-\x1f]/.test(trimmed) || trimmed.includes("..")) {
    return { ok: false, error: "文件名包含非法字符" };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return {
      ok: false,
      error: "文件名仅允许字母、数字、点、下划线与连字符（便于跨平台与 Git）",
    };
  }
  if (trimmed === "." || trimmed === "..") {
    return { ok: false, error: "无效文件名" };
  }
  return { ok: true, base: trimmed };
}
