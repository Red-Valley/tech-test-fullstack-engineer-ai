import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatsCards } from './StatsCards';

const valueOf = (label: string) => screen.getByText(label).nextElementSibling;

describe('StatsCards', () => {
  it('shows the KPIs formatted', () => {
    render(<StatsCards stats={{ count: 1234, total_revenue_usd: 182500.5, avg_revenue_usd: 1, total_downloads: 48210, avg_rating: 4.26 }} />);
    expect(valueOf('Total games')).toHaveTextContent('1,234');
    expect(valueOf('Total revenue')).toHaveTextContent('$182,500.50');
    expect(valueOf('Total downloads')).toHaveTextContent('48,210');
    expect(valueOf('Average rating')).toHaveTextContent('★ 4.3');
  });

  it('shows a dash instead of a 0.0 rating for an empty catalog', () => {
    render(<StatsCards stats={{ count: 0, total_revenue_usd: 0, avg_revenue_usd: 0, total_downloads: 0, avg_rating: 0 }} />);
    expect(valueOf('Average rating')).toHaveTextContent('—');
    expect(valueOf('Total revenue')).toHaveTextContent('$0.00');
  });
});
