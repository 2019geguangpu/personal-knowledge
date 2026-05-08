"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { ChatMarkdown } from "@/components/chat-markdown";
import { VisionResultCopyToolbar } from "@/components/vision-result-copy-toolbar";
import { cn } from "@/lib/utils";

export type VisionJobSlot = {
  name: string;
  status: "pending" | "running" | "done" | "error";
  text?: string;
  model?: string;
  savedTo?: string;
  error?: string;
};

function statusIcon(slot: VisionJobSlot) {
  if (slot.status === "pending") {
    return <span className="size-4 shrink-0 rounded-full border border-muted-foreground/40" />;
  }
  if (slot.status === "running") {
    return (
      <Loader2
        className="size-4 shrink-0 animate-spin text-primary"
        aria-hidden
      />
    );
  }
  if (slot.status === "done") {
    return (
      <CheckCircle2
        className="size-4 shrink-0 text-emerald-600"
        aria-hidden
      />
    );
  }
  return <AlertCircle className="size-4 shrink-0 text-destructive" aria-hidden />;
}

type Props = {
  slots: VisionJobSlot[];
};

export function VisionBatchResults({ slots }: Props) {
  if (slots.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">识别结果</p>
      {slots.map((slot, i) => (
        <details
          key={`${i}-${slot.name}`}
          open={slots.length === 1}
          className="group rounded-lg border border-border bg-muted/15"
        >
          <summary
            className={cn(
              "flex cursor-pointer touch-manipulation list-none items-center gap-2 px-3 py-2.5 text-sm font-medium",
              "[&::-webkit-details-marker]:hidden",
            )}
          >
            {statusIcon(slot)}
            <span className="min-w-0 flex-1 truncate">
              {i + 1}. {slot.name || "（未命名）"}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {slot.status === "pending" && "待处理"}
              {slot.status === "running" && "识别中"}
              {slot.status === "done" && "完成"}
              {slot.status === "error" && "失败"}
            </span>
          </summary>
          <div className="border-t border-border px-3 py-3">
            {slot.status === "error" && slot.error ? (
              <p className="text-sm text-destructive">{slot.error}</p>
            ) : null}
            {slot.status === "done" && slot.text != null && slot.text.length > 0 ? (
              <div className="space-y-3">
                {slot.model ? (
                  <p className="text-xs text-muted-foreground">模型：{slot.model}</p>
                ) : null}
                {slot.savedTo ? (
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    已自动落盘：{slot.savedTo}
                  </p>
                ) : null}
                <VisionResultCopyToolbar text={slot.text} />
                <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3 text-sm">
                  <ChatMarkdown content={slot.text} variant="assistant" />
                </div>
              </div>
            ) : null}
            {slot.status === "done" && (!slot.text || slot.text.length === 0) ? (
              <p className="text-xs text-muted-foreground">（模型返回空文本）</p>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
