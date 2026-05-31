import * as fs from "fs";
import * as path from "path";
import type { KnowledgeGraph, LLMConfig } from "../types/index.js";
import { createProvider, envConfig } from "./index.js";
import type { LLMProvider } from "./index.js";
import { ENRICH_PROMPT, SYSTEM_ENRICH } from "./prompts/enrich.js";

async function enrichNode(
  provider: LLMProvider,
  nodeName: string,
  nodeType: string,
  code: string,
): Promise<{ summary: string; tags: string[]; complexity: "low" | "medium" | "high" }> {
  const snippet = code.substring(0, 4000);
  const prompt = `${ENRICH_PROMPT}\n\nName: ${nodeName}\nType: ${nodeType}\n\n\`\`\`\n${snippet}\n\`\`\``;
  const result = await provider.generateJSON<{
    summary: string; tags: string[]; complexity: "low" | "medium" | "high";
  }>(prompt, SYSTEM_ENRICH);
  return {
    summary: result.summary || "",
    tags: Array.isArray(result.tags) ? result.tags.slice(0, 5) : [],
    complexity: ["low", "medium", "high"].includes(result.complexity) ? result.complexity : "medium",
  };
}

export interface EnrichResult {
  total: number;
  enriched: number;
  skipped: number;
  errors: number;
  cacheHits: number;
}

export async function enrichKnowledgeGraph(kg: KnowledgeGraph, config?: LLMConfig): Promise<EnrichResult> {
  const cfg = config || envConfig();
  if (!cfg) throw new Error("No LLM configuration found. Set SMEARGRAPH_LLM_PROVIDER and SMEARGRAPH_LLM_API_KEY.");
  const provider = createProvider(cfg);

  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  const cachePath = path.join(root, ".smeargraph", "llm-cache.json");
  let cache: { summaries?: Record<string, string>; tags?: Record<string, string[]>; complexity?: Record<string, string> } = {};
  try { cache = JSON.parse(fs.readFileSync(cachePath, "utf-8")); } catch {}

  const result: EnrichResult = { total: kg.nodes.length, enriched: 0, skipped: 0, errors: 0, cacheHits: 0 };

  for (const node of kg.nodes) {
    if (node.summary && node.tags.length > 0 && node.complexity) {
      result.skipped++;
      continue;
    }
    if (cache.summaries?.[node.id]) {
      node.summary = cache.summaries[node.id];
      node.tags = (cache.tags?.[node.id]) || [];
      node.complexity = (cache.complexity?.[node.id] as "low" | "medium" | "high") || "medium";
      result.cacheHits++;
      continue;
    }
    let code = "";
    if (node.filePath) {
      try { code = fs.readFileSync(node.filePath, "utf-8"); } catch {}
    }
    if (!code) { result.skipped++; continue; }
    try {
      const enriched = await enrichNode(provider, node.name, node.type, code);
      node.summary = enriched.summary;
      node.tags = enriched.tags;
      node.complexity = enriched.complexity;
      cache.summaries = cache.summaries || {};
      cache.tags = cache.tags || {};
      cache.complexity = cache.complexity || {};
      cache.summaries![node.id] = enriched.summary;
      cache.tags![node.id] = enriched.tags;
      cache.complexity![node.id] = enriched.complexity;
      result.enriched++;
    } catch {
      result.errors++;
    }
  }

  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  return result;
}
