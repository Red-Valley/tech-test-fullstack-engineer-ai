import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChatUIMessage } from '@/lib/ai/tools';
import { MessageList } from './MessageList';

const user = (text: string, id = 'u1'): ChatUIMessage => ({
  id,
  role: 'user',
  parts: [{ type: 'text', text }],
});

const assistant = (parts: ChatUIMessage['parts'], id = 'a1'): ChatUIMessage => ({ id, role: 'assistant', parts });

const text = (value: string): ChatUIMessage['parts'][number] => ({ type: 'text', text: value });

const searchCall: ChatUIMessage['parts'][number] = {
  type: 'tool-searchGames',
  toolCallId: 'c1',
  state: 'output-available',
  input: { limit: 1 },
  output: { results: [], note: 'No games matched' },
};

describe('MessageList', () => {
  it('renders user and assistant messages in order', () => {
    render(<MessageList messages={[user('Question'), assistant([text('Answer')])]} isBusy={false} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Question');
    expect(items[1]).toHaveTextContent('Answer');
  });

  it('renders a comparison from the assistant as a real table', () => {
    const table = '| Game | Revenue |\n| --- | --- |\n| Starfall | $100.00 |\n| Hollow | $50.00 |';
    render(<MessageList messages={[assistant([text(table)])]} isBusy={false} />);

    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByRole('cell', { name: '$100.00' })).toBeInTheDocument();
  });

  it('does not render raw HTML from the model', () => {
    render(<MessageList messages={[assistant([text('<img src=x onerror="alert(1)"> hello')])]} isBusy={false} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the text of the user literally, without markdown', () => {
    render(<MessageList messages={[user('**not bold**')]} isBusy={false} />);
    expect(screen.getByText('**not bold**')).toBeInTheDocument();
  });

  it('shows the tool call before the text that follows it', () => {
    render(<MessageList messages={[assistant([searchCall, text('No matches.')])]} isBusy={false} />);
    const bubble = screen.getByRole('listitem');
    expect(within(bubble).getByText('searchGames')).toBeInTheDocument();
    expect(bubble.textContent?.indexOf('searchGames')).toBeLessThan(bubble.textContent?.indexOf('No matches.') ?? -1);
  });

  it('marks a pending call as running only in the message being streamed', () => {
    const pending: ChatUIMessage['parts'][number] = {
      type: 'tool-listGenres',
      toolCallId: 'c2',
      state: 'input-available',
      input: {},
    };
    render(
      <MessageList
        messages={[assistant([pending], 'old'), user('Next'), assistant([{ ...pending, toolCallId: 'c3' }], 'new')]}
        isBusy
      />,
    );

    expect(screen.getByText('listGenres stopped')).toBeInTheDocument();
    expect(screen.getByText('Querying listGenres…')).toBeInTheDocument();
  });

  it('renders no empty bubble for a message that has only started', () => {
    render(<MessageList messages={[user('Hi'), assistant([{ type: 'step-start' }])]} isBusy />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('shows the thinking indicator while waiting, and not while text is arriving', () => {
    const { rerender } = render(<MessageList messages={[user('Hi')]} isBusy />);
    expect(screen.getByText('Thinking…')).toBeInTheDocument();

    rerender(<MessageList messages={[user('Hi'), assistant([searchCall])]} isBusy />);
    expect(screen.getByText('Thinking…')).toBeInTheDocument();

    rerender(<MessageList messages={[user('Hi'), assistant([searchCall, text('Par')])]} isBusy />);
    expect(screen.queryByText('Thinking…')).not.toBeInTheDocument();

    rerender(<MessageList messages={[user('Hi')]} isBusy={false} />);
    expect(screen.queryByText('Thinking…')).not.toBeInTheDocument();
  });

  it('announces new content politely to screen readers', () => {
    render(<MessageList messages={[]} isBusy={false} />);
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
  });
});
