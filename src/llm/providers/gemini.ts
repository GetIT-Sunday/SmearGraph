import type { LLMConfig } from "../../types/index.js";
import type { LLMProvider } from "../index.js";

export class GeminiProvider implements LLMProvider {
  type = "gemini" as const;
  private config: LLMConfig;
  private baseURL: string;

  constructor(config: LLMConfig) {
    this.config = config;
    this.baseURL = config.baseURL || "https://generativelanguage.googleapis.com/v1beta";
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature ?? 0.3,
      },
    };
    if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
    const model = this.config.model || "gemini-2.0-flash";
    const res = await fetch(
      `${this.baseURL}/models/${model}:generateContent?key=${this.config.apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const text = await this.generate(
      `${prompt}\n\nRespond with valid JSON only. No markdown fences.`,
      systemPrompt,
    );
    return JSON.parse(text);
  }
}
