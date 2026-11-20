import {
  convertToModelMessages,
  safeValidateUIMessages,
  stepCountIs,
  streamText,
  type LanguageModel,
} from 'ai';
import { z } from 'zod';
import { getChatModel, hasAnthropicKey } from '@/server/ai/model';
import { SYSTEM_PROMPT } from '@/server/ai/system-prompt';
import { getChatTools, type ChatTools } from '@/server/ai/tools';
import { parseJsonBody } from '@/server/http/request';
import { badRequest, serverError, serviceUnavailable } from '@/server/http/responses';

export const MAX_STEPS = 5;

export const MISSING_KEY_MESSAGE =
  'The chat is not configured: set ANTHROPIC_API_KEY in .env.local and restart the server.';

const STREAM_ERROR_MESSAGE = 'The assistant ran into a problem. Please try again.';

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1, 'Send at least one message'),
});

type ChatDeps = {
  hasKey: () => boolean;
  getModel: () => LanguageModel;
  getTools: () => ChatTools;
};

/**
 * Builds the POST /api/chat handler. Dependencies are injected so the Level 2 tests can run it
 * with the SDK's mock model and an in-memory catalog; the route passes the real ones.
 */
export function createChatHandler(deps: ChatDeps) {
  return async function POST(request: Request): Promise<Response> {
    // Checked first so a missing key is a clear 503, not a stream that fails halfway.
    if (!deps.hasKey()) return serviceUnavailable(MISSING_KEY_MESSAGE);

    const body = await parseJsonBody(request, bodySchema);
    if (!body.ok) return body.response;

    const tools = deps.getTools();
    const validated = await safeValidateUIMessages({ messages: body.data.messages, tools });
    if (!validated.success) return badRequest('messages must be AI SDK UI messages');

    try {
      const result = streamText({
        model: deps.getModel(),
        instructions: SYSTEM_PROMPT,
        // A stream stopped mid tool call leaves a call with no result in the history; without
        // this, every later turn of that conversation would fail with MissingToolResultsError.
        messages: await convertToModelMessages(validated.data, { ignoreIncompleteToolCalls: true }),
        tools,
        stopWhen: stepCountIs(MAX_STEPS),
        onError: ({ error }) => console.error('[chat] stream error', error),
      });
      // The client only sees a generic message; details stay in the server log.
      return result.toUIMessageStreamResponse({ onError: () => STREAM_ERROR_MESSAGE });
    } catch (error) {
      console.error('[chat] failed to start', error);
      return serverError();
    }
  };
}

export const chatHandler = createChatHandler({
  hasKey: hasAnthropicKey,
  getModel: getChatModel,
  getTools: getChatTools,
});
