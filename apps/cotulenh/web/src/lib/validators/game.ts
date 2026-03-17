import { z } from 'zod';

export const createGameSchema = z.object({
  invitationId: z.string().uuid('ID lời mời không hợp lệ')
});

export const invitationGameConfigSchema = z.object({
  timeMinutes: z.number().int().positive('Cấu hình thời gian không hợp lệ'),
  incrementSeconds: z.number().int().min(0, 'Cấu hình thời gian không hợp lệ'),
  isRated: z.boolean().optional()
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
