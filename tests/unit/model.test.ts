import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiKeyVar, chatModelId, chatProvider, hasApiKey } from '@/server/ai/model';

afterEach(() => vi.unstubAllEnvs());

describe('model selection from env', () => {
  it('defaults to Groq with openai/gpt-oss-120b and GROQ_API_KEY', () => {
    vi.stubEnv('LLM_PROVIDER', '');
    vi.stubEnv('LLM_MODEL', '');
    expect(chatProvider()).toBe('groq');
    expect(chatModelId()).toBe('openai/gpt-oss-120b');
    expect(apiKeyVar()).toBe('GROQ_API_KEY');
  });

  it('switches to Anthropic with LLM_PROVIDER, case-insensitively', () => {
    vi.stubEnv('LLM_PROVIDER', ' Anthropic ');
    vi.stubEnv('LLM_MODEL', '');
    expect(chatProvider()).toBe('anthropic');
    expect(chatModelId()).toBe('claude-haiku-5-5');
    expect(apiKeyVar()).toBe('ANTHROPIC_API_KEY');
  });

  it('falls back to Groq for an unknown provider', () => {
    vi.stubEnv('LLM_PROVIDER', 'openai');
    expect(chatProvider()).toBe('groq');
  });

  it('LLM_MODEL overrides the default model', () => {
    vi.stubEnv('LLM_PROVIDER', 'groq');
    vi.stubEnv('LLM_MODEL', 'openai/gpt-oss-120b');
    expect(chatModelId()).toBe('openai/gpt-oss-120b');
  });

  it("checks the current provider's key only", () => {
    vi.stubEnv('LLM_PROVIDER', 'groq');
    vi.stubEnv('GROQ_API_KEY', '  ');
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-something');
    expect(hasApiKey()).toBe(false);
    vi.stubEnv('GROQ_API_KEY', 'gsk_test');
    expect(hasApiKey()).toBe(true);
  });
});
