import 'server-only';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * Retrieves the configured Google Gemini API key.
 * Checks GOOGLE_GENERATIVE_AI_API_KEY first, with GEMINI_API_KEY as fallback.
 * Never exposed to client bundles.
 */
export function getGoogleApiKey(): string | undefined {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
}

/**
 * Checks whether a valid Gemini API key is configured.
 */
export function hasGoogleApiKey(): boolean {
  const key = getGoogleApiKey();
  return Boolean(key && key.trim().length > 0 && key !== 'your_gemini_api_key_here');
}

/**
 * Returns a configured Gemini language model instance using the verified gemini-3.8-flash model identifier.
 * Explicitly passes the configured API key to createGoogleGenerativeAI.
 */
export function getGeminiModel(modelId: 'gemini-3.8-flash' = 'gemini-3.8-flash') {
  const apiKey = getGoogleApiKey();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error(
      'Google Gemini API key is missing. Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local to enable the AI assistant.'
    );
  }

  const googleProvider = createGoogleGenerativeAI({
    apiKey: apiKey.trim(),
  });

  return googleProvider(modelId);
}
