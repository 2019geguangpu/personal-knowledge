import OpenAI from "openai";
import { SILICONFLOW_BASE_URL } from "@/lib/constants";
import { getChatModel, getSiliconFlowApiKey } from "@/lib/env";
import {
  buildLawAnalyzePrompt,
  type LawAnalyzeFocus,
} from "@/lib/law/analyze-prompt";

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: getSiliconFlowApiKey(),
    baseURL: SILICONFLOW_BASE_URL,
  });
}

export async function analyzeLawText(params: {
  url: string;
  extractedText: string;
  focus: LawAnalyzeFocus[];
  customAngle?: string;
}): Promise<string> {
  const client = getClient();
  const model = getChatModel();
  const { system, user } = buildLawAnalyzePrompt(params);

  const res = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = res.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw new Error("模型未返回有效内容");
  }
  return content;
}

