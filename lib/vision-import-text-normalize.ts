/**
 * 将视觉模型/粘贴的松散文本归一化为可 JSON 序列化的值（用于 dev 导入等）。
 */

export type NormalizeImportMethod =
  | "json"
  | "extracted-json"
  | "key-value-lines"
  | "value-only"
  | "raw-text";

export type NormalizeImportTextResult =
  | { ok: true; data: unknown; method: NormalizeImportMethod }
  | { ok: false; error: string };

function stripBom(s: string): string {
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

/** 去掉外层 Markdown 代码围栏（``` / ```json）。 */
export function stripMarkdownCodeFences(s: string): string {
  let t = s.trim();
  if (!t.startsWith("```")) return t;
  const firstNl = t.indexOf("\n");
  if (firstNl === -1) {
    return t.replace(/^```\w*\s*/, "").replace(/```\s*$/, "").trim();
  }
  t = t.slice(firstNl + 1);
  const fence = t.lastIndexOf("```");
  if (fence !== -1) t = t.slice(0, fence);
  return t.trim();
}

/**
 * 从文本中截取第一段平衡的 JSON 对象或数组（忽略前后说明文字）。
 */
export function extractFirstBalancedJsonSlice(input: string): string | null {
  const startObj = input.indexOf("{");
  const startArr = input.indexOf("[");
  let start = -1;
  let open: "{" | "[";
  let close: "}" | "]";
  if (startObj === -1 && startArr === -1) return null;
  if (startObj === -1) {
    start = startArr;
    open = "[";
    close = "]";
  } else if (startArr === -1) {
    start = startObj;
    open = "{";
    close = "}";
  } else {
    start = Math.min(startObj, startArr);
    open = start === startObj ? "{" : "[";
    close = open === "{" ? "}" : "]";
  }

  const slice = input.slice(start);
  let depth = 0;
  let inStr = false;
  let escape = false;
  let strQuote: '"' | "'" | null = null;

  for (let i = 0; i < slice.length; i++) {
    const c = slice[i]!;
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (strQuote && c === strQuote) {
        inStr = false;
        strQuote = null;
        continue;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      strQuote = c;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return slice.slice(0, i + 1);
    }
  }
  return null;
}

const KV_LINE =
  /^\s*([^:#\s][^:]*?)\s*[:：]\s*(.*)$/u;

function parseKeyValueBlock(text: string): Record<string, string> | null {
  const lines = text.split(/\r?\n/);
  const out: Record<string, string> = {};
  let matched = 0;
  let skipped = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("#") || t.startsWith("//")) {
      skipped++;
      continue;
    }
    const m = KV_LINE.exec(line);
    if (!m) {
      skipped++;
      continue;
    }
    const key = m[1]!.trim();
    const val = m[2]!.trim();
    if (!key) {
      skipped++;
      continue;
    }
    out[key] = val;
    matched++;
  }

  if (matched === 0) return null;
  if (matched === 1 && skipped > 0) return null;
  return out;
}

/**
 * 将粘贴/模型输出转为 JSON 可序列化结构。
 */
export function normalizeVisionImportText(raw: string): NormalizeImportTextResult {
  const trimmed = stripBom(stripMarkdownCodeFences(raw).trim());
  if (!trimmed) {
    return { ok: false, error: "内容为空" };
  }

  try {
    const data = JSON.parse(trimmed) as unknown;
    return { ok: true, data, method: "json" };
  } catch {
    /* continue */
  }

  const extracted = extractFirstBalancedJsonSlice(trimmed);
  if (extracted) {
    try {
      const data = JSON.parse(extracted) as unknown;
      return { ok: true, data, method: "extracted-json" };
    } catch {
      /* continue */
    }
  }

  const kv = parseKeyValueBlock(trimmed);
  if (kv) {
    return { ok: true, data: kv, method: "key-value-lines" };
  }

  if (!trimmed.includes("\n") && !trimmed.includes("\r")) {
    return {
      ok: true,
      data: { _value: trimmed },
      method: "value-only",
    };
  }

  return {
    ok: true,
    data: { _raw_text: trimmed },
    method: "raw-text",
  };
}

/** 用于 UI：若能归一成「根对象」，返回其键值表以便逐字段复制。 */
export function tryParseRootObjectFromImportText(
  raw: string,
): Record<string, unknown> | null {
  const r = normalizeVisionImportText(raw);
  if (!r.ok || r.data == null || typeof r.data !== "object") return null;
  if (Array.isArray(r.data)) return null;
  return r.data as Record<string, unknown>;
}
