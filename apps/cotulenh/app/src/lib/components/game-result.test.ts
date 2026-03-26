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

  it('maps abandonment to winner and loser specific copy', () => {
    expect(
      getGameResultReasonKey({
        status: 'timeout',
        winner: 'blue',
        resultReason: 'abandonment',
        isLocalPlayerWinner: true
      })
    ).toBe('game.opponentAbandoned');

    expect(
      getGameResultReasonKey({
        status: 'timeout',
        winner: 'red',
        resultReason: 'abandonment',
        isLocalPlayerWinner: false
      })
    ).toBe('game.youAbandoned');
  });

  it('maps stale_cleanup to game aborted label', () => {
    expect(
      getGameResultReasonKey({
        status: 'aborted',
        winner: null,
        resultReason: 'stale_cleanup',
        isLocalPlayerWinner: false
      })
    ).toBe('game.gameStaleCleanup');
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
