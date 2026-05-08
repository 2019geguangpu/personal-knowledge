"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FILE_UPLOAD_INPUT_ID = "pk-file-upload-input";

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        chunkCount?: number;
        source?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "上传失败");
      }
      setMessage(
        `已导入「${data.source}」，共 ${data.chunkCount} 个文本块。`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void uploadFile(file);
    },
    [uploadFile],
  );

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void uploadFile(file);
      e.target.value = "";
    },
    [uploadFile],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>导入知识</CardTitle>
        <CardDescription>
          上传 .txt / .md 等纯文本文件；服务端分块、嵌入并写入本地 LanceDB（
          <code className="rounded bg-muted px-1 py-0.5 text-xs">data/</code>
          ）。默认写入工作域（domain=work）；游戏数据请用 API 表单字段{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">domain=game</code>{" "}
          与合法 slug 的{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">sub_domain</code>。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label
          htmlFor={FILE_UPLOAD_INPUT_ID}
          onDragEnter={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={cn(
            "flex min-h-44 cursor-pointer touch-manipulation flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors [-webkit-tap-highlight-color:transparent]",
            drag
              ? "border-primary bg-primary/5"
              : "border-border active:border-primary/60 active:bg-muted/50 hover:border-primary/50 hover:bg-muted/40",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <input
            ref={inputRef}
            id={FILE_UPLOAD_INPUT_ID}
            type="file"
            accept=".txt,.md,.markdown,text/plain,text/markdown"
            className="sr-only"
            onChange={onFile}
            disabled={busy}
          />
          <FileUp className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">导入文本</p>
            <p className="text-xs text-muted-foreground">
              点击整片区域选择 .txt / .md；电脑可拖拽文件到此处。
            </p>
          </div>
          <span className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {busy ? "处理中…" : "选择文件"}
          </span>
          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在分块与生成向量…
            </p>
          )}
        </label>

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
      </CardContent>
    </Card>
  );
}
