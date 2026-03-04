import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'emailRequired').email('emailInvalid')
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
