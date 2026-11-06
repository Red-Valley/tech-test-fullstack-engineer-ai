import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DefaultChatTransport, type ChatTransport, type UIMessageChunk } from 'ai';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { ChatUIMessage } from '@/lib/ai/tools';
import { server } from '@/test/msw/server';
import { Chat } from './Chat';

const PROMPTS = ['Which game made the most revenue last month?', 'How many games are rated above 4?', 'Compare A vs B.'];

/** Lets each test decide what the server streams and when; useChat itself is the real one. */
function makeTransport() {
  const requests: {
    messages: ChatUIMessage[];
    signal: AbortSignal | undefined;
    controller: ReadableStreamDefaultController<UIMessageChunk>;
  }[] = [];

  const transport: ChatTransport<ChatUIMessage> = {
    sendMessages: async ({ messages, abortSignal }) =>
      new ReadableStream<UIMessageChunk>({
        start(controller) {
          requests.push({ messages, signal: abortSignal, controller });
          abortSignal?.addEventListener('abort', () => {
            controller.error(new DOMException('Aborted', 'AbortError'));
          });
        },
      }),
    reconnectToStream: async () => null,
  };

  const emit = async (...chunks: UIMessageChunk[]) => {
    await act(async () => {
      for (const chunk of chunks) requests.at(-1)?.controller.enqueue(chunk);
    });
  };
  const finish = async () => {
    await emit({ type: 'finish' });
    await act(async () => requests.at(-1)?.controller.close());
  };

  return { transport, requests, emit, finish };
}

function setup() {
  const fake = makeTransport();
  const user = userEvent.setup();
  render(<Chat suggestedPrompts={PROMPTS} transport={fake.transport} />);
  return { ...fake, user, input: screen.getByRole('textbox', { name: 'Your question' }) };
}

describe('Chat', () => {
  describe('suggested prompts', () => {
    it('shows the prompts until there are messages, and sends one with a click', async () => {
      const { user, requests } = setup();
      expect(screen.getAllByRole('button', { name: /game|games|Compare/ })).toHaveLength(3);

      await user.click(screen.getByRole('button', { name: PROMPTS[1] }));

      await waitFor(() => expect(requests).toHaveLength(1));
      expect(requests[0]?.messages.at(-1)?.parts).toEqual([{ type: 'text', text: PROMPTS[1] }]);
      expect(screen.queryByRole('region', { name: 'Suggested questions' })).not.toBeInTheDocument();
      expect(screen.getByText(PROMPTS[1] as string)).toBeInTheDocument();
    });
  });

  describe('focus', () => {
    it('returns to the input after a suggested prompt, so the next question can be typed', async () => {
      const { user, input, requests } = setup();
      await user.click(screen.getByRole('button', { name: PROMPTS[1] }));
      await waitFor(() => expect(requests).toHaveLength(1));
      expect(input).toHaveFocus();
    });
  });

  describe('new chat', () => {
    it('is hidden until a response ends, then clears the conversation', async () => {
      const { user, input, requests, finish } = setup();
      expect(screen.queryByRole('button', { name: 'New chat' })).not.toBeInTheDocument();

      await user.type(input, 'Hello{Enter}');
      await waitFor(() => expect(requests).toHaveLength(1));
      expect(screen.queryByRole('button', { name: 'New chat' })).not.toBeInTheDocument();
      await finish();

      await user.click(await screen.findByRole('button', { name: 'New chat' }));

      expect(screen.queryByText('Hello')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: PROMPTS[0] })).toBeInTheDocument();
      expect(input).toHaveFocus();
    });
  });

  describe('input', () => {
    it('sends on Enter and clears the box', async () => {
      const { user, input, requests } = setup();
      await user.type(input, 'Hello{Enter}');
      await waitFor(() => expect(requests).toHaveLength(1));
      expect(input).toHaveValue('');
    });

    it('adds a line on Shift+Enter without sending', async () => {
      const { user, input, requests } = setup();
      await user.type(input, 'one{Shift>}{Enter}{/Shift}two');
      expect(input).toHaveValue('one\ntwo');
      expect(requests).toHaveLength(0);
    });

    it('does not send a blank message', async () => {
      const { user, input, requests } = setup();
      await user.type(input, '   {Enter}');
      expect(requests).toHaveLength(0);
      expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    });

    it('does not send a second message while a response is in progress, and keeps the draft', async () => {
      const { user, input, requests } = setup();
      await user.type(input, 'First{Enter}');
      await waitFor(() => expect(requests).toHaveLength(1));

      await user.type(input, 'Second{Enter}');

      expect(requests).toHaveLength(1);
      expect(input).toHaveValue('Second');
      expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    });
  });

  describe('streaming', () => {
    it('shows the text as it arrives', async () => {
      const { user, input, requests, emit, finish } = setup();
      await user.type(input, 'Hi{Enter}');
      await waitFor(() => expect(requests).toHaveLength(1));
      expect(await screen.findByText('Thinking…')).toBeInTheDocument();

      await emit({ type: 'start', messageId: 'a1' }, { type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'Hel' });
      expect(await screen.findByText('Hel')).toBeInTheDocument();
      expect(screen.queryByText('Thinking…')).not.toBeInTheDocument();

      await emit({ type: 'text-delta', id: 't', delta: 'lo there' });
      expect(await screen.findByText('Hello there')).toBeInTheDocument();

      await emit({ type: 'text-end', id: 't' });
      await finish();
      expect(await screen.findByRole('button', { name: 'Send' })).toBeInTheDocument();
    });

    it('shows a tool call running, then done, then the answer', async () => {
      const { user, input, requests, emit, finish } = setup();
      await user.type(input, 'Top game?{Enter}');
      await waitFor(() => expect(requests).toHaveLength(1));

      await emit(
        { type: 'start', messageId: 'a1' },
        { type: 'start-step' },
        { type: 'tool-input-start', toolCallId: 'c1', toolName: 'searchGames' },
        { type: 'tool-input-available', toolCallId: 'c1', toolName: 'searchGames', input: { limit: 1 } },
      );
      expect(await screen.findByText('Querying searchGames…')).toBeInTheDocument();

      await emit(
        { type: 'tool-output-available', toolCallId: 'c1', output: { results: [], note: 'No games matched' } },
        { type: 'finish-step' },
      );
      expect(await screen.findByText('searchGames')).toBeInTheDocument();

      await emit(
        { type: 'start-step' },
        { type: 'text-start', id: 't' },
        { type: 'text-delta', id: 't', delta: 'No games matched.' },
        { type: 'text-end', id: 't' },
        { type: 'finish-step' },
      );
      await finish();
      expect(await screen.findByText('No games matched.')).toBeInTheDocument();
    });

    it('keeps following the stream unless the user scrolled up', async () => {
      const { user, input, requests, emit } = setup();
      await user.type(input, 'Hi{Enter}');
      await waitFor(() => expect(requests).toHaveLength(1));

      const scroller = screen.getByRole('log').parentElement as HTMLElement;
      Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 1000 });
      Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 100 });

      await emit({ type: 'start', messageId: 'a1' }, { type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'A' });
      await screen.findByText('A');
      expect(scroller.scrollTop).toBe(1000);

      scroller.scrollTop = 100;
      scroller.dispatchEvent(new Event('scroll', { bubbles: true }));

      await emit({ type: 'text-delta', id: 't', delta: 'B' });
      await screen.findByText('AB');
      expect(scroller.scrollTop).toBe(100);
    });
  });

  describe('stop', () => {
    it('aborts the request, keeps the partial text and allows sending again', async () => {
      const { user, input, requests, emit } = setup();
      await user.type(input, 'Hi{Enter}');
      await waitFor(() => expect(requests).toHaveLength(1));
      await emit({ type: 'start', messageId: 'a1' }, { type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'Partial' });
      await screen.findByText('Partial');

      await user.click(screen.getByRole('button', { name: 'Stop' }));

      await screen.findByRole('button', { name: 'Send' });
      expect(requests[0]?.signal?.aborted).toBe(true);
      expect(screen.getByText('Partial')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      await user.type(input, 'Again{Enter}');
      await waitFor(() => expect(requests).toHaveLength(2));
    });

    it('does not leave a tool chip spinning after Stop', async () => {
      const { user, input, requests, emit } = setup();
      await user.type(input, 'Hi{Enter}');
      await waitFor(() => expect(requests).toHaveLength(1));
      await emit(
        { type: 'start', messageId: 'a1' },
        { type: 'tool-input-available', toolCallId: 'c1', toolName: 'listGenres', input: {} },
      );
      await screen.findByText('Querying listGenres…');

      await user.click(screen.getByRole('button', { name: 'Stop' }));

      expect(await screen.findByText('listGenres stopped')).toBeInTheDocument();
    });
  });

  describe('errors', () => {
    it('shows a generic banner for an error in the stream and retries the request', async () => {
      const { user, input, requests, emit, finish } = setup();
      await user.type(input, 'Hi{Enter}');
      await waitFor(() => expect(requests).toHaveLength(1));

      await emit({ type: 'start', messageId: 'a1' }, { type: 'error', errorText: 'stack trace at /srv/secret' });

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Something went wrong. Please try again.');
      expect(alert).not.toHaveTextContent('secret');

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await waitFor(() => expect(requests).toHaveLength(2));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(requests[1]?.messages.map((message) => message.role)).toEqual(['user']);

      await emit({ type: 'start', messageId: 'a2' }, { type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'Recovered' }, { type: 'text-end', id: 't' });
      await finish();
      expect(await screen.findByText('Recovered')).toBeInTheDocument();
    });

    it('does not crash when the transport itself rejects', async () => {
      const onSend = vi.fn().mockRejectedValue(new Error('network down at 10.0.0.1'));
      const user = userEvent.setup();
      render(
        <Chat suggestedPrompts={PROMPTS} transport={{ sendMessages: onSend, reconnectToStream: async () => null }} />,
      );

      await user.click(screen.getByRole('button', { name: PROMPTS[0] }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
    });
  });

  describe('with the real HTTP transport', () => {
    const API = 'http://localhost:3000/api/chat';
    const realTransport = () => new DefaultChatTransport<ChatUIMessage>({ api: API });

    const sse = (...events: object[]) =>
      new HttpResponse(`${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')}data: [DONE]\n\n`, {
        headers: { 'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
      });

    it('shows the CONFIG_ERROR message from the API, and Retry recovers once it is fixed', async () => {
      let bodies = 0;
      server.use(
        http.post(API, async ({ request }) => {
          bodies += 1;
          const body = (await request.json()) as { messages: unknown[] };
          expect(body.messages).toHaveLength(1);
          if (bodies === 1) {
            return HttpResponse.json(
              { error: { code: 'CONFIG_ERROR', message: 'Set OPENAI_API_KEY in .env.local' } },
              { status: 500 },
            );
          }
          return sse(
            { type: 'start', messageId: 'a1' },
            { type: 'text-start', id: 't' },
            { type: 'text-delta', id: 't', delta: 'It works' },
            { type: 'text-end', id: 't' },
            { type: 'finish' },
          );
        }),
      );
      const user = userEvent.setup();
      render(<Chat suggestedPrompts={PROMPTS} transport={realTransport()} />);

      await user.click(screen.getByRole('button', { name: PROMPTS[0] }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Set OPENAI_API_KEY in .env.local');

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      expect(await screen.findByText('It works')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('falls back to the generic message when the body is not our envelope', async () => {
      server.use(http.post(API, () => new HttpResponse('<html>Bad gateway</html>', { status: 502 })));
      const user = userEvent.setup();
      render(<Chat suggestedPrompts={PROMPTS} transport={realTransport()} />);

      await user.click(screen.getByRole('button', { name: PROMPTS[0] }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Something went wrong. Please try again.');
      expect(alert).not.toHaveTextContent('Bad gateway');
    });
  });
});
