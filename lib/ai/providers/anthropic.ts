import { anthropic } from '@ai-sdk/anthropic';
import type { LLMProviderStrategy } from './types';

export const anthropicStrategy: LLMProviderStrategy = {
  id: 'anthropic',
  apiKeyEnv: 'ANTHROPIC_API_KEY',
  // In AnthropicModelId and marked "Tool Usage" in the @ai-sdk/anthropic docs.
  defaultModel: 'claude-sonnet-5-5',
  createModel: (modelId) => anthropic(modelId),
};
