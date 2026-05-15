import {
  getLawSourceAllowlist,
  getLawSourceAllowlistOfficial,
  getLawSourceAllowlistTrusted,
} from "@/lib/env";

export type LawSourceTrustTier = "A_official" | "B_trusted" | "C_other";

export type LawSourceVerifyResult = {
  input: string;
  host: string | null;
  allowed: boolean;
  tier: LawSourceTrustTier;
  matched_rule: string | null;
  reason: string;
  allowlist_official: string[];
  allowlist_trusted: string[];
  /** 兼容旧配置（单一 allowlist） */
  allowlist_legacy: string[];
};

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

function matchRule(host: string, rule: string): boolean {
  const r = rule.trim().toLowerCase();
  if (!r) return false;
  const h = normalizeHost(host);

  if (r.startsWith("*.")) {
    const suffix = r.slice(2);
    if (!suffix) return false;
    return h === suffix || h.endsWith(`.${suffix}`);
  }
  if (r.startsWith(".")) {
    const suffix = r.slice(1);
    if (!suffix) return false;
    return h === suffix || h.endsWith(`.${suffix}`);
  }
  return h === r;
}

export function verifyLawSource(input: string): LawSourceVerifyResult {
  const allowlistOfficial = getLawSourceAllowlistOfficial();
  const allowlistTrusted = getLawSourceAllowlistTrusted();
  const allowlistLegacy = getLawSourceAllowlist();
  const hasTiered =
    allowlistOfficial.length > 0 || allowlistTrusted.length > 0;

  const trimmed = input.trim();
  if (!trimmed) {
    return {
      input,
      host: null,
      allowed: false,
      tier: "C_other",
      matched_rule: null,
      reason: "来源为空",
      allowlist_official: allowlistOfficial,
      allowlist_trusted: allowlistTrusted,
      allowlist_legacy: allowlistLegacy,
    };
  }

  let host: string | null = null;
  try {
    const u = new URL(trimmed);
    host = normalizeHost(u.host);
  } catch {
    host = null;
  }

  if (!host) {
    return {
      input,
      host: null,
      allowed: false,
      tier: "C_other",
      matched_rule: null,
      reason: "来源不是合法 URL（无法提取 host），因此无法进行白名单校验",
      allowlist_official: allowlistOfficial,
      allowlist_trusted: allowlistTrusted,
      allowlist_legacy: allowlistLegacy,
    };
  }

  if (hasTiered) {
    const matchedOfficial =
      allowlistOfficial.find((r) => matchRule(host!, r)) ?? null;
    if (matchedOfficial) {
      return {
        input,
        host,
        allowed: true,
        tier: "A_official",
        matched_rule: matchedOfficial,
        reason: "命中 A 级（官方源）白名单规则",
        allowlist_official: allowlistOfficial,
        allowlist_trusted: allowlistTrusted,
        allowlist_legacy: allowlistLegacy,
      };
    }
    const matchedTrusted =
      allowlistTrusted.find((r) => matchRule(host!, r)) ?? null;
    if (matchedTrusted) {
      return {
        input,
        host,
        allowed: true,
        tier: "B_trusted",
        matched_rule: matchedTrusted,
        reason: "命中 B 级（权威源）白名单规则",
        allowlist_official: allowlistOfficial,
        allowlist_trusted: allowlistTrusted,
        allowlist_legacy: allowlistLegacy,
      };
    }
    return {
      input,
      host,
      allowed: false,
      tier: "C_other",
      matched_rule: null,
      reason: "host 未命中 A/B 白名单",
      allowlist_official: allowlistOfficial,
      allowlist_trusted: allowlistTrusted,
      allowlist_legacy: allowlistLegacy,
    };
  }

  const matchedLegacy = allowlistLegacy.find((r) => matchRule(host!, r)) ?? null;
  if (matchedLegacy) {
    return {
      input,
      host,
      allowed: true,
      tier: "A_official",
      matched_rule: matchedLegacy,
      reason: "命中旧版白名单规则（按 A 级处理）",
      allowlist_official: allowlistOfficial,
      allowlist_trusted: allowlistTrusted,
      allowlist_legacy: allowlistLegacy,
    };
  }
  return {
    input,
    host,
    allowed: false,
    tier: "C_other",
    matched_rule: null,
    reason: "host 未命中白名单",
    allowlist_official: allowlistOfficial,
    allowlist_trusted: allowlistTrusted,
    allowlist_legacy: allowlistLegacy,
  };
}

