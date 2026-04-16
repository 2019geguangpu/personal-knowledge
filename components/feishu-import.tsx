"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ImportResultRow = {
  input: string;
  documentId?: string;
  source?: string;
  chunkCount?: number;
  ok: boolean;
  error?: string;
};

type ImportResponse = {
  ok?: boolean;
  error?: string;
  summary?: { total: number; succeeded: number; failed: number };
  results?: ImportResultRow[];
};

export function FeishuImport() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<ImportResponse["summary"] | null>(
    null,
  );
  const [lastResults, setLastResults] = useState<ImportResultRow[] | null>(null);

  const runImport = useCallback(async () => {
    const lines = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (lines.length === 0) {
      setError("请至少输入一行 document_id 或文档链接");
      setMessage(null);
      setLastSummary(null);
      setLastResults(null);
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    setLastSummary(null);
    setLastResults(null);

    try {
      const res = await fetch("/api/feishu/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: lines }),
      });
      const data = (await res.json()) as ImportResponse;

      if (!res.ok) {
        throw new Error(data.error ?? `请求失败 (${res.status})`);
      }

      if (data.summary) {
        setLastSummary(data.summary);
        setLastResults(data.results ?? []);
        setMessage(
          data.summary.failed === 0
            ? `已全部导入：${data.summary.succeeded} 篇。`
            : `部分成功：成功 ${data.summary.succeeded}，失败 ${data.summary.failed}。`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败");
    } finally {
      setBusy(false);
    }
  }, [text]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>飞书云文档</CardTitle>
        <CardDescription>
          每行一个{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">document_id</code>
          ，或粘贴含{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/docx/</code>{" "}
          的文档链接。需在文档侧为应用开通可读权限（「添加文档应用」）。环境变量：{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            FEISHU_APP_ID
          </code>{" "}
          /{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            FEISHU_APP_SECRET
          </code>
          。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={
            "doxbcmEtbFrbbq10nPNu8gabcef\nhttps://xxx.feishu.cn/docx/..."
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          rows={6}
          className="min-h-[140px] font-mono text-sm"
        />
        <Button type="button" disabled={busy} onClick={() => void runImport()}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              拉取并入库…
            </>
          ) : (
            "批量导入"
          )}
        </Button>

        {message && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">
            {error}
          </p>
        )}

        {lastSummary && lastResults && lastResults.length > 0 && (
          <ul className="max-h-48 space-y-1 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">
            {lastResults.map((r, i) => (
              <li key={`${r.input}-${i}`}>
                {r.ok ? (
                  <span className="text-emerald-700 dark:text-emerald-300">
                    ✓ {r.documentId ?? r.input} → {r.chunkCount} 块
                  </span>
                ) : (
                  <span className="text-red-700 dark:text-red-300">
                    ✗ {r.input}: {r.error}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
