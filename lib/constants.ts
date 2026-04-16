/** SiliconFlow OpenAI 兼容 API（与官方文档 / leap_loopit_manager 一致，勿混用 .cn） */
export const SILICONFLOW_BASE_URL = "https://api.siliconflow.com/v1";

/** LanceDB 表名：知识块 */
export const LANCE_TABLE_NAME = "kb_chunks";

/** 默认嵌入模型（与 SiliconFlow /embeddings 枚举一致，可通过环境变量覆盖） */
export const DEFAULT_EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-0.6B";

/** 默认对话模型 */
export const DEFAULT_CHAT_MODEL = "deepseek-ai/DeepSeek-V3";

/** 分块大小与重叠（字符） */
export const CHUNK_SIZE = 900;
export const CHUNK_OVERLAP = 120;

/** 检索 top-k */
export const RAG_TOP_K = 6;
