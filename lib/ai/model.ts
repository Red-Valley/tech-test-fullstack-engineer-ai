import 'server-only';
import { getProviderStrategy } from './providers/factory';
import type { ChatModel, ProviderEnv } from './providers/types';

let override: ChatModel | null = null;

/** Test seam: makes getChatModel() return a mock model. Pass null to restore the factory. */
export function setChatModelOverride(model: ChatModel | null): void {
  override = model;
}

/** @throws ChatConfigError when the provider is unknown or its key is missing. */
export function getChatModel(env: ProviderEnv = process.env): ChatModel {
  if (override) return override;
  const strategy = getProviderStrategy(env);
  return strategy.createModel(env.AI_MODEL?.trim() || strategy.defaultModel);
}
