import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Force client-side rendering for the play route
// This prevents SSR issues with GameSession initialization
export const ssr = false;

export const load: PageLoad = async ({ url }) => {
  // Preserve the board-editor custom position entrypoint.
  if (url.searchParams.has('fen')) {
    return {};
  }

  throw redirect(307, `/play/online${url.search}`);
};
