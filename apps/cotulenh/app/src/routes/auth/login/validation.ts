import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'emailRequired').email('emailInvalid'),
  password: z.string().min(1, 'passwordRequired')
});

export type LoginFormData = z.infer<typeof loginSchema>;
