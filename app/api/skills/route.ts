import { forwardSkillRunnerGet } from "@/lib/skill-runner-forward";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 转发 `GET /skills` → NestJS skill-runner */
export async function GET() {
  return forwardSkillRunnerGet("/skills");
}
