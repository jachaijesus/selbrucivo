import { googleBooksAccountProvider } from './providers/googleBooksAccount';
import { openLibraryAccountProvider } from './providers/openLibraryAccount';
import { overDriveAccountProvider } from './providers/overDriveAccount';
import { prototypeLibraryAccountProvider, PROTOTYPE_LIBRARY_PROVIDER_ID } from './providers/prototypeLibraryAccount';
import { worldCatAccountProvider } from './providers/worldCatAccount';

export const ENABLE_LIBRARY_ACCOUNT_PROTOTYPE = (
  import.meta.env.DEV ||
  import.meta.env.VITE_ENABLE_LIBRARY_ACCOUNT_PROTOTYPE === 'true'
);

export function getLibraryAccountProviders() {
  return [
    ...(ENABLE_LIBRARY_ACCOUNT_PROTOTYPE ? [prototypeLibraryAccountProvider] : []),
    openLibraryAccountProvider,
    googleBooksAccountProvider,
    worldCatAccountProvider,
    overDriveAccountProvider,
  ];
}

export function getLibraryAccountProvider(providerId: string) {
  return getLibraryAccountProviders().find((provider) => provider.id === providerId);
}

export function isPrototypeLibraryProviderEnabled() {
  return ENABLE_LIBRARY_ACCOUNT_PROTOTYPE;
}

export function isPrototypeProviderId(providerId: string) {
  return providerId === PROTOTYPE_LIBRARY_PROVIDER_ID;
}
