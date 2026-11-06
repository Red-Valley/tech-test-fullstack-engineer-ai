import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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

  it('stops the answer on a separate click', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(<Harness onSend={vi.fn()} onStop={onStop} />);

    await user.type(screen.getByLabelText('Your question'), 'Hello{Enter}');
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }), { detail: 1 });

    expect(onStop).toHaveBeenCalledOnce();
  });
});
