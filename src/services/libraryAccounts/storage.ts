import { isLibraryAccountStatus } from './accountUtils';
import type { ConnectedLibraryAccount, LibraryAccountState } from './types';

export const LIBRARY_ACCOUNT_STORAGE_KEY = 'selbrucivo.library.connectedAccounts.v1';
const SCHEMA_VERSION = 1;
const KNOWN_PROVIDER_IDS = new Set([
  'selbrucivo-library-prototype',
  'open-library',
  'google-books',
  'worldcat',
  'overdrive',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateAccount(value: unknown): ConnectedLibraryAccount | undefined {
  if (!isRecord(value) || typeof value.providerId !== 'string' || !KNOWN_PROVIDER_IDS.has(value.providerId)) {
    return undefined;
  }

  if (typeof value.id !== 'string' || typeof value.providerName !== 'string' || !isLibraryAccountStatus(value.status)) {
    return undefined;
  }

  if (!Array.isArray(value.scopes) || typeof value.requiresServerBoundary !== 'boolean') {
    return undefined;
  }

  return {
    id: value.id,
    providerId: value.providerId,
    providerName: value.providerName,
    accountLabel: typeof value.accountLabel === 'string' ? value.accountLabel : undefined,
    libraryName: typeof value.libraryName === 'string' ? value.libraryName : undefined,
    institutionName: typeof value.institutionName === 'string' ? value.institutionName : undefined,
    status: value.status,
    connectedAt: typeof value.connectedAt === 'string' ? value.connectedAt : undefined,
    lastVerifiedAt: typeof value.lastVerifiedAt === 'string' ? value.lastVerifiedAt : undefined,
    authorizationExpiresAt: typeof value.authorizationExpiresAt === 'string' ? value.authorizationExpiresAt : undefined,
    scopes: value.scopes.filter((scope): scope is ConnectedLibraryAccount['scopes'][number] => typeof scope === 'string') as ConnectedLibraryAccount['scopes'],
    collectionIds: Array.isArray(value.collectionIds) ? value.collectionIds.filter((item): item is string => typeof item === 'string') : undefined,
    region: typeof value.region === 'string' ? value.region : undefined,
    externalAccountReference: typeof value.externalAccountReference === 'string' ? value.externalAccountReference : undefined,
    requiresServerBoundary: value.requiresServerBoundary,
    isMocked: value.isMocked === true,
    metadata: isRecord(value.metadata) ? {
      cardStatus: value.metadata.cardStatus === 'active' || value.metadata.cardStatus === 'expired' || value.metadata.cardStatus === 'unknown'
        ? value.metadata.cardStatus
        : undefined,
      accessLevel: value.metadata.accessLevel === 'full' || value.metadata.accessLevel === 'limited' || value.metadata.accessLevel === 'unknown'
        ? value.metadata.accessLevel
        : undefined,
      providerMessage: typeof value.metadata.providerMessage === 'string' ? value.metadata.providerMessage : undefined,
    } : undefined,
  };
}

export function readLibraryAccountState(isPrototypeEnabled: boolean): LibraryAccountState {
  try {
    const stored = window.localStorage.getItem(LIBRARY_ACCOUNT_STORAGE_KEY);

    if (!stored) {
      return { schemaVersion: SCHEMA_VERSION, accounts: [] };
    }

    const parsed = JSON.parse(stored) as unknown;

    if (!isRecord(parsed) || parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.accounts)) {
      return { schemaVersion: SCHEMA_VERSION, accounts: [] };
    }

    const accounts = parsed.accounts
      .map(validateAccount)
      .filter((account): account is ConnectedLibraryAccount => Boolean(account))
      .filter((account) => isPrototypeEnabled || account.providerId !== 'selbrucivo-library-prototype');

    return {
      schemaVersion: SCHEMA_VERSION,
      accounts,
      lastUpdatedAt: typeof parsed.lastUpdatedAt === 'string' ? parsed.lastUpdatedAt : undefined,
    };
  } catch {
    return { schemaVersion: SCHEMA_VERSION, accounts: [] };
  }
}

export function writeLibraryAccountState(state: LibraryAccountState) {
  try {
    window.localStorage.setItem(LIBRARY_ACCOUNT_STORAGE_KEY, JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      accounts: state.accounts,
      lastUpdatedAt: new Date().toISOString(),
    }));

    return true;
  } catch {
    return false;
  }
}

export function upsertLibraryAccount(account: ConnectedLibraryAccount, isPrototypeEnabled: boolean) {
  const state = readLibraryAccountState(isPrototypeEnabled);
  const nextAccounts = [
    account,
    ...state.accounts.filter((item) => item.providerId !== account.providerId),
  ];

  return writeLibraryAccountState({
    schemaVersion: SCHEMA_VERSION,
    accounts: nextAccounts,
  });
}

export function removeLibraryAccount(providerId: string, isPrototypeEnabled: boolean) {
  const state = readLibraryAccountState(isPrototypeEnabled);

  return writeLibraryAccountState({
    schemaVersion: SCHEMA_VERSION,
    accounts: state.accounts.filter((account) => account.providerId !== providerId),
  });
}
