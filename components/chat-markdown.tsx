"use client";

import { useMemo } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type Variant = "user" | "assistant";

type Props = {
  content: string;
  variant: Variant;
};

export function ChatMarkdown({ content, variant }: Props) {
  const components = useMemo<Components>(
    () => ({
      p: ({ children }) => (
        <p className="mb-3 last:mb-0 wrap-anywhere">{children}</p>
      ),
      ul: ({ children }) => (
        <ul className="my-2 list-disc pl-5 wrap-anywhere">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="my-2 list-decimal pl-5 wrap-anywhere">{children}</ol>
      ),
      li: ({ children }) => <li className="my-0.5">{children}</li>,
      h1: ({ children }) => (
        <h1 className="mb-2 mt-4 text-lg font-semibold first:mt-0">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="mb-1.5 mt-3 text-[15px] font-semibold first:mt-0">{children}</h3>
      ),
      blockquote: ({ children }) => (
        <blockquote
          className={cn(
            "my-2 border-l-2 pl-3 italic",
            variant === "user"
              ? "border-primary-foreground/50 text-primary-foreground/90"
              : "border-border text-muted-foreground",
          )}
        >
          {children}
        </blockquote>
      ),
      hr: () => (
        <hr
          className={cn(
            "my-4 border-t",
            variant === "user" ? "border-primary-foreground/25" : "border-border",
          )}
        />
      ),
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "underline underline-offset-2",
            variant === "user"
              ? "text-primary-foreground decoration-primary-foreground/60"
              : "text-primary decoration-primary/50",
          )}
        >
          {children}
        </a>
      ),
      table: ({ children }) => (
        <div className="my-2 overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-48 border-collapse text-left text-sm">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => (
        <thead
          className={cn(
            "border-b",
            variant === "user"
              ? "border-primary-foreground/25 bg-primary-foreground/10"
              : "border-border bg-muted/60",
          )}
        >
          {children}
        </thead>
      ),
      th: ({ children }) => (
        <th className="px-3 py-2 font-medium">{children}</th>
      ),
      td: ({ children }) => (
        <td
          className={cn(
            "border-t px-3 py-2 align-top",
            variant === "user"
              ? "border-primary-foreground/15"
              : "border-border",
          )}
        >
          {children}
        </td>
      ),
      tr: ({ children }) => (
        <tr
          className={cn(
            variant === "assistant" && "even:bg-muted/30",
            variant === "user" && "even:bg-primary-foreground/5",
          )}
        >
          {children}
        </tr>
      ),
      pre: ({ children }) => (
        <pre
          className={cn(
            "my-2 overflow-x-auto rounded-lg p-3 font-mono text-[13px] leading-relaxed",
            variant === "user"
              ? "bg-primary-foreground/10 text-primary-foreground"
              : "border border-border bg-muted/50 text-foreground",
          )}
        >
          {children}
        </pre>
      ),
      code: ({ className, children, ...props }) => {
        const isBlock = /language-[\w-]+/.test(className ?? "");
        if (isBlock) {
          return (
            <code className={cn("block w-full", className)} {...props}>
              {children}
            </code>
          );
        }
        return (
          <code
            className={cn(
              "rounded px-1 py-0.5 font-mono text-[0.875em]",
              variant === "user"
                ? "bg-primary-foreground/15 text-primary-foreground"
                : "bg-muted text-foreground",
            )}
            {...props}
          >
            {children}
          </code>
        );
      },
    }),
    [variant],
  );

  return (
    <div
      className={cn(
        "text-[15px] leading-relaxed [word-break:break-word]",
        variant === "user" && "text-primary-foreground",
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
