"use client";

import type { KbDomain } from "@/lib/kb-scope";
import { GAME_SUBDOMAIN_PRESETS } from "@/lib/kb-scope";
import { cn } from "@/lib/utils";

type RagScopeBarProps = {
  domain: KbDomain;
  onDomainChange: (d: KbDomain) => void;
  /** 当前选中的游戏 preset（sub_domain slug） */
  gamePresetSlug: string;
  onGamePresetSlugChange: (slug: string) => void;
  disabled?: boolean;
};

export function RagScopeBar({
  domain,
  onDomainChange,
  gamePresetSlug,
  onGamePresetSlugChange,
  disabled,
}: RagScopeBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">检索领域</span>
        <select
          disabled={disabled}
          value={domain}
          onChange={(e) => onDomainChange(e.target.value as KbDomain)}
          className={cn(
            "rounded-md border border-input bg-background px-2 py-1.5 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <option value="work">工作</option>
          <option value="game">游戏</option>
        </select>
        {domain === "game" && (
          <>
            <span className="text-muted-foreground">游戏</span>
            <select
              disabled={disabled}
              value={gamePresetSlug}
              onChange={(e) => onGamePresetSlugChange(e.target.value)}
              className={cn(
                "min-w-[10rem] rounded-md border border-input bg-background px-2 py-1.5 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {GAME_SUBDOMAIN_PRESETS.map((p) => (
                <option key={p.sub_domain} value={p.sub_domain}>
                  {p.sub_domain_label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );
}
