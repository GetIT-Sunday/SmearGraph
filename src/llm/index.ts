import type { LLMConfig, LLMProviderType } from "../types/index.js";

export interface LLMProvider {
  type: LLMProviderType;
  generate(prompt: string, systemPrompt?: string): Promise<string>;
  generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T>;
}

export function createProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case "openai":
      return new (require("./providers/openai").OpenAIProvider)(config);
    case "anthropic":
      return new (require("./providers/anthropic").AnthropicProvider)(config);
    case "gemini":
      return new (require("./providers/gemini").GeminiProvider)(config);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

export function envConfig(): LLMConfig | null {
  const provider = (process.env.SMEARGRAPH_LLM_PROVIDER || "") as LLMProviderType;
  const apiKey = process.env.SMEARGRAPH_LLM_API_KEY;
  const model = process.env.SMEARGRAPH_LLM_MODEL;
  if (!provider || !apiKey) return null;
  return { provider, apiKey, model: model || undefined, maxTokens: 2000, temperature: 0.3 };
}
