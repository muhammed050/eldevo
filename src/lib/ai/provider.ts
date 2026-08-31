import { generateText } from "ai";

export type AIProvider = "openai" | "anthropic" | "google" | "mock";

export type ModelRequest = {
  model: string;
  system?: string;
  prompt: string;
  maxOutputTokens?: number;
};

function resolveModel(model: string) {
  const provider = model.split(":")[0] as AIProvider;
  const name = model.includes(":") ? model.slice(model.indexOf(":") + 1) : model;
  if (provider === "mock") return null;
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not configured");
    return { provider, name };
  }
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
    return { provider, name };
  }
  if (provider === "google") {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
    return { provider, name };
  }
  throw new Error(`Unsupported model provider: ${provider}`);
}

export async function runModel(request: ModelRequest) {
  const resolved = resolveModel(request.model);
  if (!resolved) {
    return {
      text: `Mock execution completed for: ${request.prompt}`,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  // Provider-specific model factories are intentionally lazy so the app can boot
  // without requiring every provider SDK. Install the provider package when used.
  const { createOpenAI } = await import("@ai-sdk/openai");
  const openai = resolved.provider === "openai" ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  if (!openai) throw new Error(`Provider ${resolved.provider} requires its SDK adapter to be configured`);

  const result = await generateText({
    model: openai(resolved.name),
    system: request.system,
    prompt: request.prompt,
    maxOutputTokens: request.maxOutputTokens ?? 1200,
  });
  return {
    text: result.text,
    usage: {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
      totalTokens: result.usage.totalTokens ?? 0,
    },
  };
}
