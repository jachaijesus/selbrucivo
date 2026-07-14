import type { AvailabilityProvider } from '../types';

export const worldCatAvailabilityProvider: AvailabilityProvider = {
  id: 'worldcat',
  label: 'WorldCat',
  isConfigured: () => false,
  async findRoutes() {
    return {
      providerId: 'worldcat',
      providerName: 'WorldCat',
      status: 'not-configured',
      routes: [],
      checkedAt: new Date().toISOString(),
      errorCode: 'server-boundary-required',
      errorMessage: 'WorldCat holdings require approved API access and a credential-safe server boundary.',
    };
  },
};
