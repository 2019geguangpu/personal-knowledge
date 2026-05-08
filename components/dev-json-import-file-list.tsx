"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ImportedJsonListItem = {
  base: string;
  bytes?: number;
  mtimeMs?: number;
};

function formatBytes(n?: number): string {
  if (n == null || Number.isNaN(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMtime(ms?: number): string {
  if (ms == null) return "";
  try {
    return new Date(ms).toLocaleString(undefined, {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

type Props = {
  files: ImportedJsonListItem[];
  listLoading: boolean;
  listError: string | null;
  selectedBase: string;
  loadingBase: string | null;
  disabled: boolean;
  onRefresh: () => void;
  onPick: (base: string) => void;
};

export function DevJsonImportFileList({
  files,
  listLoading,
  listError,
  selectedBase,
  loadingBase,
  disabled,
  onRefresh,
  onPick,
}: Props) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">已有文件（点击载入）</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 touch-manipulation gap-1 px-2 text-xs"
          disabled={disabled || listLoading}
          onClick={() => onRefresh()}
        >
          {listLoading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          刷新
        </Button>
      </div>
      {listLoading && files.length === 0 ? (
        <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          读取列表…
        </p>
      ) : null}
      {listError ? (
        <p className="mb-2 text-xs text-destructive" role="alert">
          {listError}
        </p>
      ) : null}
      {!listLoading && files.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          暂无 .json；保存新文件后会出现在此。
        </p>
      ) : null}
      {files.length > 0 ? (
        <ul className="max-h-44 space-y-1 overflow-y-auto pr-0.5">
          {files.map((f) => {
            const active = selectedBase === f.base;
            const meta = [formatBytes(f.bytes), formatMtime(f.mtimeMs)]
              .filter(Boolean)
              .join(" · ");
            const loading = loadingBase === f.base;
            return (
              <li key={f.base}>
                <button
                  type="button"
                  disabled={disabled || loading || listLoading}
                  onClick={() => onPick(f.base)}
                  className={cn(
                    "flex w-full touch-manipulation items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors",
                    "border-transparent hover:border-border hover:bg-background/80",
                    active && "border-primary/40 bg-background",
                  )}
                >
                  <span className="min-w-0 truncate font-mono text-xs">
                    {f.base}.json
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {meta ? (
                      <span className="hidden text-[11px] text-muted-foreground sm:inline">
                        {meta}
                      </span>
                    ) : null}
                    {loading ? (
                      <Loader2
                        className="size-4 shrink-0 animate-spin text-muted-foreground"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
