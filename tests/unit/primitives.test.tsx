import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from '@/client/ui/components/primitives/button';
import { EmptyState, Spinner } from '@/client/ui/components/primitives/feedback';
import { Input } from '@/client/ui/components/primitives/input';
import { Select } from '@/client/ui/components/primitives/select';

// Static rendering checks the accessibility wiring (§4.6) without a browser or extra deps.
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe('Input', () => {
  it('links the label to the input', () => {
    const markup = html(<Input id="title" label="Title" />);
    expect(markup).toContain('<label for="title"');
    expect(markup).toContain('id="title"');
  });

  it('marks an invalid field and points it at the error text', () => {
    const markup = html(<Input id="title" label="Title" error="Title is required" />);
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="title-error"');
    expect(markup).toMatch(/id="title-error" role="alert"[^>]*>Title is required/);
  });

  it('has no aria-invalid when valid', () => {
    expect(html(<Input id="t" label="T" />)).not.toContain('aria-invalid');
  });
});

describe('Select', () => {
  it('renders the placeholder as an empty first option, then the options', () => {
    const markup = html(
      <Select id="genre" label="Genre" placeholder="Choose…" options={['Puzzle', 'RPG']} />,
    );
    expect(markup).toMatch(/<option value="">Choose…<\/option><option value="Puzzle">/);
  });
});

describe('Button', () => {
  it('defaults to type="button" so it never submits a form by accident', () => {
    expect(html(<Button>Save</Button>)).toContain('type="button"');
  });

  it('keeps a visible focus ring', () => {
    expect(html(<Button>Save</Button>)).toContain('focus-visible:ring-2');
  });
});

describe('feedback', () => {
  it('Spinner announces itself to screen readers', () => {
    expect(html(<Spinner label="Loading games" />)).toMatch(/role="status".*Loading games/);
  });

  it('EmptyState in error tone is an alert', () => {
    expect(html(<EmptyState tone="error" title="Could not load games" />)).toContain(
      'role="alert"',
    );
  });
});
