import type { ConnectedLibraryAccount, LibraryAccountStatus } from './types';

export const LIBRARY_ACCOUNT_STATUSES: LibraryAccountStatus[] = [
  'disconnected',
  'connecting',
  'connected',
  'reauthentication-required',
  'authorization-declined',
  'connection-revoked',
  'card-expired',
  'access-limited',
  'provider-unavailable',
  'configuration-required',
  'error',
];

export function isLibraryAccountStatus(value: unknown): value is LibraryAccountStatus {
  return typeof value === 'string' && LIBRARY_ACCOUNT_STATUSES.includes(value as LibraryAccountStatus);
}

export function formatLibraryAccountStatus(status: LibraryAccountStatus) {
  const labels: Record<LibraryAccountStatus, string> = {
    disconnected: 'DISCONNECTED',
    connecting: 'CONNECTING',
    connected: 'CONNECTED',
    'reauthentication-required': 'REAUTHENTICATION NEEDED',
    'authorization-declined': 'AUTHORIZATION DECLINED',
    'connection-revoked': 'CONNECTION REVOKED',
    'card-expired': 'CARD EXPIRED',
    'access-limited': 'ACCESS LIMITED',
    'provider-unavailable': 'PROVIDER TEMPORARILY UNAVAILABLE',
    'configuration-required': 'CONFIGURATION REQUIRED',
    error: 'ERROR',
  };

  return labels[status];
}

export function describeLibraryAccountStatus(status: LibraryAccountStatus) {
  const descriptions: Record<LibraryAccountStatus, string> = {
    disconnected: 'Library remains fully usable without a connected account.',
    connecting: 'Prototype authorization is in progress and controlled by the simulated provider.',
    connected: 'Prototype membership context is recognized. This does not confirm access to every Book.',
    'reauthentication-required': 'The prototype account is recognized, but authorization needs renewal.',
    'authorization-declined': 'Authorization was declined or canceled by choice. This is not a system failure.',
    'connection-revoked': 'The prior prototype connection was withdrawn.',
    'card-expired': 'The prototype membership requires attention. Selbrucivo cannot renew it.',
    'access-limited': 'The prototype connection is limited by simulated collection or policy context.',
    'provider-unavailable': 'The prototype provider cannot be checked right now. Library relationships remain available.',
    'configuration-required': 'A live provider would require approved configuration or a server boundary.',
    error: 'The account action could not be completed. Book relationships remain unchanged.',
  };

  return descriptions[status];
}

export function createDisconnectedAccount(providerId: string, providerName: string, requiresServerBoundary: boolean): ConnectedLibraryAccount {
  return {
    id: `${providerId}:disconnected`,
    providerId,
    providerName,
    status: requiresServerBoundary ? 'configuration-required' : 'disconnected',
    scopes: [],
    requiresServerBoundary,
  };
}

export function getMostRelevantAccount(accounts: ConnectedLibraryAccount[]) {
  return accounts.find((account) => (
    account.status === 'connected' ||
    account.status === 'reauthentication-required' ||
    account.status === 'access-limited' ||
    account.status === 'card-expired' ||
    account.status === 'provider-unavailable'
  ));
}

export function shouldEnrichRoutes(account?: ConnectedLibraryAccount) {
  return Boolean(account?.isMocked && (
    account.status === 'connected' ||
    account.status === 'reauthentication-required' ||
    account.status === 'access-limited' ||
    account.status === 'provider-unavailable'
  ));
}
