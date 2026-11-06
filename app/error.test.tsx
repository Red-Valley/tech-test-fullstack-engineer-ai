import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ErrorPage from './error';

afterEach(() => vi.restoreAllMocks());

describe('error boundary', () => {
  it('logs the error, hides its details and retries on demand', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const retry = vi.fn();
    const failure = new Error('secret detail');

    render(<ErrorPage error={failure} retry={retry} />);

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.queryByText(/secret detail/)).not.toBeInTheDocument();
    expect(log).toHaveBeenCalledWith(failure);

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
