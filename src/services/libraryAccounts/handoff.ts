import type { LibraryAccountConnectionContext, LibraryAccountHandoff } from './types';

export const LIBRARY_ACCOUNT_HANDOFF_KEY = 'selbrucivo.library.accountHandoff.v1';

export function saveLibraryAccountHandoff(context: LibraryAccountConnectionContext) {
  const handoff: LibraryAccountHandoff = {
    providerId: context.providerId,
    startedAt: new Date().toISOString(),
    returnContext: context.returnContext,
  };

  window.sessionStorage.setItem(LIBRARY_ACCOUNT_HANDOFF_KEY, JSON.stringify(handoff));
  return handoff;
}

export function readLibraryAccountHandoff() {
  try {
    const stored = window.sessionStorage.getItem(LIBRARY_ACCOUNT_HANDOFF_KEY);
    return stored ? JSON.parse(stored) as LibraryAccountHandoff : undefined;
  } catch {
    return undefined;
  }
}

export function clearLibraryAccountHandoff() {
  window.sessionStorage.removeItem(LIBRARY_ACCOUNT_HANDOFF_KEY);
}
