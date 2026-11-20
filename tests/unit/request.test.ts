import { describe, expect, it } from 'vitest';
import { parseId, parseJsonBody } from '@/server/http/request';
import { gameInputSchema } from '@/shared/schemas/game.schema';

describe('parseId', () => {
  it.each(['1', '26', '007'])('accepts %s', (raw) => {
    expect(parseId(raw)).toMatchObject({ ok: true });
  });

  it.each(['0', '-1', 'abc', '1.5', '0x1A', '1e1', ' 5 ', ''])('rejects "%s" with a 400', (raw) => {
    const result = parseId(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});

describe('parseJsonBody', () => {
  const post = (body: string) => new Request('http://test', { method: 'POST', body });

  it('rejects malformed JSON with a 400', async () => {
    const result = await parseJsonBody(post('{oops'), gameInputSchema);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(await result.response.json()).toEqual({ error: 'Request body must be valid JSON' });
  });

  it('rejects an invalid body with field errors', async () => {
    const result = await parseJsonBody(post('{"title":""}'), gameInputSchema);
    if (result.ok) throw new Error('expected failure');
    expect((await result.response.json()).fieldErrors).toHaveProperty('title');
  });
});
