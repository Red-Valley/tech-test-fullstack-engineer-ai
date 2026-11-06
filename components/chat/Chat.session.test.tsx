import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { server } from '@/test/msw/server';
import { Chat } from './Chat';

const EVENTS = [
  { type: 'start' },
  { type: 'text-start', id: 't1' },
  { type: 'text-delta', id: 't1', delta: 'Starfall Tactics' },
  { type: 'text-end', id: 't1' },
  { type: 'finish' },
];

// In its own file because this test exercises the module-level session of Chat.
it('keeps the conversation when the page is left and opened again', async () => {
  const user = userEvent.setup();
  server.use(
    http.post('*/api/chat', () =>
      new HttpResponse(`${EVENTS.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')}data: [DONE]\n\n`, {
        headers: { 'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
      }),
    ),
  );

  const firstVisit = render(<Chat suggestedPrompts={['Which game made the most?']} />);
  await user.click(screen.getByRole('button', { name: 'Which game made the most?' }));
  expect(await screen.findByText('Starfall Tactics')).toBeInTheDocument();
  firstVisit.unmount();

  render(<Chat suggestedPrompts={['Which game made the most?']} />);
  expect(screen.getByText('Starfall Tactics')).toBeInTheDocument();
});
