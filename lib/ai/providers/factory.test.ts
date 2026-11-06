import { describe, expect, it } from 'vitest';
import { ChatConfigError } from '../errors';
import { getChatModel } from '../model';
import { getProviderStrategy } from './factory';

describe('getProviderStrategy', () => {
  it('uses openai when AI_PROVIDER is not set', () => {
    expect(getProviderStrategy({ OPENAI_API_KEY: 'k' }).id).toBe('openai');
  });

  it('uses openai when AI_PROVIDER is blank, as in a copied .env.example', () => {
    expect(getProviderStrategy({ AI_PROVIDER: ' ', OPENAI_API_KEY: 'k' }).id).toBe('openai');
  });

  it('selects each registered strategy', () => {
    expect(getProviderStrategy({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'k' }).id).toBe('openai');
    expect(getProviderStrategy({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' }).id).toBe('anthropic');
  });

  it('rejects an unknown provider with a typed error that lists the valid ones', () => {
    const resolve = () => getProviderStrategy({ AI_PROVIDER: 'gemini', OPENAI_API_KEY: 'k' });
    expect(resolve).toThrow(ChatConfigError);
    expect(resolve).toThrow(/Unknown AI_PROVIDER "gemini".*openai, anthropic/);
  });

  it('asks for the key of the active provider when it is missing', () => {
    expect(() => getProviderStrategy({})).toThrow(new ChatConfigError('Set OPENAI_API_KEY in .env.local'));
    expect(() => getProviderStrategy({ AI_PROVIDER: 'anthropic', OPENAI_API_KEY: 'k' })).toThrow(
      new ChatConfigError('Set ANTHROPIC_API_KEY in .env.local'),
    );
  });

  it('treats a blank key as missing, because the SDK would send it and fail mid-stream', () => {
    expect(() => getProviderStrategy({ OPENAI_API_KEY: '   ' })).toThrow(ChatConfigError);
  });
});

describe('getChatModel', () => {
  it('uses the default model of each strategy', () => {
    expect(getChatModel({ OPENAI_API_KEY: 'k' }).modelId).toBe('gpt-6-astra');
    expect(getChatModel({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' }).modelId).toBe('claude-sonnet-5-5');
  });

  it('builds a model from the selected provider package', () => {
    expect(getChatModel({ OPENAI_API_KEY: 'k' }).provider).toMatch(/^openai/);
    expect(getChatModel({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' }).provider).toMatch(/^anthropic/);
  });

  it('lets AI_MODEL replace the default model', () => {
    expect(getChatModel({ OPENAI_API_KEY: 'k', AI_MODEL: 'gpt-5.6' }).modelId).toBe('gpt-5.6');
  });

  it('ignores a blank AI_MODEL', () => {
    expect(getChatModel({ OPENAI_API_KEY: 'k', AI_MODEL: '' }).modelId).toBe('gpt-6-astra');
  });

  it('fails with the typed error, not an opaque TypeError, when the key is missing', () => {
    expect(() => getChatModel({})).toThrow(ChatConfigError);
  });
});
