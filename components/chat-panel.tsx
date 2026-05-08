"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatMessageList } from "@/components/chat-message-list";
import { RagScopeBar } from "@/components/rag-scope-bar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { KbDomain } from "@/lib/kb-scope";
import { gameScopeFromPresetSlug, PRESET_GAME_SCOPE } from "@/lib/kb-scope";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [ragDomain, setRagDomain] = useState<KbDomain>("work");
  const [gamePresetSlug, setGamePresetSlug] = useState(
    PRESET_GAME_SCOPE.sub_domain,
  );
  const shouldAutoScrollRef = useRef(true);

  const ragPayloadRef = useRef({
    domain: "work" as KbDomain,
    sub_domain: "general",
    sub_domain_label: "",
  });

  useEffect(() => {
    if (ragDomain === "work") {
      ragPayloadRef.current = {
        domain: "work",
        sub_domain: "general",
        sub_domain_label: "",
      };
    } else {
      const g = gameScopeFromPresetSlug(gamePresetSlug);
      ragPayloadRef.current = {
        domain: "game",
        sub_domain: g.sub_domain,
        sub_domain_label: g.sub_domain_label,
      };
    }
  }, [ragDomain, gamePresetSlug]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ rag: ragPayloadRef.current }),
      }),
    [],
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    transport,
  });

  const busy = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    // streaming 时增量很频繁，用 auto 避免 smooth 抖动/“追赶感”
    endRef.current?.scrollIntoView({ behavior: busy ? "auto" : "smooth" });
  }, [messages, busy]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const thresholdPx = 48;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceToBottom <= thresholdPx;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <Card className="flex min-h-[20rem] h-[min(36rem,calc(100dvh-12rem))] flex-col overflow-hidden lg:h-[min(52rem,calc(100dvh-5.5rem))]">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle>对话</CardTitle>
        <CardDescription>
          基于 LanceDB 向量检索 + SiliconFlow LLM，流式输出回答。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden pt-6">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto pr-1"
          onScroll={handleScroll}
        >
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
          <RagScopeBar
            domain={ragDomain}
            onDomainChange={setRagDomain}
            gamePresetSlug={gamePresetSlug}
            onGamePresetSlugChange={setGamePresetSlug}
            disabled={busy}
          />
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
