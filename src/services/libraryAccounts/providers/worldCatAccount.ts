import type { LibraryAccountCapabilities, LibraryAccountProvider } from '../types';

const capabilities: LibraryAccountCapabilities = {
  supportsConnection: false,
  supportsBrowserOnlyConnection: false,
  supportsReauthentication: false,
  supportsMembershipStatus: false,
  supportsCollectionEligibility: false,
  supportsLiveAvailability: false,
  supportsLoans: false,
  supportsHolds: false,
  requiresServerBoundary: true,
};

export const worldCatAccountProvider: LibraryAccountProvider = {
  id: 'worldcat',
  label: 'WorldCat',
  kind: 'disabled',
  isConfigured: () => false,
  requiresServerBoundary: () => true,
  getConnectionCapabilities: () => capabilities,
  async beginConnection() {
    return {
      status: 'configuration-required',
      errorCode: 'provider-not-configured',
      message: 'WorldCat account or institutional access requires approved configuration and a credential-safe server boundary.',
    };
  },
  async disconnect() {
    return undefined;
  },
};
