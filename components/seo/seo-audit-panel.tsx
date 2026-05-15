"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SeoAuditSkillsSidebar } from "@/components/seo/seo-audit-skills-sidebar";
import { manifestDisplayName, useInstalledSkills } from "@/components/seo/use-installed-skills";

type Step = { id: string; configText: string };

type RunResponse =
  | { ok: true; id: string; stdout: unknown; meta: { elapsedMs: number } }
  | {
      ok: false;
      id: string;
      error: { code: string; message: string; details?: unknown };
      meta: { elapsedMs: number };
    };

function safeParseConfig(
  text: string,
): { ok: true; value: Record<string, unknown> | undefined } | { ok: false; error: string } {
  const raw = text.trim();
  if (!raw) return { ok: true, value: undefined };
  try {
    const v = JSON.parse(raw);
    if (typeof v !== "object" || v == null || Array.isArray(v)) {
      return { ok: false, error: "config 必须是 JSON 对象" };
    }
    return { ok: true, value: v as Record<string, unknown> };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "JSON 解析失败" };
  }
}

export function SeoAuditPanel() {
  const { skills, busy: listBusy, error: listError, reload } = useInstalledSkills();
  const [skillSidebarCollapsed, setSkillSidebarCollapsed] = useState(false);

  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [url, setUrl] = useState("");
  const [timeoutMs, setTimeoutMs] = useState("30000");
  const [newStepSkillId, setNewStepSkillId] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);

  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const [runResp, setRunResp] = useState<RunResponse | null>(null);

  useEffect(() => {
    if (skills.length === 0) {
      setSelectedSkillId("");
      return;
    }
    setSelectedSkillId((cur) => {
      if (cur && skills.some((s) => s.id === cur)) return cur;
      return skills[0]!.id;
    });
  }, [skills]);

  const stepsPreview = useMemo(() => {
    const parsedSteps: { id: string; config?: Record<string, unknown> }[] = [];
    for (const s of steps) {
      const parsed = safeParseConfig(s.configText);
      if (!parsed.ok) return { ok: false as const, error: `Step（${s.id}）config：${parsed.error}` };
      parsedSteps.push({ id: s.id, ...(parsed.value ? { config: parsed.value } : {}) });
    }
    return { ok: true as const, steps: parsedSteps };
  }, [steps]);

  function moveStep(from: number, dir: -1 | 1) {
    const to = from + dir;
    if (to < 0 || to >= steps.length) return;
    setSteps((prev) => {
      const next = prev.slice();
      const tmp = next[from]!;
      next[from] = next[to]!;
      next[to] = tmp;
      return next;
    });
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function addStep() {
    const id = newStepSkillId.trim();
    if (!id) return;
    setSteps((prev) => [...prev, { id, configText: "" }]);
    setNewStepSkillId("");
  }

  async function uninstallSkill(skillId: string) {
    if (!confirm(`确定卸载 skill「${skillId}」？`)) return;
    setLocalError("");
    try {
      const r = await fetch("/api/skills/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: skillId }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || data.ok === false) {
        setLocalError(data.error || `卸载失败（HTTP ${r.status}）`);
        return;
      }
      await reload();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "卸载请求失败");
    }
  }

  async function run() {
    setLocalError("");
    setRunResp(null);
    const u = url.trim();
    if (!u) {
      setLocalError("请填写 URL。");
      return;
    }
    if (!selectedSkillId) {
      setLocalError("请先在 skill-runner 中安装至少一个 skill，或刷新列表。");
      return;
    }
    if (!stepsPreview.ok) {
      setLocalError(stepsPreview.error);
      return;
    }
    const t = Number.parseInt(timeoutMs, 10);
    if (!Number.isFinite(t) || t <= 0) {
      setLocalError("timeoutMs 须为正整数。");
      return;
    }

    const input: Record<string, unknown> = { url: u };
    if (stepsPreview.steps.length > 0) input.steps = stepsPreview.steps;

    setBusy(true);
    try {
      const r = await fetch("/api/skills/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedSkillId, input, timeoutMs: t }),
      });
      const data = (await r.json()) as RunResponse;
      setRunResp(data);
      if (!data.ok && "error" in data) {
        setLocalError(data.error.message);
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "运行请求失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <SeoAuditSkillsSidebar
        collapsed={skillSidebarCollapsed}
        onToggleCollapsed={() => setSkillSidebarCollapsed((v) => !v)}
        skills={skills}
        listBusy={listBusy}
        listError={listError}
        onReload={reload}
        onInstalled={() => void reload()}
        onUninstall={uninstallSkill}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>运行与编排</CardTitle>
            <CardDescription>
              选择左侧已安装 skill；<code className="rounded bg-muted px-1">POST /run</code> 的{" "}
              <code className="rounded bg-muted px-1">input</code> 含 <code className="rounded bg-muted px-1">url</code>
              与可选 <code className="rounded bg-muted px-1">steps</code>。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs text-muted-foreground">Skill</span>
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  disabled={busy || skills.length === 0}
                  className="h-9 rounded-md border border-border bg-card px-3 text-sm"
                >
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {(manifestDisplayName(s.manifest) ?? s.id) + ` (${s.id})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex w-28 flex-col gap-1">
                <span className="text-xs text-muted-foreground">timeoutMs</span>
                <input
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(e.target.value)}
                  disabled={busy}
                  className="h-9 rounded-md border border-border bg-card px-3 text-sm"
                />
              </div>
            </div>

            <Textarea
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL（写入 input.url）"
              rows={2}
              className="resize-none"
              disabled={busy}
            />

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={newStepSkillId}
                onChange={(e) => setNewStepSkillId(e.target.value)}
                disabled={busy}
                className="h-9 w-full max-w-88 rounded-md border border-border bg-card px-3 text-sm"
                placeholder="子 step id（→ input.steps[].id）"
              />
              <Button type="button" variant="outline" onClick={addStep} disabled={busy || !newStepSkillId.trim()}>
                <Plus />
                添加 step
              </Button>
              <div className="ml-auto">
                <Button type="button" onClick={run} disabled={busy || !url.trim() || !selectedSkillId}>
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" />
                      运行中
                    </>
                  ) : (
                    <>
                      <Play />
                      POST /run
                    </>
                  )}
                </Button>
              </div>
            </div>

            {localError ? <p className="text-sm text-red-600 dark:text-red-400">{localError}</p> : null}

            <details className="rounded-md border border-border bg-background px-3 py-2">
              <summary className="cursor-pointer select-none text-sm font-medium">请求体预览</summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed">
                {JSON.stringify(
                  {
                    id: selectedSkillId || "(未选)",
                    timeoutMs: Number.parseInt(timeoutMs, 10) || null,
                    input: {
                      url: url.trim() || undefined,
                      ...(stepsPreview.ok && stepsPreview.steps.length > 0
                        ? { steps: stepsPreview.steps }
                        : {}),
                    },
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline（→ input.steps）</CardTitle>
            <CardDescription>由 skill 入口自行消费；若只认 url 可留空。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {steps.map((s, idx) => (
              <div key={`${s.id}#${idx}`} className="rounded-lg border border-border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">Step #{idx + 1}</div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="icon" variant="outline" onClick={() => moveStep(idx, -1)} disabled={busy || idx === 0}>
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => moveStep(idx, 1)}
                      disabled={busy || idx === steps.length - 1}
                    >
                      <ArrowDown />
                    </Button>
                    <Button type="button" size="icon" variant="outline" onClick={() => removeStep(idx)} disabled={busy}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  <input
                    value={s.id}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSteps((prev) => prev.map((p, i) => (i === idx ? { ...p, id: v } : p)));
                    }}
                    disabled={busy}
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                    placeholder="step id"
                  />
                  <Textarea
                    value={s.configText}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSteps((prev) => prev.map((p, i) => (i === idx ? { ...p, configText: v } : p)));
                    }}
                    placeholder="可选 config JSON 对象"
                    rows={3}
                    className="resize-none font-mono text-xs"
                    disabled={busy}
                  />
                </div>
              </div>
            ))}
            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">未配置 steps，仅发送 input.url。</p>
            ) : null}
          </CardContent>
        </Card>

        {runResp ? (
          <Card>
            <CardHeader>
              <CardTitle>运行结果</CardTitle>
              <CardDescription>
                {runResp.ok ? `ok · ${runResp.meta.elapsedMs}ms` : `失败 · ${runResp.meta.elapsedMs}ms`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed">
                {JSON.stringify(runResp, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
