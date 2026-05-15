"use client";

export type VerifyResult = {
  input: string;
  host: string | null;
  allowed: boolean;
  tier: "A_official" | "B_trusted" | "C_other";
  matched_rule: string | null;
  reason: string;
  allowlist_official: string[];
  allowlist_trusted: string[];
  allowlist_legacy: string[];
};

export function VerifyDetails({ verify }: { verify: VerifyResult }) {
  return (
    <details className="rounded-md border border-border bg-background px-3 py-2">
      <summary className="cursor-pointer select-none text-sm font-medium">
        来源校验（分级）
        {verify.allowed
          ? verify.tier === "A_official"
            ? "：A 官方"
            : verify.tier === "B_trusted"
              ? "：B 权威"
              : "：通过"
          : "：未通过"}
      </summary>
      <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
        <div>
          <span className="text-foreground">host：</span>
          {verify.host ?? "—"}
        </div>
        <div>
          <span className="text-foreground">规则：</span>
          {verify.matched_rule ?? "—"}
        </div>
        <div>
          <span className="text-foreground">原因：</span>
          {verify.reason}
        </div>
        <div>
          <span className="text-foreground">等级：</span>
          {verify.tier}
        </div>
        <div className="pt-1">
          <span className="text-foreground">A 官方：</span>
          {verify.allowlist_official.length > 0
            ? verify.allowlist_official.join(", ")
            : "（未配置 LAW_SOURCE_ALLOWLIST_OFFICIAL）"}
        </div>
        <div>
          <span className="text-foreground">B 权威：</span>
          {verify.allowlist_trusted.length > 0
            ? verify.allowlist_trusted.join(", ")
            : "（未配置 LAW_SOURCE_ALLOWLIST_TRUSTED）"}
        </div>
        <div>
          <span className="text-foreground">旧版：</span>
          {verify.allowlist_legacy.length > 0
            ? verify.allowlist_legacy.join(", ")
            : "（未配置 LAW_SOURCE_ALLOWLIST）"}
        </div>
      </div>
    </details>
  );
}

