import type { Reroute } from '@sveltejs/kit';

export const reroute: Reroute = ({ url }) => {
  const match = url.pathname.match(/^\/@([^/]+)$/);
  if (match) {
    return `/user/profile/${match[1]}`;
  }
};
