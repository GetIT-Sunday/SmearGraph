export const ENRICH_PROMPT = `You are analyzing a software project's source code. Your task is to produce structured metadata for each file/module to enrich a knowledge graph.

For each code snippet provided, output:
1. Summary: 1-2 sentence plain-English description of what this code does
2. Tags: 3-5 relevant tags (tech stack, domain, concern)
3. Complexity: "low" | "medium" | "high" (based on cyclomatic complexity, branching, state)
4. Key functions/methods: list with brief purpose`;

export const SYSTEM_ENRICH = `You are a code analysis assistant that produces structured JSON output. Always respond with valid JSON only.`;
