import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from 'ai';
import { z } from 'zod';
import { ChatConfigError, jsonError, validationError, zodValidationError } from '@/lib/ai/errors';
import { getChatModel } from '@/lib/ai/model';
import { SYSTEM_PROMPT } from '@/lib/ai/prompt';
import { chatTools, type ChatUIMessage } from '@/lib/ai/tools';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_STEPS = 5;
// Enough for a table of 25 games plus commentary, without the provider's huge default.
const MAX_OUTPUT_TOKENS = 4096;
const STREAM_ERROR_MESSAGE = 'The assistant could not finish this answer. Please try again.';

const chatRequestSchema = z.object({
  // Clients never get to set the system prompt, so only these two roles are accepted.
  messages: z.array(z.looseObject({ role: z.enum(['user', 'assistant']) })).min(1).max(100),
});

const noAnswer = (id: string): ChatUIMessage => ({
  id,
  role: 'assistant',
  parts: [{ type: 'text', text: '[No answer: the request was stopped or failed]' }],
});

const hasText = (message: ChatUIMessage) => message.parts.some((part) => part.type === 'text' && part.text.trim() !== '');

// Sent as is, a request stopped before any text gets answered again, even when the prompt
// says not to. Deleting it would break a follow-up like "try again", so its turn is closed.
function closeUnansweredRequests(messages: ChatUIMessage[]): ChatUIMessage[] {
  return messages.flatMap((message, index) => {
    if (messages[index + 1]?.role !== 'user') return [message];
    if (message.role === 'user') return [message, noAnswer(`${message.id}-no-answer`)];
    return hasText(message) ? [message] : [noAnswer(message.id)];
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'INVALID_JSON', 'Body must be valid JSON');
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return zodValidationError(parsed.error);

  const validated = await safeValidateUIMessages<ChatUIMessage>({
    messages: parsed.data.messages,
    tools: chatTools,
  });
  if (!validated.success) {
    return validationError({ messages: ['Each message must be a valid UI message'] });
  }

  try {
    const result = streamText({
      model: getChatModel(),
      instructions: SYSTEM_PROMPT,
      // A response stopped during a tool call leaves a call without a result in the history.
      messages: await convertToModelMessages(closeUnansweredRequests(validated.data), {
        tools: chatTools,
        ignoreIncompleteToolCalls: true,
      }),
      tools: chatTools,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      stopWhen: isStepCount(MAX_STEPS),
      // Without this, a model still calling tools at the limit would end with no answer at all.
      prepareStep: ({ stepNumber }) => (stepNumber === MAX_STEPS - 1 ? { toolChoice: 'none' } : {}),
      abortSignal: req.signal,
      // Logged once, in the toUIMessageStream callback below.
      onError: () => {},
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        tools: chatTools,
        onError: (error) => {
          console.error('[chat] stream error', error);
          return STREAM_ERROR_MESSAGE;
        },
      }),
    });
  } catch (error) {
    if (error instanceof ChatConfigError) return jsonError(500, 'CONFIG_ERROR', error.message);
    console.error('[chat] request failed', error);
    return jsonError(500, 'INTERNAL', 'Something went wrong');
  }
}
