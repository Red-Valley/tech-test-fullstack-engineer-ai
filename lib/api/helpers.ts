import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { RepositoryError } from '@/lib/games/repository';

export interface FormattedZodIssue {
  path: string;
  message: string;
}

export function formatZodError(error: ZodError): FormattedZodIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '<root>',
    message: issue.message,
  }));
}

export function handleUnknownError(err: unknown): NextResponse {
  // request.json() throws SyntaxError on malformed JSON; surface as 400.
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (err instanceof RepositoryError) {
    const body: { error: string; details?: FormattedZodIssue[] } = {
      error: err.message,
    };
    if (err.cause instanceof ZodError) {
      body.details = formatZodError(err.cause);
    }
    return NextResponse.json(body, { status: 400 });
  }
  console.error(err);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 },
  );
}
