import Anthropic from "@anthropic-ai/sdk";

/** The current default model per the Claude API guidance. Override it with ANTHROPIC_MODEL (e.g. claude-haiku-5-5). */
export const DEFAULT_MODEL = "claude-opus-5-5";

export const getModel = (): string => process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

/** True when an API key (or auth token) is configured. Checked up front so a missing key gives a clear message. */
export const hasCredentials = (): boolean =>
  Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());

let client: Anthropic | undefined;

/** One shared client; the SDK reads ANTHROPIC_API_KEY from the environment. */
export const getClient = (): Anthropic => (client ??= new Anthropic());
