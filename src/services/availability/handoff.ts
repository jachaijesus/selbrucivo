import type { AccessHandoff, BookAccessRoute } from './types';
import { safeHttpUrl } from './routeUtils';

const HANDOFF_STORAGE_KEY = 'selbrucivo.library.accessHandoff.v1';

export function saveAccessHandoff(handoff: AccessHandoff) {
  window.sessionStorage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
}

export function readAccessHandoff() {
  try {
    const stored = window.sessionStorage.getItem(HANDOFF_STORAGE_KEY);
    return stored ? JSON.parse(stored) as AccessHandoff : undefined;
  } catch {
    return undefined;
  }
}

export function openAccessRoute(route: BookAccessRoute, scrollPosition?: number) {
  const url = safeHttpUrl(route.externalUrl);

  if (!url) {
    return false;
  }

  saveAccessHandoff({
    materialId: route.materialId,
    editionId: route.editionId,
    routeId: route.id,
    providerId: route.providerId,
    openedAt: new Date().toISOString(),
    returnContext: {
      pathway: 'golem',
      view: 'book-material',
      scrollPosition,
      selectedTab: 'access-routes',
    },
  });

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
