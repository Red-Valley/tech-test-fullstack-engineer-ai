import { anthropic } from '@ai-sdk/anthropic';
import { defaultSettingsMiddleware, wrapLanguageModel } from 'ai';
import type { LLMProviderStrategy } from './types';

// Thinking stays off because, after a tool call, the answer then waits for it and arrives
// all at once instead of streaming. claude-sonnet-5-5 cannot turn it off, hence Haiku.
const withoutThinking = defaultSettingsMiddleware({
  settings: { providerOptions: { anthropic: { thinking: { type: 'disabled' } } } },
});

export const anthropicStrategy: LLMProviderStrategy = {
  id: 'anthropic',
  apiKeyEnv: 'ANTHROPIC_API_KEY',
  defaultModel: 'claude-haiku-5-5',
  createModel: (modelId) => wrapLanguageModel({ model: anthropic(modelId), middleware: withoutThinking }),
};
