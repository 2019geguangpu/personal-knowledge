// 统一出口：按领域分组 re-export，便于后续搬迁到子目录时保持 import 稳定。

// kb / rag
export * from "@/lib/constants";
export * from "@/lib/kb-scope";
export * from "@/lib/chunk-text";
export * from "@/lib/siliconflow-embeddings";
export * from "@/lib/lancedb";
export * from "@/lib/ingest-kb";
export * from "@/lib/lance-backfill-kb-scope";

// chat
export * from "@/lib/chat-system";
export * from "@/lib/chat-intent";
export * from "@/lib/ui-message-text";

// vision
export * from "@/lib/vision-debug-constants";
export * from "@/lib/vision-file-filter";
export * from "@/lib/vision-import-text-normalize";
export * from "@/lib/vision-capture-store";

// integrations
export * from "@/lib/feishu-client";

// dev
export * from "@/lib/dev-imported-json-guard";
export * from "@/lib/imported-json-filename";

// game
export * from "@/lib/game-inscription-llm-prompt";
export * from "@/lib/sort-list-by-stat-tool";
export * from "@/lib/sort-list-by-stat.logic";

// infra / shared
export * from "@/lib/env";
export * from "@/lib/logger";
export * from "@/lib/map-with-concurrency";
export * from "@/lib/utils";

