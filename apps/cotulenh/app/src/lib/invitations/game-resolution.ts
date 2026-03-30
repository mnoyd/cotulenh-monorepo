import type { SupabaseClient } from '@supabase/supabase-js';

export async function waitForGameByInvitation(
  supabase: SupabaseClient,
  invitationId: string,
  retries = 25,
  delayMs = 200
): Promise<{ id: string } | null> {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const { data: game } = await supabase
      .from('games')
      .select('id')
      .eq('invitation_id', invitationId)
      .single();

    if (game) {
      return game;
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}
