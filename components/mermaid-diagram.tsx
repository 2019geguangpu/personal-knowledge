"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  code: string;
  className?: string;
};

type MermaidModule = {
  default: {
    initialize: (config: Record<string, unknown>) => void;
    render: (
      id: string,
      code: string,
    ) => Promise<{ svg: string; bindFunctions?: (el: Element) => void }>;
  };
};

function getMermaidTheme(): "default" | "dark" {
  if (typeof window === "undefined") return "default";
  const isDark =
    document.documentElement.classList.contains("dark") ||
    window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return isDark ? "dark" : "default";
}

export function MermaidDiagram({ code, className }: Props) {
  const reactId = useId();
  const renderId = useMemo(
    () => `mermaid-${reactId.replaceAll(":", "-")}`,
    [reactId],
  );
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setSvg(null);

      try {
        const mermaid = (await import("mermaid")) as MermaidModule;
        mermaid.default.initialize({
          startOnLoad: false,
          theme: getMermaidTheme(),
          securityLevel: "strict",
        });

        const { svg: nextSvg, bindFunctions } = await mermaid.default.render(
          renderId,
          code,
        );

        if (cancelled) return;
        setSvg(nextSvg);

        // bindFunctions 需要在 SVG 挂载到 DOM 后执行，所以放到下一个微任务。
        queueMicrotask(() => {
          if (cancelled) return;
          const el = document.getElementById(renderId);
          if (el && bindFunctions) bindFunctions(el);
        });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [code, renderId]);

  if (error) {
    return (
      <pre
        className={cn(
          "my-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 font-mono text-[13px] leading-relaxed text-foreground",
          className,
        )}
      >
        <code className="block w-full">
          {code}
          {"\n\n"}
          {"[mermaid render error] "}
          {error}
        </code>
      </pre>
    );
  }

  return (
    <div
      className={cn(
        "my-2 overflow-x-auto rounded-lg border border-border bg-background p-2",
        className,
      )}
      // mermaid 输出的是 SVG 字符串
      dangerouslySetInnerHTML={{
        __html: svg ?? `<div id="${renderId}" />`,
      }}
    />
  );
}

