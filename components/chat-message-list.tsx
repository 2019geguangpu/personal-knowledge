"use client";

import type { UIMessage } from "ai";
import { Bot, User } from "lucide-react";
import { ChatMarkdown } from "@/components/chat-markdown";
import { cn } from "@/lib/utils";

type Props = {
  messages: UIMessage[];
};

function renderMessageText(message: UIMessage, variant: "user" | "assistant") {
  return message.parts.map((part, i) => {
    if (part.type === "text") {
      return (
        <ChatMarkdown
          key={`${message.id}-${i}`}
          content={part.text}
          variant={variant}
        />
      );
    }
    return null;
  });
}

export function ChatMessageList({ messages }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          上传左侧文档后，在此基于知识库提问。支持流式回答。
        </div>
      )}
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn(
            "flex gap-3",
            m.role === "user" ? "justify-end" : "justify-start",
          )}
        >
          {m.role === "assistant" && (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
          )}
          <div
            className={cn(
              "max-w-[min(100%,52rem)] rounded-2xl px-4 py-3 text-foreground shadow-sm",
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card",
            )}
          >
            {renderMessageText(
              m,
              m.role === "user" ? "user" : "assistant",
            )}
          </div>
          {m.role === "user" && (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
