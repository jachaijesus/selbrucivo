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

export const overDriveAccountProvider: LibraryAccountProvider = {
  id: 'overdrive',
  label: 'OverDrive / Libby',
  kind: 'disabled',
  isConfigured: () => false,
  requiresServerBoundary: () => true,
  getConnectionCapabilities: () => capabilities,
  async beginConnection() {
    return {
      status: 'configuration-required',
      errorCode: 'provider-not-configured',
      message: 'OverDrive and Libby patron access requires approved provider credentials and a server-side integration boundary.',
    };
  },
  async disconnect() {
    return undefined;
  },
};
