import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase }, cookies }) => {
  const { session, user } = await safeGetSession();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, settings_json')
      .eq('id', user.id)
      .single();
    if (data) {
      profile = {
        displayName: data.display_name,
        settingsJson: data.settings_json ?? {}
      };
    }
  }

  return {
    session,
    user,
    profile,
    cookies: cookies.getAll()
  };
};
