import { NextRequest, NextResponse } from "next/server";
import { forwardSkillRunnerPost } from "@/lib/skill-runner-forward";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 转发 `POST /uninstall` → NestJS skill-runner */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体须为 JSON" }, { status: 400 });
  }
  return forwardSkillRunnerPost("/uninstall", body);
}
