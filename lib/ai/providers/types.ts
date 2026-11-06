import type { LanguageModel } from 'ai';

/** A resolved model object; `LanguageModel` also allows gateway strings, which this app never uses. */
export type ChatModel = Exclude<LanguageModel, string>;

export type ProviderEnv = Readonly<Record<string, string | undefined>>;

export interface LLMProviderStrategy {
  readonly id: string;
  /** Environment variable that must hold this provider's API key. */
  readonly apiKeyEnv: string;
  readonly defaultModel: string;
  createModel(modelId: string): ChatModel;
}
