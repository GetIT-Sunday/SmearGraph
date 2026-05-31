import type { LLMConfig } from "../../types/index.js";
import type { LLMProvider } from "../index.js";

export class AnthropicProvider implements LLMProvider {
  type = "anthropic" as const;
  private config: LLMConfig;
  private baseURL: string;

  constructor(config: LLMConfig) {
    this.config = config;
    this.baseURL = config.baseURL || "https://api.anthropic.com/v1";
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.config.model || "claude-sonnet-4-20250514",
      max_tokens: this.config.maxTokens || 2000,
      messages: [{ role: "user", content: prompt }],
    };
    if (systemPrompt) body.system = systemPrompt;
    const res = await fetch(`${this.baseURL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as { content?: { text?: string }[] };
    return data.content?.[0]?.text || "";
  }

  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const text = await this.generate(
      `${prompt}\n\nRespond with valid JSON only. No markdown fences.`,
      systemPrompt,
    );
    return JSON.parse(text);
  }
}
