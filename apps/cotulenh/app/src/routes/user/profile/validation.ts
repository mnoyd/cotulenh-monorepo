import { z } from 'zod';
import { displayNameFieldSchema } from '$lib/validation/display-name';

export const displayNameSchema = z.object({
  displayName: displayNameFieldSchema
});

export type DisplayNameFormData = z.infer<typeof displayNameSchema>;
