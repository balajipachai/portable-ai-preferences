export interface LlmConfig {
  baseUrl: string;
  model: string;
  apiKey: string | undefined;
  timeoutMs: number;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// Read at call time so tests and scripts can set env before use.
export function loadLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig {
  return {
    baseUrl: (env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, ""),
    model: env.LLM_MODEL || "gpt-4o-mini",
    apiKey: env.LLM_API_KEY || undefined,
    timeoutMs: positiveInt(env.LLM_TIMEOUT_MS, 20_000),
  };
}

export function loadPort(env: NodeJS.ProcessEnv = process.env): number {
  return positiveInt(env.PORT, 3000);
}
