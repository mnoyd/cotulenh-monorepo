import { fail, redirect } from '@sveltejs/kit';
import { logger } from '@cotulenh/common';
import { SettingsSchema } from '$lib/stores/settings';
import { emailUpdateSchema, passwordChangeSchema } from './validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
  const { user } = await safeGetSession();
  if (!user) {
    redirect(303, '/auth/login');
  }

  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();

  const { data: profileData } = await supabase
    .from('profiles')
    .select('settings_json')
    .eq('id', user.id)
    .single();

  return {
    email: authUser?.email ?? '',
    settingsJson: profileData?.settings_json ?? {}
  };
};

export const actions: Actions = {
  updateEmail: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, { errors: { form: 'unauthorized' }, action: 'updateEmail' as const });
    }

    const formData = await request.formData();
    const newEmail = String(formData.get('email') ?? '');

    const result = emailUpdateSchema.safeParse({ email: newEmail });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      return fail(400, { errors: fieldErrors, email: newEmail, action: 'updateEmail' as const });
    }

    const { error } = await supabase.auth.updateUser({ email: result.data.email });
    if (error) {
      logger.error(new Error(error.message), 'Failed to update email');
      return fail(500, {
        errors: { form: 'emailUpdateFailed' },
        email: result.data.email,
        action: 'updateEmail' as const
      });
    }

    return { success: true, action: 'updateEmail' as const };
  },

  updatePassword: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, { errors: { form: 'unauthorized' }, action: 'updatePassword' as const });
    }

    const formData = await request.formData();
    const newPassword = String(formData.get('newPassword') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    const result = passwordChangeSchema.safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      return fail(400, { errors: fieldErrors, action: 'updatePassword' as const });
    }

    const { error } = await supabase.auth.updateUser({ password: result.data.newPassword });
    if (error) {
      logger.error(new Error(error.message), 'Failed to update password');
      return fail(500, {
        errors: { form: 'passwordUpdateFailed' },
        action: 'updatePassword' as const
      });
    }

    return { success: true, action: 'updatePassword' as const };
  },

  updateSettings: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, { errors: { form: 'unauthorized' }, action: 'updateSettings' as const });
    }

    const formData = await request.formData();
    const settingsRaw = String(formData.get('settings') ?? '{}');

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(settingsRaw);
    } catch {
      return fail(400, {
        errors: { form: 'invalidSettingsJson' },
        action: 'updateSettings' as const
      });
    }

    const validated = SettingsSchema.safeParse(parsed);
    if (!validated.success) {
      return fail(400, {
        errors: { form: 'invalidSettingsJson' },
        action: 'updateSettings' as const
      });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ settings_json: validated.data, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      logger.error(new Error(error.message), 'Failed to update settings');
      return fail(500, {
        errors: { form: 'settingsUpdateFailed' },
        action: 'updateSettings' as const
      });
    }

    return { success: true, action: 'updateSettings' as const };
  }
};
