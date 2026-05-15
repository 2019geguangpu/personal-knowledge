import { randomUUID } from "node:crypto";
import { chunkText } from "@/lib/chunk-text";
import { DEFAULT_WORK_SCOPE, type KbScope } from "@/lib/kb-scope";
import { addKbChunks, addLawChunks, type KbChunkRow, type LawChunkRow } from "@/lib/lancedb";
import { embedTexts } from "@/lib/siliconflow-embeddings";

export type IngestChunkMeta = {
  domain: string;
  sub_domain: string;
  sub_domain_label: string;
};

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

export async function ingestLawPlainText(params: {
  raw: string;
  source: string;
  sub_domain: "doc" | "analysis";
  sub_domain_label?: string;
}): Promise<{ chunkCount: number; source: string }> {
  const chunks = chunkText(params.raw);
  if (chunks.length === 0) {
    throw new Error("内容为空或无法分块");
  }

  const vectors = await embedTexts(chunks);
  const createdAt = new Date().toISOString();
  const label = (params.sub_domain_label ?? "").slice(0, 120);

  const rows: LawChunkRow[] = chunks.map((text, i) => ({
    id: randomUUID(),
    text,
    source: params.source,
    chunk_index: i,
    created_at: createdAt,
    vector: vectors[i]!,
    domain: "law",
    sub_domain: params.sub_domain,
    sub_domain_label: label,
  }));

  await addLawChunks(rows);

  return { chunkCount: rows.length, source: params.source };
}
