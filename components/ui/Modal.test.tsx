import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('gives focus back to the element that opened it', () => {
    render(<button>Open</button>);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();

    const modal = render(<Modal title="Title" onClose={vi.fn()}>Body</Modal>);
    screen.getByRole('dialog').focus();
    modal.unmount();

    expect(opener).toHaveFocus();
  });

  it('only accepts browser close requests while it is not busy', () => {
    const { rerender } = render(<Modal title="Title" onClose={vi.fn()}>Body</Modal>);
    expect(screen.getByRole('dialog')).toHaveAttribute('closedby', 'closerequest');

    rerender(<Modal title="Title" busy onClose={vi.fn()}>Body</Modal>);
    expect(screen.getByRole('dialog')).toHaveAttribute('closedby', 'none');
  });
});
