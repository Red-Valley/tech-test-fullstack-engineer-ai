import { z } from 'zod';
import { ChatConfigError } from '../errors';
import { anthropicStrategy } from './anthropic';
import { openaiStrategy } from './openai';
import type { LLMProviderStrategy, ProviderEnv } from './types';

// Adding a provider: one strategy file and one line here.
const STRATEGIES = {
  openai: openaiStrategy,
  anthropic: anthropicStrategy,
} as const satisfies Record<string, LLMProviderStrategy>;

const DEFAULT_PROVIDER = 'openai' satisfies keyof typeof STRATEGIES;

const providerIds = Object.keys(STRATEGIES) as [keyof typeof STRATEGIES, ...(keyof typeof STRATEGIES)[]];

// `AI_PROVIDER=` copied from .env.example means "not set", not an unknown provider.
const providerSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.enum(providerIds).default(DEFAULT_PROVIDER),
);

/**
 * Resolves the active provider and fails fast when it cannot work. The SDK only
 * reads its key when the request is sent, which is already inside the stream, and it
 * accepts an empty string, so the check has to happen here.
 */
export function getProviderStrategy(env: ProviderEnv = process.env): LLMProviderStrategy {
  const provider = providerSchema.safeParse(env.AI_PROVIDER);
  if (!provider.success) {
    throw new ChatConfigError(`Unknown AI_PROVIDER "${env.AI_PROVIDER}". Use one of: ${providerIds.join(', ')}`);
  }

  const strategy = STRATEGIES[provider.data];
  if (!env[strategy.apiKeyEnv]?.trim()) {
    throw new ChatConfigError(`Set ${strategy.apiKeyEnv} in .env.local`);
  }
  return strategy;
}
