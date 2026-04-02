import { z } from 'zod';

export const tournamentIdSchema = z.object({
  tournamentId: z.string().uuid('ID giải đấu không hợp lệ')
});

export type TournamentIdInput = z.infer<typeof tournamentIdSchema>;
