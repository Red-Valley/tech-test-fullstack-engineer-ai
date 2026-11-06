import { openai } from '@ai-sdk/openai';
import type { LLMProviderStrategy } from './types';

export const openaiStrategy: LLMProviderStrategy = {
  id: 'openai',
  apiKeyEnv: 'OPENAI_API_KEY',
  // In OpenAIResponsesModelId, used across the @ai-sdk/openai docs and marked "Tool Usage" there.
  defaultModel: 'gpt-6-astra',
  createModel: (modelId) => openai(modelId),
};
