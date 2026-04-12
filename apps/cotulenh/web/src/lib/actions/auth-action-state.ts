type AuthFieldName = 'email' | 'password' | 'display_name' | 'confirm_password';

type AuthValues = Partial<Record<AuthFieldName, string>>;

type AuthFieldErrors = Partial<Record<AuthFieldName, string>>;

export type AuthActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: AuthFieldErrors;
  values?: AuthValues;
};

export const initialAuthActionState: AuthActionState = {
  success: false
};
