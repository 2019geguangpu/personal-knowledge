"use client";

import { Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  DevJsonImportFileList,
  type ImportedJsonListItem,
} from "@/components/dev-json-import-file-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const inputClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export function DevJsonImportPanel() {
  const [fileBase, setFileBase] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<ImportedJsonListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingBase, setLoadingBase] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/dev/imported-json");
      const data = (await res.json()) as {
        files?: ImportedJsonListItem[];
        error?: string;
      };
      if (!res.ok) {
        setListError(data.error ?? `列表失败（${res.status}）`);
        setFiles([]);
        return;
      }
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch {
      setListError("网络错误");
      setFiles([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const pickExisting = useCallback(async (base: string) => {
    setError(null);
    setMessage(null);
    setLoadingBase(base);
    try {
      const res = await fetch(
        `/api/dev/imported-json?base=${encodeURIComponent(base)}`,
      );
      const data = (await res.json()) as {
        base?: string;
        content?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `读取失败（${res.status}）`);
        return;
      }
      const b = typeof data.base === "string" ? data.base : base;
      setFileBase(b);
      setJsonText(typeof data.content === "string" ? data.content : "");
      setMessage(`已载入 ${b}.json，可改后保存覆盖。`);
    } catch {
      setError("载入失败");
    } finally {
      setLoadingBase(null);
    }
  }, []);

  const save = useCallback(async () => {
    setMessage(null);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/dev/save-imported-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase, jsonText }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; path?: string };
      if (!res.ok) {
        setError(data.error ?? `请求失败（${res.status}）`);
        return;
      }
      const method =
        typeof (data as { normalizeMethod?: string }).normalizeMethod ===
        "string"
          ? `（解析方式：${(data as { normalizeMethod: string }).normalizeMethod}）`
          : "";
      if (data.path) {
        setMessage(`已写入仓库路径：${data.path} ${method}`.trim());
      } else {
        setMessage(`已保存 ${method}`.trim());
      }
      void loadList();
    } catch {
      setError("网络或解析错误");
    } finally {
      setBusy(false);
    }
  }, [fileBase, jsonText, loadList]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">粘贴内容 → data/imported</CardTitle>
        <CardDescription>
          仅 <code className="rounded bg-muted px-1 py-0.5 text-xs">pnpm dev</code>{" "}
          可用；支持 Markdown 代码块、前后说明文字中的 JSON、多行{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">key: value</code>{" "}
          及纯文本（会包成{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">_raw_text</code>{" "}
          ）。保存后请在本地{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">git add</code>{" "}
          提交。文件名仅字母数字{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">._-</code>。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <DevJsonImportFileList
          files={files}
          listLoading={listLoading}
          listError={listError}
          selectedBase={fileBase}
          loadingBase={loadingBase}
          disabled={busy}
          onRefresh={() => void loadList()}
          onPick={(b) => void pickExisting(b)}
        />
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="pk-dev-json-base">
            文件名（不含 .json）
          </label>
          <input
            id="pk-dev-json-base"
            className={inputClassName}
            value={fileBase}
            onChange={(e) => setFileBase(e.target.value)}
            placeholder="mingwen-pool-example"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="pk-dev-json-body">
            正文（模型输出可直接粘贴）
          </label>
          <Textarea
            id="pk-dev-json-body"
            className="min-h-[220px] font-mono text-xs"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="支持 ```json 围栏、前后废话里的 {...}、多行 等级: 3 等"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={busy} onClick={() => void save()}>
            {busy ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="mr-2 size-4" aria-hidden />
            )}
            保存到 data/imported
          </Button>
          <Link
            href="/"
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            返回首页
          </Link>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
