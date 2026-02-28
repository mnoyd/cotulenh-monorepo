import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().min(1, 'emailRequired').email('emailInvalid'),
  password: z.string().min(1, 'passwordRequired').min(8, 'passwordMinLength'),
  displayName: z
    .string()
    .min(1, 'displayNameRequired')
    .min(3, 'displayNameMinLength')
    .max(50, 'displayNameMaxLength')
});

export type RegisterFormData = z.infer<typeof registerSchema>;
