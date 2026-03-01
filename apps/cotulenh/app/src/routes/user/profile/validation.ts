import { z } from 'zod';

export const displayNameSchema = z.object({
  displayName: z
    .string()
    .min(1, 'displayNameRequired')
    .min(3, 'displayNameMinLength')
    .max(50, 'displayNameMaxLength')
});

export type DisplayNameFormData = z.infer<typeof displayNameSchema>;
