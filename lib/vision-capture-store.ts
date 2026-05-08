import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR_SEGMENTS = ["data", "vision-captures"] as const;

function visionCaptureDirAbsolute(): string {
  return path.join(process.cwd(), ...DIR_SEGMENTS);
}

function slugForFilename(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** 仅用于文件头展示，不参与路径拼接。 */
export function sanitizeVisionSourceLabel(name: string): string {
  const base = path.basename(name.trim()) || "image";
  const safe = base.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  return safe || "image";
}

export type SaveVisionCaptureInput = {
  model: string;
  prompt: string;
  sourceImageName: string;
  text: string;
};

/**
 * 将单次视觉识别正文写入 data/vision-captures（本地；默认不进 Git）。
 * @returns 仓库相对路径，如 data/vision-captures/vision-20250422-153045-a1b2c3.md
 */
export async function saveVisionCaptureToDisk(
  input: SaveVisionCaptureInput,
): Promise<string> {
  const dir = visionCaptureDirAbsolute();
  const id = randomBytes(3).toString("hex");
  const fileName = `vision-${slugForFilename()}-${id}.md`;
  const abs = path.join(dir, fileName);
  const iso = new Date().toISOString();
  const label = sanitizeVisionSourceLabel(input.sourceImageName);
  const header = [
    "> **vision-capture** · 自动保存",
    `> · 时间 \`${iso}\` · 模型 \`${input.model.replace(/`/g, "'")}\` · 图源 \`${label.replace(/`/g, "'")}\``,
    "> · 提示词见下一行引用块；正文从「识别结果」起为模型输出。",
    "",
    "```",
    input.prompt.length > 4000
      ? `${input.prompt.slice(0, 4000)}\n…（已截断）`
      : input.prompt,
    "```",
    "",
    "## 识别结果",
    "",
    input.text.trimEnd(),
    "",
  ].join("\n");

  await mkdir(dir, { recursive: true });
  await writeFile(abs, header, "utf8");
  return path.posix.join(...DIR_SEGMENTS, fileName);
}
