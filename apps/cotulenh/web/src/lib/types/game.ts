export type GameStatus =
  | 'started'
  | 'aborted'
  | 'checkmate'
  | 'resign'
  | 'timeout'
  | 'stalemate'
  | 'draw'
  | 'dispute';

export type GamePhase = 'deploying' | 'playing';

export type PendingActionData =
  | { type: 'draw_offer'; color: 'red' | 'blue'; created_at: string }
  | {
      type: 'takeback_request';
      color: 'red' | 'blue';
      move_count: number;
      created_at: string;
    }
  | { type: 'rematch_offer'; color: 'red' | 'blue'; created_at: string };

export interface PlayerInfo {
  id: string;
  display_name: string;
  rating: number;
  rating_games_played?: number;
}

export interface GameStateData {
  move_history: string[];
  fen: string;
  phase: GamePhase;
  clocks: { red: number; blue: number };
  pending_action: PendingActionData | null;
}

export interface GameData {
  id: string;
  status: GameStatus;
  red_player: PlayerInfo;
  blue_player: PlayerInfo;
  my_color: 'red' | 'blue';
  is_rated: boolean;
  created_at: string;
  winner: 'red' | 'blue' | null;
  result_reason: string | null;
  game_state: GameStateData;
}
