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

export interface PlayerInfo {
  id: string;
  display_name: string;
  rating: number;
}

export interface GameStateData {
  move_history: string[];
  fen: string;
  phase: GamePhase;
  clocks: { red: number; blue: number };
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
