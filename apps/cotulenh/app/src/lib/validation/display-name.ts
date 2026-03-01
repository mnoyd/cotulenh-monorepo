import { z } from 'zod';

const DISPLAY_NAME_BLOCKED_CHARS = /[<>]|[\u0000-\u001F\u007F]/u;

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export const displayNameFieldSchema = z.preprocess(
  (value) => (typeof value === 'string' ? normalizeWhitespace(value) : value),
  z
    .string()
    .min(1, 'displayNameRequired')
    .min(3, 'displayNameMinLength')
    .max(50, 'displayNameMaxLength')
    .refine((value) => !DISPLAY_NAME_BLOCKED_CHARS.test(value), 'displayNameInvalidChars')
);
