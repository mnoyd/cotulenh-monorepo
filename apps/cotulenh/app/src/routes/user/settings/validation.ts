import { z } from 'zod';

export const emailUpdateSchema = z.object({
  email: z.string().min(1, 'emailRequired').email('emailInvalid')
});

export const passwordChangeSchema = z
  .object({
    newPassword: z.string().min(1, 'passwordRequired').min(8, 'passwordMinLength'),
    confirmPassword: z.string().min(1, 'confirmPasswordRequired')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'passwordMismatch',
    path: ['confirmPassword']
  });
