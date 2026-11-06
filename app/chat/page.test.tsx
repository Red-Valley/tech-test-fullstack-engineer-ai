import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatPage from './page';

vi.mock('@/lib/games', () => ({ listGames: () => [] }));

const renderPage = async (ask: string | string[] | undefined) =>
  render(await ChatPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ ask }) }));

describe('ChatPage', () => {
  it('turns the ask param into a draft', async () => {
    await renderPage('Moss & Marrow');
    expect(screen.getByLabelText('Your question')).toHaveValue('Tell me about Moss & Marrow: its revenue, downloads and rating.');
  });

  it('starts empty when the param is not a valid title', async () => {
    await renderPage(['A', 'B']);
    expect(screen.getByLabelText('Your question')).toHaveValue('');
  });
});
