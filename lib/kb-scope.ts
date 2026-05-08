import { z } from "zod";

/** 顶层知识领域 */
export type KbDomain = "work" | "game";

/** 与 LanceDB 行一致的作用域（细分游戏等） */
export type KbScope = {
  domain: KbDomain;
  /** 稳定 slug；工作类默认 general */
  sub_domain: string;
  /** 展示名；可为空 */
  sub_domain_label: string;
};

export const DEFAULT_WORK_SCOPE: KbScope = {
  domain: "work",
  sub_domain: "general",
  sub_domain_label: "",
};

/** 游戏细分：界面只展示 label，检索/入库用 sub_domain slug */
export const GAME_SUBDOMAIN_PRESETS: readonly {
  sub_domain: string;
  sub_domain_label: string;
}[] = [
  { sub_domain: "honor-of-kings-world", sub_domain_label: "王者荣耀世界" },
];

export const PRESET_GAME_SCOPE: KbScope = {
  domain: "game",
  sub_domain: GAME_SUBDOMAIN_PRESETS[0]!.sub_domain,
  sub_domain_label: GAME_SUBDOMAIN_PRESETS[0]!.sub_domain_label,
};

export function gameScopeFromPresetSlug(slug: string): KbScope {
  const hit = GAME_SUBDOMAIN_PRESETS.find((p) => p.sub_domain === slug);
  if (hit) {
    return {
      domain: "game",
      sub_domain: hit.sub_domain,
      sub_domain_label: hit.sub_domain_label,
    };
  }
  return PRESET_GAME_SCOPE;
}

const subDomainSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "sub_domain 须为小写 slug，如 honor-of-kings-world");

const domainSchema = z.enum(["work", "game"]);

const ragBodySchema = z
  .object({
    domain: domainSchema.optional(),
    sub_domain: z.string().trim().optional(),
    sub_domain_label: z.string().max(120).optional(),
  })
  .optional();

/** 供 API 解析客户端传入的 rag 块 */
export function parseRagFromBody(raw: unknown): KbScope {
  const parsed = ragBodySchema.safeParse(raw);
  if (!parsed.success || parsed.data == null) {
    return DEFAULT_WORK_SCOPE;
  }
  const { domain, sub_domain, sub_domain_label } = parsed.data;
  const d = domain ?? "work";
  if (d === "work") {
    return {
      domain: "work",
      sub_domain: "general",
      sub_domain_label: sub_domain_label?.trim() ?? "",
    };
  }
  const slugParsed = subDomainSlugSchema.safeParse(sub_domain ?? "");
  const sub_domain_norm = slugParsed.success
    ? slugParsed.data
    : PRESET_GAME_SCOPE.sub_domain;
  return {
    domain: "game",
    sub_domain: sub_domain_norm,
    sub_domain_label:
      (sub_domain_label?.trim() || PRESET_GAME_SCOPE.sub_domain_label).slice(
        0,
        120,
      ),
  };
}

/** 入库前校验表单 / JSON 字段 */
export function parseIngestKbScope(form: {
  domain?: string | null;
  sub_domain?: string | null;
  sub_domain_label?: string | null;
}): KbScope {
  const domain = domainSchema.safeParse(form.domain?.trim() || "work");
  const d = domain.success ? domain.data : "work";
  if (d === "work") {
    return {
      domain: "work",
      sub_domain: "general",
      sub_domain_label: (form.sub_domain_label?.trim() ?? "").slice(0, 120),
    };
  }
  const slug = subDomainSlugSchema.safeParse(form.sub_domain?.trim() ?? "");
  if (!slug.success) {
    throw new Error(
      `游戏入库须提供合法 sub_domain（小写 slug）：${slug.error.flatten().formErrors.join("；")}`,
    );
  }
  return {
    domain: "game",
    sub_domain: slug.data,
    sub_domain_label: (
      form.sub_domain_label?.trim() || PRESET_GAME_SCOPE.sub_domain_label
    ).slice(0, 120),
  };
}

/** Lance `where` 子句中的字符串转义 */
export function sqlStringLiteral(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

/**
 * 向量检索过滤：工作区包含历史无 domain 列的数据（视为工作向）
 */
export function buildVectorWhereClause(scope: KbScope): string {
  if (scope.domain === "work") {
    return `(domain IS NULL OR domain = ${sqlStringLiteral("work")})`;
  }
  return `domain = ${sqlStringLiteral("game")} AND sub_domain = ${sqlStringLiteral(scope.sub_domain)}`;
}
