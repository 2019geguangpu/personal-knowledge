import OpenAI from "openai";
import { SILICONFLOW_BASE_URL } from "@/lib/constants";
import {
  getEmbeddingDimensions,
  getEmbeddingModel,
  getSiliconFlowApiKey,
} from "@/lib/env";

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: getSiliconFlowApiKey(),
    baseURL: SILICONFLOW_BASE_URL,
  });
}

/** 单条或多条文本批量嵌入（OpenAI 兼容接口） */
export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const client = getClient();
  const model = getEmbeddingModel();
  const dimensions = getEmbeddingDimensions();
  const res = await client.embeddings.create({
    model,
    input: inputs,
    ...(dimensions != null ? { dimensions } : {}),
  });
  const sorted = [...res.data].sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding as number[]);
}
