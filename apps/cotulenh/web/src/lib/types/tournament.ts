export type TournamentStatus = 'upcoming' | 'active' | 'completed';

export interface Tournament {
  id: string;
  title: string;
  time_control: string;
  start_time: string;
  duration_minutes: number;
  status: TournamentStatus;
  participant_count: number;
  standings: unknown[];
  created_at: string;
  updated_at: string;
}

export interface TournamentParticipant {
  tournament_id: string;
  user_id: string;
  joined_at: string;
}
