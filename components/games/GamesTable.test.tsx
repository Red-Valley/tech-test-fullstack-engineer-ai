import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { makeGame } from '@/test/game-factory';
import { GamesTable } from './GamesTable';

const games = [
  makeGame({ id: 1, title: 'Banana', genre: 'Puzzle', monthly_revenue_usd: 182500.5, monthly_downloads: 48210, average_rating: 4 }),
  makeGame({ id: 2, title: 'apple', genre: 'Horror', monthly_revenue_usd: 10, monthly_downloads: 3000, average_rating: 4.66 }),
  makeGame({ id: 3, title: 'Cherry', genre: 'puzzle', monthly_revenue_usd: 500, monthly_downloads: 1, average_rating: 1 }),
];
const genres = ['Horror', 'Puzzle'];

const shownTitles = () =>
  screen
    .getAllByRole('rowheader')
    .map((cell) => cell.textContent);

describe('GamesTable', () => {
  it('lists the games with formatted values', () => {
    render(<GamesTable games={games} genres={genres} />);
    const row = screen.getByRole('row', { name: /Banana/ });
    expect(within(row).getByText('$182,500.50')).toBeInTheDocument();
    expect(within(row).getByText('48,210')).toBeInTheDocument();
    expect(within(row).getByText('★ 4.0')).toBeInTheDocument();
    expect(shownTitles()).toEqual(['Banana', 'apple', 'Cherry']);
  });

  it('shows the empty state when there are no games, and still allows adding one', async () => {
    const user = userEvent.setup();
    render(<GamesTable games={[]} genres={[]} />);
    expect(screen.getByText('No games yet. Create the first one.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add game' }));
    expect(screen.getByRole('dialog', { name: 'Add game' })).toBeInTheDocument();
  });

  describe('filters', () => {
    it('searches by title ignoring case and surrounding spaces', async () => {
      const user = userEvent.setup();
      render(<GamesTable games={games} genres={genres} />);
      await user.type(screen.getByLabelText('Search by title'), ' CHER ');
      expect(shownTitles()).toEqual(['Cherry']);
    });

    it('filters by genre ignoring case', async () => {
      const user = userEvent.setup();
      render(<GamesTable games={games} genres={genres} />);
      await user.selectOptions(screen.getByLabelText('Genre'), 'Puzzle');
      expect(shownTitles()).toEqual(['Banana', 'Cherry']);
    });

    it('combines search and genre', async () => {
      const user = userEvent.setup();
      render(<GamesTable games={games} genres={genres} />);
      await user.selectOptions(screen.getByLabelText('Genre'), 'Puzzle');
      await user.type(screen.getByLabelText('Search by title'), 'ban');
      expect(shownTitles()).toEqual(['Banana']);
    });

    it('offers a way out when no game matches', async () => {
      const user = userEvent.setup();
      render(<GamesTable games={games} genres={genres} />);
      await user.type(screen.getByLabelText('Search by title'), 'zzz');
      expect(screen.getByText('No games match your filters.')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Clear filters' }));

      expect(shownTitles()).toHaveLength(3);
      expect(screen.getByLabelText('Search by title')).toHaveValue('');
    });

    it('drops the genre filter when that genre disappears from the catalog', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GamesTable games={games} genres={genres} />);
      await user.selectOptions(screen.getByLabelText('Genre'), 'Horror');
      expect(shownTitles()).toEqual(['apple']);

      rerender(<GamesTable games={games.filter((game) => game.genre !== 'Horror')} genres={['Puzzle']} />);

      expect(screen.getByLabelText('Genre')).toHaveValue('');
      expect(shownTitles()).toEqual(['Banana', 'Cherry']);
    });
  });

  describe('sorting', () => {
    it.each([
      ['Revenue', ['Banana', 'Cherry', 'apple']],
      ['Downloads', ['Banana', 'apple', 'Cherry']],
      ['Rating', ['apple', 'Banana', 'Cherry']],
    ])('sorts by %s, biggest first, then in the other direction', async (name, descending) => {
      const user = userEvent.setup();
      render(<GamesTable games={games} genres={genres} />);
      const button = screen.getByRole('button', { name });

      await user.click(button);
      expect(shownTitles()).toEqual(descending);
      expect(screen.getByRole('columnheader', { name })).toHaveAttribute('aria-sort', 'descending');

      await user.click(button);
      expect(shownTitles()).toEqual([...descending].reverse());
      expect(screen.getByRole('columnheader', { name })).toHaveAttribute('aria-sort', 'ascending');
    });

    it('sorts titles A to Z first, ignoring case', async () => {
      const user = userEvent.setup();
      render(<GamesTable games={games} genres={genres} />);
      await user.click(screen.getByRole('button', { name: 'Title' }));
      expect(shownTitles()).toEqual(['apple', 'Banana', 'Cherry']);
    });

    it('marks only the active column', async () => {
      const user = userEvent.setup();
      render(<GamesTable games={games} genres={genres} />);
      await user.click(screen.getByRole('button', { name: 'Revenue' }));
      await user.click(screen.getByRole('button', { name: 'Rating' }));
      expect(screen.getByRole('columnheader', { name: 'Revenue' })).not.toHaveAttribute('aria-sort');
    });

    it('does not reorder the games prop', async () => {
      const user = userEvent.setup();
      const input = [...games];
      render(<GamesTable games={input} genres={genres} />);
      await user.click(screen.getByRole('button', { name: 'Revenue' }));
      expect(input.map((game) => game.id)).toEqual([1, 2, 3]);
    });
  });

  describe('dialogs', () => {
    it('opens an empty form to add a game', async () => {
      const user = userEvent.setup();
      render(<GamesTable games={games} genres={genres} />);
      await user.click(screen.getByRole('button', { name: 'Add game' }));
      const dialog = screen.getByRole('dialog', { name: 'Add game' });
      expect(within(dialog).getByLabelText('Title')).toHaveValue('');
    });

    it('opens the form with the values of the chosen game', async () => {
      const user = userEvent.setup();
      render(<GamesTable games={games} genres={genres} />);
      await user.click(screen.getByRole('button', { name: 'Edit Cherry' }));
      const dialog = screen.getByRole('dialog', { name: 'Edit Cherry' });
      expect(within(dialog).getByLabelText('Title')).toHaveValue('Cherry');
    });

    it('does not keep edits from an abandoned form', async () => {
      const user = userEvent.setup();
      render(<GamesTable games={games} genres={genres} />);
      await user.click(screen.getByRole('button', { name: 'Edit Cherry' }));
      await user.type(screen.getByRole('textbox', { name: 'Title' }), ' draft');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await user.click(screen.getByRole('button', { name: 'Edit Cherry' }));
      expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Cherry');
    });

    it('asks for confirmation from the row', async () => {
      const user = userEvent.setup();
      render(<GamesTable games={games} genres={genres} />);
      await user.click(screen.getByRole('button', { name: 'Delete apple' }));
      expect(screen.getByRole('dialog', { name: 'Delete apple?' })).toBeInTheDocument();
    });
  });
});
