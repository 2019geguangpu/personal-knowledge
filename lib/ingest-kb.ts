import { randomUUID } from "node:crypto";
import { chunkText } from "@/lib/chunk-text";
import { DEFAULT_WORK_SCOPE, type KbScope } from "@/lib/kb-scope";
import { addKbChunks, type KbChunkRow } from "@/lib/lancedb";
import { embedTexts } from "@/lib/siliconflow-embeddings";

export async function ingestPlainText(
  raw: string,
  source: string,
  scope: KbScope = DEFAULT_WORK_SCOPE,
): Promise<{ chunkCount: number; source: string }> {
  const chunks = chunkText(raw);
  if (chunks.length === 0) {
    throw new Error("内容为空或无法分块");
  }

  const vectors = await embedTexts(chunks);
  const createdAt = new Date().toISOString();

  const rows: KbChunkRow[] = chunks.map((text, i) => ({
    id: randomUUID(),
    text,
    source,
    chunk_index: i,
    created_at: createdAt,
    vector: vectors[i]!,
    domain: scope.domain,
    sub_domain: scope.sub_domain,
    sub_domain_label: scope.sub_domain_label,
  }));

  await addKbChunks(rows);

  return { chunkCount: rows.length, source };
}
