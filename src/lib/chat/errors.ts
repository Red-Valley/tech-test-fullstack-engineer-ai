import Anthropic from "@anthropic-ai/sdk";

/** The API's own explanation (e.g. "Your credit balance is too low ..."), when it sent one. */
function apiMessage(error: InstanceType<typeof Anthropic.APIError>): string {
  const body = error.error as { error?: { message?: unknown } } | undefined;
  const message = body?.error?.message;
  return typeof message === "string" && message ? message : error.message;
}

/**
 * Turns whatever went wrong into a sentence that is safe to show in the chat, and says what to do about
 * the common setup mistakes. Unknown errors get a generic message; the details stay in the server log.
 */
export function friendlyError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "Anthropic rejected the API key. Check ANTHROPIC_API_KEY in .env.local, then restart the server.";
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return "This API key isn't allowed to use that model or feature.";
  }
  if (error instanceof Anthropic.NotFoundError) {
    return "Anthropic doesn't recognise the configured model. Check ANTHROPIC_MODEL.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Anthropic is rate-limiting requests. Wait a moment and try again.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Couldn't reach the Anthropic API. Check your network connection and try again.";
  }
  if (error instanceof Anthropic.APIError) {
    return `Anthropic returned an error (${error.status}): ${apiMessage(error)}`;
  }
  return "Something went wrong while generating the answer. Please try again.";
}
