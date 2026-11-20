import { anthropic } from '@ai-sdk/anthropic';
import { groq } from '@ai-sdk/groq';
import type { LanguageModel } from 'ai';

// Groq is the default because it has a free tier. Anthropic stays available as an option.
// Both are switched with env vars only (ARCHITECTURE.md §2), never in code.
const PROVIDERS = {
  groq: { keyVar: 'GROQ_API_KEY', defaultModel: 'openai/gpt-oss-120b', create: groq },
  anthropic: { keyVar: 'ANTHROPIC_API_KEY', defaultModel: 'claude-haiku-5-5', create: anthropic },
} as const;

export type LlmProvider = keyof typeof PROVIDERS;

export const DEFAULT_PROVIDER: LlmProvider = 'groq';

/** LLM_PROVIDER picks the provider; anything unknown falls back to the default. */
export function chatProvider(): LlmProvider {
  const value = process.env.LLM_PROVIDER?.trim().toLowerCase();
  return value && Object.hasOwn(PROVIDERS, value) ? (value as LlmProvider) : DEFAULT_PROVIDER;
}

/** LLM_MODEL overrides the provider's default model (e.g. qwen/qwen3.8-27b on Groq). */
export const chatModelId = (): string =>
  process.env.LLM_MODEL?.trim() || PROVIDERS[chatProvider()].defaultModel;

/** The env var holding the current provider's key, for the 503 message. */
export const apiKeyVar = (): string => PROVIDERS[chatProvider()].keyVar;

/** The chat route checks this first and answers 503 instead of failing mid-stream. */
export const hasApiKey = (): boolean => Boolean(process.env[apiKeyVar()]?.trim());

export const getChatModel = (): LanguageModel => PROVIDERS[chatProvider()].create(chatModelId());
