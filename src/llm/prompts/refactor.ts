export const REFACTOR_PROMPT = `Analyze the following code for refactoring opportunities. Focus on:
1. Duplication that could be extracted
2. Functions that are too long or do too much
3. Tight coupling between modules
4. Error handling gaps
5. Performance concerns

For each issue, suggest a concrete fix.

Code:
{CODE}`;

export const SYSTEM_REFACTOR = `You are a senior software engineer reviewing code. Be practical and specific. Prioritize issues by impact.`;
