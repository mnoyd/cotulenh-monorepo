import { z } from 'zod';

const emailSchema = z.string().trim().min(1, 'Email không hợp lệ').email('Email không hợp lệ');

const signupPasswordSchema = z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự');

const loginPasswordSchema = z.string().min(1, 'Vui lòng nhập mật khẩu');

const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Tên hiển thị không được để trống')
  .max(30, 'Tên hiển thị tối đa 30 ký tự');

export const signupSchema = z.object({
  email: emailSchema,
  password: signupPasswordSchema,
  display_name: displayNameSchema
});

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
