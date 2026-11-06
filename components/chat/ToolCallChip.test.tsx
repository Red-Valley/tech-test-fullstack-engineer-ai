import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToolCallChip } from './ToolCallChip';

describe('ToolCallChip', () => {
  it.each(['input-streaming', 'input-available'] as const)('shows the call in progress while %s', (state) => {
    render(<ToolCallChip name="searchGames" state={state} input={{ limit: 1 }} isActive />);
    expect(screen.getByText('Querying searchGames…')).toBeInTheDocument();
  });

  it('shows the finished call', () => {
    render(<ToolCallChip name="searchGames" state="output-available" input={{ limit: 1 }} isActive />);
    expect(screen.getByText('searchGames')).toBeInTheDocument();
    expect(screen.queryByText(/Querying/)).not.toBeInTheDocument();
  });

  it('shows a failed call', () => {
    render(<ToolCallChip name="searchGames" state="output-error" input={{}} isActive={false} />);
    expect(screen.getByText('searchGames failed')).toBeInTheDocument();
  });

  it('does not keep spinning when the response was stopped during the call', () => {
    render(<ToolCallChip name="searchGames" state="input-available" input={{}} isActive={false} />);
    expect(screen.getByText('searchGames stopped')).toBeInTheDocument();
    expect(screen.queryByText(/Querying/)).not.toBeInTheDocument();
  });

  it('keeps the arguments collapsed until the user opens them', async () => {
    const user = userEvent.setup();
    render(<ToolCallChip name="searchGames" state="output-available" input={{ genre: 'Horror' }} isActive />);

    const details = screen.getByRole('group');
    expect(details).not.toHaveAttribute('open');

    await user.click(screen.getByText('searchGames'));

    expect(details).toHaveAttribute('open');
    expect(screen.getByText(/"genre": "Horror"/)).toBeVisible();
  });

  it.each([[{}], [undefined]])('has nothing to expand when the arguments are %j', (input) => {
    render(<ToolCallChip name="listGenres" state="output-available" input={input} isActive />);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByText('listGenres')).toBeInTheDocument();
  });
});
