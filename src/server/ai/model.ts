import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

export const DEFAULT_MODEL = 'claude-haiku-5-5';

/** LLM_MODEL switches models (e.g. claude-sonnet-5-5) without code changes. */
export const chatModelId = (): string => process.env.LLM_MODEL || DEFAULT_MODEL;

/** The chat route checks this first and answers 503 instead of failing mid-stream. */
export const hasAnthropicKey = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

export const getChatModel = (): LanguageModel => anthropic(chatModelId());
