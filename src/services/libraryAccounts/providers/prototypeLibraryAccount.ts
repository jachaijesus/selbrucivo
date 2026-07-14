import { saveLibraryAccountHandoff } from '../handoff';
import type {
  ConnectedLibraryAccount,
  LibraryAccountCapabilities,
  LibraryAccountConnectionContext,
  LibraryAccountProvider,
  LibraryAccountStatus,
} from '../types';

export const PROTOTYPE_LIBRARY_PROVIDER_ID = 'selbrucivo-library-prototype';
export const PROTOTYPE_LIBRARY_PROVIDER_NAME = 'Selbrucivo Library Connection Prototype';

const capabilities: LibraryAccountCapabilities = {
  supportsConnection: true,
  supportsBrowserOnlyConnection: true,
  supportsReauthentication: true,
  supportsMembershipStatus: true,
  supportsCollectionEligibility: true,
  supportsLiveAvailability: false,
  supportsLoans: false,
  supportsHolds: false,
  requiresServerBoundary: false,
};

export function createPrototypeAccount(status: LibraryAccountStatus = 'connected'): ConnectedLibraryAccount {
  const now = new Date().toISOString();
  const connectedAt = status === 'connected' || status === 'access-limited' || status === 'reauthentication-required'
    ? now
    : undefined;

  return {
    id: `${PROTOTYPE_LIBRARY_PROVIDER_ID}:local-prototype`,
    providerId: PROTOTYPE_LIBRARY_PROVIDER_ID,
    providerName: PROTOTYPE_LIBRARY_PROVIDER_NAME,
    accountLabel: 'Prototype membership context',
    libraryName: 'Selbrucivo Prototype Collection',
    status,
    connectedAt,
    lastVerifiedAt: now,
    scopes: ['library-membership', 'collection-eligibility', 'availability'],
    collectionIds: ['prototype-study-collection'],
    region: 'prototype',
    externalAccountReference: 'prototype-only',
    requiresServerBoundary: false,
    isMocked: true,
    metadata: {
      cardStatus: status === 'card-expired' ? 'expired' : status === 'connected' ? 'active' : 'unknown',
      accessLevel: status === 'access-limited' ? 'limited' : status === 'connected' ? 'full' : 'unknown',
      providerMessage: 'Prototype state only. No live library account is connected.',
    },
  };
}

export const prototypeLibraryAccountProvider: LibraryAccountProvider = {
  id: PROTOTYPE_LIBRARY_PROVIDER_ID,
  label: PROTOTYPE_LIBRARY_PROVIDER_NAME,
  kind: 'prototype',
  isConfigured: () => true,
  requiresServerBoundary: () => false,
  getConnectionCapabilities: () => capabilities,
  async beginConnection(context: LibraryAccountConnectionContext) {
    saveLibraryAccountHandoff(context);

    return {
      status: 'connected',
      account: createPrototypeAccount('connected'),
      message: 'Prototype connection approved.',
    };
  },
  async disconnect() {
    return undefined;
  },
  async verifyConnection(account) {
    return {
      ...account,
      lastVerifiedAt: new Date().toISOString(),
    };
  },
};
