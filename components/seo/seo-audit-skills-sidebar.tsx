"use client";

import { Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SkillZipInstallCard } from "@/components/seo/skill-zip-install-card";
import { manifestDisplayName, type InstalledSkillRow } from "@/components/seo/use-installed-skills";
import { cn } from "@/lib/utils";

export type SeoAuditSkillsSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  skills: InstalledSkillRow[];
  listBusy: boolean;
  listError: string;
  onReload: () => void;
  onInstalled: () => void;
  onUninstall: (skillId: string) => void | Promise<void>;
};

export function SeoAuditSkillsSidebar(props: SeoAuditSkillsSidebarProps) {
  const {
    collapsed,
    onToggleCollapsed,
    skills,
    listBusy,
    listError,
    onReload,
    onInstalled,
    onUninstall,
  } = props;

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col gap-3 border-border lg:min-h-0 lg:self-stretch",
        collapsed ? "w-full lg:w-14 lg:border-r lg:pr-2" : "w-full lg:w-72 lg:min-w-64 lg:border-r lg:pr-4",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          collapsed ? "justify-center lg:flex-col lg:py-1" : "justify-between",
        )}
      >
        {!collapsed ? (
          <h2 className="text-sm font-semibold tracking-tight">Skill 目录</h2>
        ) : (
          <span className="sr-only">Skill 目录已收起</span>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "展开 Skill 目录" : "收起 Skill 目录"}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>

      {!collapsed ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="shrink-0 space-y-1 pb-2">
              <CardTitle className="text-base">已安装</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                来自 skill-runner <code className="rounded bg-muted px-1">GET /skills</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-2 pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void onReload()} disabled={listBusy}>
                  {listBusy ? (
                    <>
                      <Loader2 className="animate-spin" />
                      刷新
                    </>
                  ) : (
                    "刷新列表"
                  )}
                </Button>
                {listError ? (
                  <span className="text-xs text-red-600 dark:text-red-400">{listError}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">共 {skills.length} 个</span>
                )}
              </div>

              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无已安装 skill，请先上传 zip。</p>
              ) : (
                <ul className="max-h-[min(40vh,22rem)] flex-1 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-sm">
                  {skills.map((s) => {
                    const label = manifestDisplayName(s.manifest) ?? s.id;
                    return (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                      >
                        <span className="min-w-0 break-words">
                          <span className="font-medium">{label}</span>
                          <span className="text-muted-foreground"> · {s.id}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={() => void onUninstall(s.id)}
                        >
                          卸载
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <SkillZipInstallCard onInstalled={onInstalled} />
        </div>
      ) : null}
    </aside>
  );
}
