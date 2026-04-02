import { z } from 'zod';

export const tournamentIdSchema = z.object({
  tournamentId: z.string().uuid('ID giải đấu không hợp lệ')
});

export const tournamentPairActionSchema = z.object({
  tournament_id: z.string().uuid('ID giai dau khong hop le'),
  action: z.enum(['start_tournament', 'pair_next_round'])
});

export type TournamentIdInput = z.infer<typeof tournamentIdSchema>;
export type TournamentPairActionInput = z.infer<typeof tournamentPairActionSchema>;
