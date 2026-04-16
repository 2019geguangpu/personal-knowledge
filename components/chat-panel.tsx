"use client";

import { useChat } from "@ai-sdk/react";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatMessageList } from "@/components/chat-message-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, stop } = useChat();

  const busy = status === "streaming" || status === "submitted";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <Card className="flex h-[min(100vh-2rem,900px)] flex-col overflow-hidden">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle>对话</CardTitle>
        <CardDescription>
          基于 LanceDB 向量检索 + SiliconFlow LLM，流式输出回答。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden pt-6">
        <div className="flex-1 overflow-y-auto pr-1">
          <ChatMessageList messages={messages} />
          <div ref={endRef} />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error.message}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex flex-col gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入问题…（Enter 发送，Shift+Enter 换行）"
            rows={3}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            {busy && (
              <Button type="button" variant="outline" size="sm" onClick={stop}>
                停止
              </Button>
            )}
            <Button type="submit" disabled={busy || !input.trim()}>
              {busy ? (
                <>
                  <Loader2 className="animate-spin" />
                  生成中
                </>
              ) : (
                <>
                  <Send />
                  发送
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
