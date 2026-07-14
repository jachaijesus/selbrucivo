import type { AvailabilityProvider } from '../types';

export const overDriveAvailabilityProvider: AvailabilityProvider = {
  id: 'overdrive',
  label: 'OverDrive',
  isConfigured: () => false,
  async findRoutes() {
    return {
      providerId: 'overdrive',
      providerName: 'OverDrive',
      status: 'not-configured',
      routes: [],
      checkedAt: new Date().toISOString(),
      errorCode: 'server-boundary-required',
      errorMessage: 'OverDrive availability requires configured library access and a credential-safe integration boundary.',
    };
  },
};
