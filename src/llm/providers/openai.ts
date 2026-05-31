import type { LLMConfig } from "../../types/index.js";
import type { LLMProvider } from "../index.js";

export class OpenAIProvider implements LLMProvider {
  type = "openai" as const;
  private config: LLMConfig;
  private baseURL: string;

  constructor(config: LLMConfig) {
    this.config = config;
    this.baseURL = config.baseURL || "https://api.openai.com/v1";
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.config.model || "gpt-4o-mini",
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      max_tokens: this.config.maxTokens || 2000,
      temperature: this.config.temperature ?? 0.3,
    };
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.config.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content || "";
  }

  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const body: Record<string, unknown> = {
      model: this.config.model || "gpt-4o-mini",
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: `${prompt}\n\nRespond with valid JSON only.` },
      ],
      response_format: { type: "json_object" },
      max_tokens: this.config.maxTokens || 2000,
      temperature: this.config.temperature ?? 0.3,
    };
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.config.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    return JSON.parse(data.choices?.[0]?.message?.content || "{}");
  }
}
