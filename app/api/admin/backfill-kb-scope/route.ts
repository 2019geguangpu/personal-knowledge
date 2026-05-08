import { NextResponse } from "next/server";
import { getKbBackfillSecret } from "@/lib/env";
import { backfillKbScopeColumnsForLegacyWorkData } from "@/lib/lance-backfill-kb-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 一次性为线上旧 Lance 表补齐 domain / sub_domain / sub_domain_label（默认工作域）。
 * 调用：POST，请求头 `x-kb-backfill-secret: <与 KB_BACKFILL_SECRET 相同>`。
 */
export async function POST(req: Request) {
  const expected = getKbBackfillSecret();
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "服务端未配置 KB_BACKFILL_SECRET，拒绝执行。请在环境变量中设置随机密钥后再调用本接口。",
      },
      { status: 503 },
    );
  }

  const provided = req.headers.get("x-kb-backfill-secret")?.trim();
  if (provided !== expected) {
    return NextResponse.json({ error: "密钥无效" }, { status: 401 });
  }

  try {
    const result = await backfillKbScopeColumnsForLegacyWorkData();
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true, steps: result.steps });
  } catch (e) {
    const message = e instanceof Error ? e.message : "迁移失败";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
