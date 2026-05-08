import { NextResponse } from "next/server";
import OpenAI from "openai";
import { SILICONFLOW_BASE_URL } from "@/lib/constants";
import {
  getSiliconFlowApiKey,
  getSiliconFlowVisionModel,
} from "@/lib/env";
import { saveVisionCaptureToDisk } from "@/lib/vision-capture-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;
const DEFAULT_PROMPT =
  "请尽可能识别图中的文字与数值（如属性、装备、技能描述等），用清晰的 Markdown 或 JSON 风格输出，便于后续整理；若看不清请说明。";

function visionDebugAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_VISION_DEBUG === "1"
  );
}

const SLOG = "[vision-debug-api]";

export async function POST(req: Request) {
  if (!visionDebugAllowed()) {
    console.warn(
      `${SLOG} blocked: NODE_ENV=${process.env.NODE_ENV} ALLOW_VISION_DEBUG=${process.env.ALLOW_VISION_DEBUG}`,
    );
    return NextResponse.json(
      {
        error:
          "该接口仅在 NODE_ENV=development 或 ALLOW_VISION_DEBUG=1 时可用（本地调试用）。",
      },
      { status: 403 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("image");
    const promptRaw = formData.get("prompt");

    if (!(file instanceof File)) {
      const bad = file as FormDataEntryValue | null;
      const ctor =
        bad != null && typeof bad === "object" && "constructor" in bad
          ? String((bad as { constructor?: { name?: string } }).constructor?.name)
          : undefined;
      console.warn(`${SLOG} bad body: image field`, {
        type: bad == null ? "null" : typeof bad,
        ctor,
      });
      return NextResponse.json(
        { error: "请上传表单字段 image（图片文件）" },
        { status: 400 },
      );
    }
    console.log(`${SLOG} received file`, {
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!file.size || file.size > MAX_BYTES) {
      console.warn(`${SLOG} size reject`, { size: file.size, max: MAX_BYTES });
      return NextResponse.json(
        { error: `图片过大或为空（上限 ${MAX_BYTES / 1024 / 1024}MB）` },
        { status: 400 },
      );
    }

    let mime = file.type?.trim() || "";
    if (!mime || mime === "application/octet-stream") {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".png")) mime = "image/png";
      else if (lower.endsWith(".webp")) mime = "image/webp";
      else if (lower.endsWith(".gif")) mime = "image/gif";
      else if (lower.endsWith(".heic") || lower.endsWith(".heif")) {
        mime = "image/heic";
      } else {
        mime = "image/jpeg";
      }
      console.log(`${SLOG} inferred mime from name/empty type`, { mime });
    }
    if (!mime.startsWith("image/")) {
      console.warn(`${SLOG} mime reject`, { mime });
      return NextResponse.json({ error: "仅支持 image/* 类型" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const b64 = buf.toString("base64");
    const dataUrl = `data:${mime};base64,${b64}`;

    const userPrompt =
      typeof promptRaw === "string" && promptRaw.trim().length > 0
        ? promptRaw.trim()
        : DEFAULT_PROMPT;

    const client = new OpenAI({
      apiKey: getSiliconFlowApiKey(),
      baseURL: SILICONFLOW_BASE_URL,
    });

    const model = getSiliconFlowVisionModel();
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    console.log(`${SLOG} success`, { model, textLen: text.length });

    let savedTo: string | undefined;
    try {
      savedTo = await saveVisionCaptureToDisk({
        model,
        prompt: userPrompt,
        sourceImageName: file.name || "image",
        text,
      });
      console.log(`${SLOG} wrote capture`, { savedTo });
    } catch (err) {
      console.error(`${SLOG} vision capture disk write failed`, err);
    }

    return NextResponse.json({
      ok: true,
      model,
      text,
      ...(savedTo ? { savedTo } : {}),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "视觉请求失败";
    console.error(`${SLOG} upstream error`, message, e);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
