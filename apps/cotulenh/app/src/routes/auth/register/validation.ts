import { z } from 'zod';
import { displayNameFieldSchema } from '$lib/validation/display-name';

export const registerSchema = z.object({
  email: z.string().min(1, 'emailRequired').email('emailInvalid'),
  password: z.string().min(1, 'passwordRequired').min(8, 'passwordMinLength'),
  displayName: displayNameFieldSchema
});

export type RegisterFormData = z.infer<typeof registerSchema>;
