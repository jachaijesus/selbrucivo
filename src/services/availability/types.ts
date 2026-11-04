import type { BookEdition, SphereMaterial } from '../../domain/materials';

export type AccessRouteKind =
  | 'open-access'
  | 'full-view'
  | 'preview'
  | 'digital-borrow'
  | 'physical-holding'
  | 'interlibrary-request'
  | 'institution-access'
  | 'purchase'
  | 'catalog-record';

export type AccessRouteStatus =
  | 'available'
  | 'unavailable'
  | 'on-hold'
  | 'authentication-required'
  | 'eligibility-unknown'
  | 'temporarily-unavailable'
  | 'unknown';

export type AccessConfidence =
  | 'live'
  | 'provider-reported'
  | 'catalog-only'
  | 'mocked'
  | 'unknown';

export type AccessFormat = 'ebook' | 'audiobook' | 'print' | 'mixed' | 'unknown';

export type RouteSourceIdentifiers = {
  isbn10?: string;
  isbn13?: string;
  oclc?: string;
  openLibrary?: string;
  googleBooks?: string;
  overdrive?: string;
  providerRecord?: string;
};

export type BookAccessRoute = {
  id: string;
  materialId: string;
  editionId?: string;
  providerId: string;
  providerName: string;
  libraryName?: string;
  institutionName?: string;
  kind: AccessRouteKind;
  format: AccessFormat;
  status: AccessRouteStatus;
  confidence: AccessConfidence;
  requiresLibraryCard: boolean;
  requiresInstitutionLogin: boolean;
  eligibilityKnown: boolean;
  geographicRestriction?: string;
  availabilityMessage?: string;
  externalUrl: string;
  checkedAt: string;
  expiresAt?: string;
  sourceIdentifiers: RouteSourceIdentifiers;
  isMocked?: boolean;
  connectedAccountId?: string;
  accountContext?: {
    membershipKnown: boolean;
    eligibility: 'eligible' | 'possibly-eligible' | 'not-eligible' | 'unknown';
    authorizationState: 'active' | 'reauthentication-required' | 'not-connected' | 'unknown';
    isPrototype?: boolean;
  };
};

export type AvailabilityLookupInput = {
  materialId: string;
  title: string;
  authors: string[];
  editions: BookEdition[];
  isbn10: string[];
  isbn13: string[];
  openLibraryIds: string[];
  googleBooksIds: string[];
  oclcIds: string[];
  preferredEditionId?: string;
  language?: string;
};

export type ProviderAvailabilityStatus = 'success' | 'partial' | 'failed' | 'not-configured';

export type ProviderAvailabilityResult = {
  providerId: string;
  providerName: string;
  status: ProviderAvailabilityStatus;
  routes: BookAccessRoute[];
  checkedAt: string;
  errorCode?: string;
  errorMessage?: string;
};

export type AvailabilityState = 'idle' | 'loading' | 'refreshing' | 'partial' | 'ready' | 'empty' | 'failed';

export type AvailabilityResult = {
  materialId: string;
  state: AvailabilityState;
  routes: BookAccessRoute[];
  providers: ProviderAvailabilityResult[];
  checkedAt?: string;
};

export type AvailabilityProviderOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type AvailabilityProvider = {
  id: string;
  label: string;
  isConfigured: () => boolean;
  findRoutes: (
    input: AvailabilityLookupInput,
    options?: AvailabilityProviderOptions,
  ) => Promise<ProviderAvailabilityResult>;
};

export type AvailabilityRequestOptions = {
  refresh?: boolean;
  signal?: AbortSignal;
};

export type AccessHandoff = {
  materialId: string;
  editionId?: string;
  routeId: string;
  providerId: string;
  openedAt: string;
  returnContext: {
    pathway: 'golem';
    view: 'book-material';
    scrollPosition?: number;
    selectedTab?: string;
  };
};

export type MaterialAvailabilityContext = {
  material: SphereMaterial;
  selectedEditionId?: string;
};
