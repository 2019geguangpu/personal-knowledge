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
