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

export const googleBooksAccountProvider: LibraryAccountProvider = {
  id: 'google-books',
  label: 'Google Books',
  kind: 'public-source',
  isConfigured: () => true,
  requiresServerBoundary: () => false,
  getConnectionCapabilities: () => capabilities,
  async beginConnection() {
    return {
      status: 'failed',
      errorCode: 'unsupported-flow',
      message: 'Google Books remains a public book source. A Google account is not treated as library membership.',
    };
  },
  async disconnect() {
    return undefined;
  },
};
