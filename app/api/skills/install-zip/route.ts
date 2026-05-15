import { NextRequest, NextResponse } from "next/server";
import { getSkillRunnerBaseUrl } from "@/lib/env";

export const runtime = "nodejs";

/**
 * 转发 zip 到 NestJS skill-runner：`POST /install-zip`
 *
 * Env: `SKILL_RUNNER_URL`（默认 http://127.0.0.1:4317）
 *
 * Client: multipart/form-data，字段 `file`（zip），可选 `id`（安装目录名）。
 */
export async function POST(req: NextRequest) {
  const base = getSkillRunnerBaseUrl();
  const url = `${base}/install-zip`;

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid multipart body" }, { status: 400 });
  }

  const file = incoming.get("file");
  const id = incoming.get("id");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "field `file` (zip) is required" },
      { status: 400 },
    );
  }

  const out = new FormData();
  out.set("file", file, file.name || "skill.zip");
  if (typeof id === "string" && id.trim().length > 0) {
    out.set("id", id.trim());
  }

  const upstream = await fetch(url, { method: "POST", body: out });
  const text = await upstream.text();

  let payload: unknown;
  try {
    payload = text.length ? JSON.parse(text) : null;
  } catch {
    payload = { ok: false, error: "upstream returned non-JSON", raw: text };
  }

  return NextResponse.json(payload, { status: upstream.status });
}
