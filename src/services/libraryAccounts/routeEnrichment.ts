import type { AvailabilityResult, BookAccessRoute } from '../availability/types';
import { getMostRelevantAccount, shouldEnrichRoutes } from './accountUtils';
import type { ConnectedLibraryAccount } from './types';

function getAuthorizationState(account: ConnectedLibraryAccount): NonNullable<BookAccessRoute['accountContext']>['authorizationState'] {
  if (account.status === 'connected' || account.status === 'access-limited' || account.status === 'provider-unavailable') {
    return 'active';
  }

  if (account.status === 'reauthentication-required') {
    return 'reauthentication-required';
  }

  return 'unknown';
}

function getEligibility(account: ConnectedLibraryAccount, route: BookAccessRoute): NonNullable<BookAccessRoute['accountContext']>['eligibility'] {
  if (account.status === 'access-limited') {
    return route.kind === 'digital-borrow' || route.kind === 'institution-access' || route.kind === 'physical-holding'
      ? 'possibly-eligible'
      : 'unknown';
  }

  if (account.status === 'connected' && (
    route.kind === 'digital-borrow' ||
    route.kind === 'institution-access' ||
    route.kind === 'physical-holding' ||
    route.kind === 'interlibrary-request'
  )) {
    return 'possibly-eligible';
  }

  if (account.status === 'reauthentication-required') {
    return 'unknown';
  }

  return 'unknown';
}

export function enrichRouteWithAccount(route: BookAccessRoute, account?: ConnectedLibraryAccount): BookAccessRoute {
  if (!account || !shouldEnrichRoutes(account)) {
    const { connectedAccountId, accountContext, ...publicRoute } = route;
    return publicRoute;
  }

  return {
    ...route,
    connectedAccountId: account.id,
    accountContext: {
      membershipKnown: account.status === 'connected' || account.status === 'access-limited',
      eligibility: getEligibility(account, route),
      authorizationState: getAuthorizationState(account),
      isPrototype: account.isMocked === true,
    },
  };
}

export function enrichAvailabilityWithAccounts(result: AvailabilityResult, accounts: ConnectedLibraryAccount[]): AvailabilityResult {
  const account = getMostRelevantAccount(accounts);

  return {
    ...result,
    routes: result.routes.map((route) => enrichRouteWithAccount(route, account)),
  };
}
