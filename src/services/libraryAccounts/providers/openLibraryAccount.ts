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
  requiresServerBoundary: false,
};

export const openLibraryAccountProvider: LibraryAccountProvider = {
  id: 'open-library',
  label: 'Open Library',
  kind: 'public-source',
  isConfigured: () => true,
  requiresServerBoundary: () => false,
  getConnectionCapabilities: () => capabilities,
  async beginConnection() {
    return {
      status: 'failed',
      errorCode: 'unsupported-flow',
      message: 'Open Library is a public access source in this phase. Account connection is not required for current routes.',
    };
  },
  async disconnect() {
    return undefined;
  },
};
