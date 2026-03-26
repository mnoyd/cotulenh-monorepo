import { describe, expect, it } from 'vitest';
import { load } from './+page';

describe('play route load', () => {
  it('redirects standard play navigation to the online lobby', async () => {
    await expect(
      load({
        url: new URL('http://localhost/play?timeMinutes=5&incrementSeconds=0')
      } as never)
    ).rejects.toEqual(
      expect.objectContaining({
        status: 307,
        location: '/play/online?timeMinutes=5&incrementSeconds=0'
      })
    );
  });

  it('preserves the board-editor fen entrypoint', async () => {
    await expect(
      load({
        url: new URL('http://localhost/play?fen=test-fen')
      } as never)
    ).resolves.toEqual({});
  });
});
