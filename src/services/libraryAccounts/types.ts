import type { BookAccessRoute } from '../availability/types';

export type LibraryAccountStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reauthentication-required'
  | 'authorization-declined'
  | 'connection-revoked'
  | 'card-expired'
  | 'access-limited'
  | 'provider-unavailable'
  | 'configuration-required'
  | 'error';

export type LibraryAccountScope =
  | 'identity'
  | 'library-membership'
  | 'collection-eligibility'
  | 'availability'
  | 'holds'
  | 'loans'
  | 'circulation';

export type LibraryAccountErrorCode =
  | 'provider-not-configured'
  | 'provider-unavailable'
  | 'authorization-cancelled'
  | 'authorization-declined'
  | 'authorization-failed'
  | 'state-mismatch'
  | 'storage-failed'
  | 'unsupported-flow';

export type LibraryAccountCapabilities = {
  supportsConnection: boolean;
  supportsBrowserOnlyConnection: boolean;
  supportsReauthentication: boolean;
  supportsMembershipStatus: boolean;
  supportsCollectionEligibility: boolean;
  supportsLiveAvailability: boolean;
  supportsLoans: boolean;
  supportsHolds: boolean;
  requiresServerBoundary: boolean;
};

export type ConnectedLibraryAccount = {
  id: string;
  providerId: string;
  providerName: string;
  accountLabel?: string;
  libraryName?: string;
  institutionName?: string;
  status: LibraryAccountStatus;
  connectedAt?: string;
  lastVerifiedAt?: string;
  authorizationExpiresAt?: string;
  scopes: LibraryAccountScope[];
  collectionIds?: string[];
  region?: string;
  externalAccountReference?: string;
  requiresServerBoundary: boolean;
  isMocked?: boolean;
  metadata?: {
    cardStatus?: 'active' | 'expired' | 'unknown';
    accessLevel?: 'full' | 'limited' | 'unknown';
    providerMessage?: string;
  };
};

export type LibraryAccountConnectionContext = {
  providerId: string;
  returnContext: {
    pathway: 'golem';
    view: 'connected-libraries';
    scrollPosition?: number;
  };
};

export type LibraryAccountConnectionResult = {
  status: 'connected' | 'declined' | 'cancelled' | 'failed' | 'configuration-required';
  account?: ConnectedLibraryAccount;
  errorCode?: LibraryAccountErrorCode;
  message?: string;
};

export type LibraryAccountProvider = {
  id: string;
  label: string;
  kind: 'prototype' | 'public-source' | 'disabled';
  isConfigured: () => boolean;
  requiresServerBoundary: () => boolean;
  getConnectionCapabilities: () => LibraryAccountCapabilities;
  beginConnection: (context: LibraryAccountConnectionContext) => Promise<LibraryAccountConnectionResult>;
  restoreConnection?: () => Promise<ConnectedLibraryAccount | null>;
  disconnect: (account: ConnectedLibraryAccount) => Promise<void>;
  verifyConnection?: (account: ConnectedLibraryAccount) => Promise<ConnectedLibraryAccount>;
};

export type LibraryAccountState = {
  schemaVersion: 1;
  accounts: ConnectedLibraryAccount[];
  lastUpdatedAt?: string;
};

export type LibraryAccountHandoff = {
  providerId: string;
  startedAt: string;
  returnContext: LibraryAccountConnectionContext['returnContext'];
};

export type RouteAccountContext = NonNullable<BookAccessRoute['accountContext']>;
