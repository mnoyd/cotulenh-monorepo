export type TournamentStatus = 'upcoming' | 'active' | 'completed';

export interface TournamentStanding {
  player_id: string;
  player_name: string;
  score: number;
  games_played: number;
}

export interface Tournament {
  id: string;
  title: string;
  time_control: string;
  start_time: string;
  duration_minutes: number;
  status: TournamentStatus;
  participant_count: number;
  standings: TournamentStanding[];
  current_round: number;
  created_at: string;
  updated_at: string;
}

export interface TournamentParticipant {
  tournament_id: string;
  user_id: string;
  joined_at: string;
  score: number;
  games_played: number;
}

export interface TournamentPairing {
  game_id: string;
  red_player: string;
  blue_player: string;
}
