/**
 * 从一段 JSON 中找出「带 属性 数组」的对象列表，并按 compare_stat_label 在 属性[].类型 上匹配后解析 数值 排序。
 * 供 sort_list_by_stat 工具调用；比较字段由 LLM 传入，不在此写死具体游戏属性名。
 */

const MAX_PAYLOAD_CHARS = 600_000;

export type SortOrder = "asc" | "desc";

export type SortListByStatInput = {
  payload_json: string;
  compare_stat_label: string;
  list_path_hint?: string;
  order: SortOrder;
};

export type SortListByStatSuccess = {
  ok: true;
  list_path_used: string;
  compare_stat_label: string;
  order: SortOrder;
  sorted_count: number;
  unresolved_names: string[];
  warnings: string[];
  sorted_list: unknown[];
};

export type SortListByStatFailure = {
  ok: false;
  error: string;
};

export type SortListByStatResult = SortListByStatSuccess | SortListByStatFailure;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function itemLooksLikeSortableRow(item: unknown): boolean {
  if (!isRecord(item)) return false;
  const attrs = item["属性"];
  if (!Array.isArray(attrs) || attrs.length === 0) return false;
  return attrs.every(
    (a) =>
      isRecord(a) && (Object.hasOwn(a, "类型") || Object.hasOwn(a, "数值")),
  );
}

function arrayLooksLikeSortableList(arr: unknown[]): boolean {
  return arr.length > 0 && itemLooksLikeSortableRow(arr[0]);
}

function pickList(
  root: unknown,
  hint?: string,
): { list: unknown[]; path: string } | { error: string } {
  if (Array.isArray(root)) {
    if (arrayLooksLikeSortableList(root)) return { list: root, path: "[root]" };
    return { error: "根节点为数组，但元素不符合「属性」条目形态" };
  }
  if (!isRecord(root)) {
    return { error: "payload 必须是 JSON 对象或数组" };
  }

  const keysToTry = [
    ...new Set(
      [hint?.trim(), "铭文列表"].filter(
        (k): k is string => typeof k === "string" && k.length > 0,
      ),
    ),
  ];

  for (const k of keysToTry) {
    const v = root[k];
    if (Array.isArray(v) && arrayLooksLikeSortableList(v)) {
      return { list: v, path: k };
    }
  }

  for (const [k, v] of Object.entries(root)) {
    if (keysToTry.includes(k)) continue;
    if (Array.isArray(v) && arrayLooksLikeSortableList(v)) {
      return { list: v, path: k };
    }
  }

  return { error: "未找到含「属性」数组的可排序对象列表" };
}

function statTypeMatches(typeStr: string, compareLabel: string): boolean {
  const t = typeStr.trim();
  const c = compareLabel.trim();
  if (!t || !c) return false;
  return t.includes(c) || c.includes(t);
}

function parseNumericValue(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  const isPercent = s.endsWith("%");
  const n = Number.parseFloat(isPercent ? s.slice(0, -1) : s);
  if (!Number.isFinite(n)) return null;
  return isPercent ? n / 100 : n;
}

function findStatNumericValue(
  item: unknown,
  compareLabel: string,
): number | null {
  if (!isRecord(item)) return null;
  const attrs = item["属性"];
  if (!Array.isArray(attrs)) return null;
  for (const a of attrs) {
    if (!isRecord(a)) continue;
    const typeRaw = a["类型"];
    if (typeof typeRaw !== "string") continue;
    if (!statTypeMatches(typeRaw, compareLabel)) continue;
    const val = parseNumericValue(a["数值"]);
    if (val != null) return val;
  }
  return null;
}

function itemDisplayName(item: unknown): string {
  if (!isRecord(item)) return "(非对象)";
  const name = item["名称"];
  if (typeof name === "string" && name.trim()) return name.trim();
  return "(无名)";
}

export function executeSortListByStat(
  input: SortListByStatInput,
): SortListByStatResult {
  const { payload_json, compare_stat_label, list_path_hint, order } = input;
  const label = compare_stat_label?.trim() ?? "";
  if (!label) {
    return { ok: false, error: "compare_stat_label 不能为空" };
  }
  if (payload_json.length > MAX_PAYLOAD_CHARS) {
    return {
      ok: false,
      error: `payload_json 过长（>${MAX_PAYLOAD_CHARS} 字符）`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload_json) as unknown;
  } catch {
    return { ok: false, error: "payload_json 不是合法 JSON" };
  }

  const picked = pickList(parsed, list_path_hint);
  if ("error" in picked) {
    return { ok: false, error: picked.error };
  }

  const { list, path } = picked;
  const warnings: string[] = [];
  const unresolved_names: string[] = [];

  const keyed = list.map((item, index) => ({
    item,
    index,
    val: findStatNumericValue(item, label),
    name: itemDisplayName(item),
  }));

  const withVal = keyed.filter((k) => k.val != null) as Array<
    (typeof keyed)[number] & { val: number }
  >;
  const withoutVal = keyed.filter((k) => k.val == null);

  for (const k of withoutVal) {
    unresolved_names.push(k.name);
  }
  if (withoutVal.length > 0) {
    warnings.push(
      `有 ${withoutVal.length} 条未匹配到「${label}」的可解析数值，已排在末尾`,
    );
  }

  const mul = order === "asc" ? 1 : -1;
  withVal.sort((a, b) => {
    const d = mul * (a.val - b.val);
    if (d !== 0) return d;
    return a.index - b.index;
  });

  const sorted_list = [...withVal, ...withoutVal].map((k) => k.item);

  return {
    ok: true,
    list_path_used: path,
    compare_stat_label: label,
    order,
    sorted_count: sorted_list.length,
    unresolved_names,
    warnings,
    sorted_list,
  };
}
