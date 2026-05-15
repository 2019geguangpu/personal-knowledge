import { NextResponse } from "next/server";
import { getSkillRunnerBaseUrl } from "@/lib/env";

function upstreamUrl(path: string): string {
  const base = getSkillRunnerBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function jsonFromText(text: string, status: number): NextResponse {
  let payload: unknown;
  try {
    payload = text.length ? JSON.parse(text) : null;
  } catch {
    payload = {
      ok: false,
      error: "upstream returned non-JSON",
      raw: text.slice(0, 2000),
    };
  }
  return NextResponse.json(payload, { status });
}

export async function forwardSkillRunnerGet(path: string): Promise<NextResponse> {
  const r = await fetch(upstreamUrl(path), { method: "GET", cache: "no-store" });
  const text = await r.text();
  return jsonFromText(text, r.status);
}

export async function forwardSkillRunnerPost(
  path: string,
  body: unknown,
): Promise<NextResponse> {
  const r = await fetch(upstreamUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  const text = await r.text();
  return jsonFromText(text, r.status);
}
