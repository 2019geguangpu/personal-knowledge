"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SkillZipInstallCard(props: { onInstalled: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    setMsg("");
    if (!file) {
      setMsg("请选择 zip 文件");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      if (id.trim()) fd.set("id", id.trim());
      const r = await fetch("/api/skills/install-zip", { method: "POST", body: fd });
      const data = (await r.json()) as { ok?: boolean; id?: string; error?: string };
      if (!r.ok || data.ok === false) {
        setMsg(data.error || `安装失败（HTTP ${r.status}）`);
        return;
      }
      setMsg(`已安装：${data.id ?? "（见响应）"}`);
      setFile(null);
      props.onInstalled();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "请求失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>安装 Skill（ZIP）</CardTitle>
        <CardDescription>
          转发到 NestJS skill-runner 的 <code className="rounded bg-muted px-1">POST /install-zip</code>
          ；可选填写安装目录名 <code className="rounded bg-muted px-1">id</code>（否则使用 manifest 建议 id）。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">ZIP 文件</span>
          <input
            type="file"
            accept=".zip,application/zip"
            disabled={busy}
            className="block w-full min-w-0 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <p className="truncate text-xs text-muted-foreground" title={file.name}>
              已选：{file.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">安装目录 id（可选）</span>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={busy}
            className="h-9 w-full min-w-0 rounded-md border border-border bg-card px-3 text-sm"
            placeholder="例如 technical-seo-audit"
          />
        </div>

        <Button type="button" variant="outline" className="w-full shrink-0" onClick={submit} disabled={busy || !file}>
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              安装中
            </>
          ) : (
            <>
              <Upload />
              上传安装
            </>
          )}
        </Button>
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      </CardContent>
    </Card>
  );
}
