import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { jsonError, readJson, validationError, withErrorEnvelope } from './http';

afterEach(() => vi.restoreAllMocks());

const postBody = (body: string) => new Request('http://test/', { method: 'POST', body });

describe('jsonError', () => {
  it('builds the envelope without issues when there are none', async () => {
    const res = jsonError(404, 'NOT_FOUND', 'Nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Nope' } });
  });
});

describe('validationError', () => {
  it('maps field errors to issues', async () => {
    const result = z.object({ a: z.number() }).safeParse({ a: 'x' });
    if (result.success) throw new Error('expected a failure');
    const res = validationError(result.error);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      issues: { a: [expect.any(String)] },
    });
  });

  it('surfaces errors without a field as the message', async () => {
    const result = z.object({}).refine(() => false, { message: 'Whole body is wrong' }).safeParse({});
    if (result.success) throw new Error('expected a failure');
    expect((await validationError(result.error).json()).error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Whole body is wrong',
      issues: {},
    });
  });
});

describe('readJson', () => {
  it('parses valid JSON', async () => {
    expect(await readJson(postBody('{"a":1}'))).toEqual({ a: 1 });
  });

  it.each(['{bad', ''])('returns null for the malformed body %j', async (body) => {
    expect(await readJson(postBody(body))).toBeNull();
  });
});

describe('withErrorEnvelope', () => {
  it('passes responses through', async () => {
    const res = await withErrorEnvelope(() => new Response(null, { status: 204 }))();
    expect(res.status).toBe(204);
  });

  it('hides thrown details behind INTERNAL and logs them', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('SqliteError: secret table detail');
    const res = await withErrorEnvelope(() => {
      throw failure;
    })();

    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
    expect(text).not.toContain('secret');
    expect(log).toHaveBeenCalledWith(expect.any(String), failure);
  });

  it('catches rejected promises too', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await withErrorEnvelope(async () => {
      throw new Error('boom');
    })();
    expect(res.status).toBe(500);
  });
});
