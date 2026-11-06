import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChatInput } from './ChatInput';

function Harness({ onSend, onStop }: { onSend: (text: string) => void; onStop: () => void }) {
  const [isBusy, setIsBusy] = useState(false);
  return (
    <ChatInput
      isBusy={isBusy}
      onStop={onStop}
      onSend={(text) => {
        setIsBusy(true);
        onSend(text);
      }}
    />
  );
}

describe('ChatInput', () => {
  it('does not stop the answer when Send is double clicked', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const onStop = vi.fn();
    render(<Harness onSend={onSend} onStop={onStop} />);

    await user.type(screen.getByLabelText('Your question'), 'Hello');
    await user.dblClick(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledExactlyOnceWith('Hello');
    expect(onStop).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  });

  // jsdom doesn't reproduce the browser's timing, so this checks the cause: a reused node
  // becomes a submit button during the click on Stop, and Chrome then sends the draft.
  it('swaps Stop and Send as different DOM nodes', () => {
    const { rerender } = render(<ChatInput isBusy onSend={vi.fn()} onStop={vi.fn()} />);
    const stop = screen.getByRole('button', { name: 'Stop' });

    rerender(<ChatInput isBusy={false} onSend={vi.fn()} onStop={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Send' })).not.toBe(stop);
  });

  it('moves the focus to the input when Stop is clicked', () => {
    const inputRef = createRef<HTMLTextAreaElement>();
    render(<ChatInput isBusy inputRef={inputRef} onSend={vi.fn()} onStop={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }), { detail: 1 });

    expect(inputRef.current).toHaveFocus();
  });

  it('stops the answer from the keyboard, which reports no clicks', () => {
    const onStop = vi.fn();
    render(<ChatInput isBusy onSend={vi.fn()} onStop={onStop} />);

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }), { detail: 0 });

    expect(onStop).toHaveBeenCalledOnce();
  });

  it('does not send the draft when Stop is double clicked', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const { rerender } = render(<ChatInput isBusy={false} onSend={onSend} onStop={vi.fn()} />);

    await user.type(screen.getByLabelText('Your question'), 'Draft');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }), { detail: 2 });
    rerender(<ChatInput isBusy={false} onSend={onSend} onStop={vi.fn()} />);

    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Your question')).toHaveValue('Draft');
  });

  it('stops the answer on a separate click', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(<Harness onSend={vi.fn()} onStop={onStop} />);

    await user.type(screen.getByLabelText('Your question'), 'Hello{Enter}');
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }), { detail: 1 });

    expect(onStop).toHaveBeenCalledOnce();
  });
});
