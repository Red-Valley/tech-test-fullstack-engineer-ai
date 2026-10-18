import { anthropic } from "@ai-sdk/anthropic";

export const MODEL_ID = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export const model = anthropic(MODEL_ID);

export const isAiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);
