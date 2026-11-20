import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError } from '@/server/http/errors';
import { errorResponse, noContent } from '@/server/http/responses';
import { gameInputSchema } from '@/shared/schemas/game.schema';

afterEach(() => vi.restoreAllMocks());

const read = async (response: Response) => ({
  status: response.status,
  body: await response.json(),
});

describe('errorResponse', () => {
  it('maps NotFoundError to 404', async () => {
    expect(await read(errorResponse(new NotFoundError('Game 9 not found')))).toEqual({
      status: 404,
      body: { error: 'Game 9 not found' },
    });
  });

  it('maps ConflictError to 409', async () => {
    expect((await read(errorResponse(new ConflictError('dup')))).status).toBe(409);
  });

  it('maps a ZodError to 400 with field errors', async () => {
    const result = gameInputSchema.safeParse({ title: '' });
    if (result.success) throw new Error('expected a validation error');
    const { status, body } = await read(errorResponse(result.error));
    expect(status).toBe(400);
    expect(body.error).toBe('Invalid request');
    expect(Object.keys(body.fieldErrors)).toContain('title');
  });

  it('turns anything else into a 500 that does not leak the message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { status, body } = await read(errorResponse(new Error('SQLITE_BUSY at /secret/path')));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(console.error).toHaveBeenCalled();
  });
});

describe('noContent', () => {
  it('is a 204 with an empty body', async () => {
    const response = noContent();
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
});
