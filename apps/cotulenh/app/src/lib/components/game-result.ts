import type { GameEndResult } from '$lib/game/online-session-core';
import type { TranslationKey } from '$lib/i18n/types';

export function getGameResultReasonKey(result: GameEndResult): TranslationKey {
  switch (result.resultReason) {
    case 'checkmate':
      return 'game.resultCheckmate';
    case 'commander_captured':
      return 'game.resultCommanderCaptured';
    case 'stalemate':
      return 'game.resultStalemate';
    case 'resignation':
      return 'game.resultResign';
    case 'timeout':
      return 'game.resultTimeout';
    case 'dispute':
      return 'game.resultDispute';
    case 'draw_by_agreement':
    case 'mutual_agreement':
      return 'game.resultDrawAgreement';
    case 'disconnect_forfeit':
      return result.isLocalPlayerWinner
        ? 'game.opponentDisconnectForfeit'
        : 'game.disconnectForfeit';
    case 'abandonment':
      return result.isLocalPlayerWinner ? 'game.opponentAbandoned' : 'game.youAbandoned';
    case 'stale_cleanup':
      return 'game.gameStaleCleanup';
    default:
      return 'game.resultDraw';
  }
}
