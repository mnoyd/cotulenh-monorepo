import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    password: z.string().min(1, 'passwordRequired').min(8, 'passwordMinLength'),
    confirmPassword: z.string().min(1, 'confirmPasswordRequired')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'passwordMismatch',
    path: ['confirmPassword']
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
