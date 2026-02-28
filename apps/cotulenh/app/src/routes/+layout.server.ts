import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase }, cookies }) => {
  const { session, user } = await safeGetSession();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    if (data) {
      profile = { displayName: data.display_name };
    }
  }

  return {
    session,
    user,
    profile,
    cookies: cookies.getAll()
  };
};
