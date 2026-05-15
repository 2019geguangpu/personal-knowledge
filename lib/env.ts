import path from "node:path";

export function getSiliconFlowApiKey(): string {
  const key = process.env.SILICONFLOW_API_KEY;
  if (!key) {
    throw new Error("缺少环境变量 SILICONFLOW_API_KEY");
  }
  return key;
}

export function getVectorDbPath(): string {
  const raw = process.env.VECTOR_DB_PATH ?? "./data/lancedb";
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

export function getLawSourceAllowlist(): string[] {
  const raw = process.env.LAW_SOURCE_ALLOWLIST ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function getLawSourceAllowlistOfficial(): string[] {
  const raw = process.env.LAW_SOURCE_ALLOWLIST_OFFICIAL ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function getLawSourceAllowlistTrusted(): string[] {
  const raw = process.env.LAW_SOURCE_ALLOWLIST_TRUSTED ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function getSerpApiKey(): string {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key) {
    throw new Error("缺少环境变量 SERPAPI_API_KEY");
  }
  return key;
}

/** 与请求头 x-kb-backfill-secret 比对；未配置则迁移接口不可用 */
export function getKbBackfillSecret(): string | undefined {
  const v = process.env.KB_BACKFILL_SECRET?.trim();
  return v && v.length > 0 ? v : undefined;
}

/** SiliconFlow 视觉模型（OpenAI 兼容 /chat/completions） */
export function getSiliconFlowVisionModel(): string {
  return (
    process.env.SILICONFLOW_VL_MODEL?.trim() ||
    "Qwen/Qwen3-VL-32B-Instruct"
  );
}

/** 与 SiliconFlow OpenAPI 枚举一致，见 https://docs.siliconflow.com/en/api-reference/embeddings/create-embeddings */
export function getEmbeddingModel(): string {
  return process.env.SILICONFLOW_EMBEDDING_MODEL ?? "Qwen/Qwen3-Embedding-0.6B";
}

/**
 * 仅 Qwen3 Embedding 支持 `dimensions`；默认 1024，与常见向量维度一致，便于 LanceDB 检索。
 * 若改用其他模型，勿设该变量或按需调整。
 */
export function getEmbeddingDimensions(): number | undefined {
  const model = getEmbeddingModel();
  if (!model.startsWith("Qwen/Qwen3-Embedding")) {
    return undefined;
  }
  const raw = process.env.SILICONFLOW_EMBEDDING_DIMENSIONS ?? "1024";
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 1024;
}

export function getChatModel(): string {
  return process.env.SILICONFLOW_CHAT_MODEL ?? "deepseek-ai/DeepSeek-V3";
}

/**
 * LanceDB 向量检索相似度阈值（仅用于日志观测与后续迭代；当前不改变检索行为）。
 * 约定：阈值语义由上层决定（distance / score），先以配置值原样透传到日志。
 */
export function getRagSearchScoreThreshold(): number | undefined {
  const raw = process.env.RAG_SEARCH_SCORE_THRESHOLD?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** 飞书自建应用 App ID（开放平台凭证与权限） */
export function getFeishuAppId(): string {
  const v = process.env.FEISHU_APP_ID;
  if (!v) {
    throw new Error("缺少环境变量 FEISHU_APP_ID");
  }
  return v;
}

export function getFeishuAppSecret(): string {
  const v = process.env.FEISHU_APP_SECRET;
  if (!v) {
    throw new Error("缺少环境变量 FEISHU_APP_SECRET");
  }
  return v;
}

/** NestJS skill-runner 根地址（Next 仅做转发），默认与本仓库 install-zip 示例一致 */
export function getSkillRunnerBaseUrl(): string {
  const raw = (process.env.SKILL_RUNNER_URL ?? "http://127.0.0.1:4317").trim();
  return raw.replace(/\/$/, "");
}
