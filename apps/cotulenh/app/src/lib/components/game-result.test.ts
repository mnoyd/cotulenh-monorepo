import { describe, expect, it } from 'vitest';
import { getGameResultReasonKey } from './game-result';

describe('getGameResultReasonKey', () => {
  it('maps disconnect forfeits to winner and loser specific copy', () => {
    expect(
      getGameResultReasonKey({
        status: 'timeout',
        winner: 'red',
        resultReason: 'disconnect_forfeit',
        isLocalPlayerWinner: true
      })
    ).toBe('game.opponentDisconnectForfeit');

    expect(
      getGameResultReasonKey({
        status: 'timeout',
        winner: 'blue',
        resultReason: 'disconnect_forfeit',
        isLocalPlayerWinner: false
      })
    ).toBe('game.disconnectForfeit');
  });

  it('maps persisted mutual agreement results to the draw agreement label', () => {
    expect(
      getGameResultReasonKey({
        status: 'draw',
        winner: null,
        resultReason: 'mutual_agreement',
        isLocalPlayerWinner: false
      })
    ).toBe('game.resultDrawAgreement');
  });
});
