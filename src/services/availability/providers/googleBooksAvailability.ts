import type { AvailabilityLookupInput, AvailabilityProvider, BookAccessRoute } from '../types';
import { createStableRouteId, findEditionForIdentifiers, safeHttpUrl } from '../routeUtils';

type GoogleBooksVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
    language?: string;
    canonicalVolumeLink?: string;
    previewLink?: string;
  };
  accessInfo?: {
    viewability?: string;
    webReaderLink?: string;
    accessViewStatus?: string;
  };
};

type GoogleBooksResponse = {
  items?: GoogleBooksVolume[];
};

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const PROVIDER_ID = 'google-books';
const PROVIDER_NAME = 'Google Books';

function buildQuery(input: AvailabilityLookupInput) {
  const isbn = input.isbn13[0] ?? input.isbn10[0];

  if (isbn) {
    return `isbn:${isbn}`;
  }

  const title = input.title ? `intitle:${input.title}` : '';
  const author = input.authors[0] ? `inauthor:${input.authors[0]}` : '';

  return [title, author].filter(Boolean).join('+');
}

function buildRequestUrl(input: AvailabilityLookupInput) {
  const url = new URL(GOOGLE_BOOKS_URL);
  url.searchParams.set('q', buildQuery(input));
  url.searchParams.set('maxResults', '5');
  url.searchParams.set('printType', 'books');

  return url.toString();
}

function getIdentifier(volume: GoogleBooksVolume, type: string) {
  return volume.volumeInfo?.industryIdentifiers?.find((identifier) => identifier.type === type)?.identifier;
}

function createRoute(route: Omit<BookAccessRoute, 'id'>): BookAccessRoute {
  return {
    ...route,
    id: createStableRouteId(route),
  };
}

function normalizeVolume(input: AvailabilityLookupInput, volume: GoogleBooksVolume, checkedAt: string) {
  const routes: BookAccessRoute[] = [];
  const isbn13 = getIdentifier(volume, 'ISBN_13');
  const isbn10 = getIdentifier(volume, 'ISBN_10');
  const sourceIdentifiers = {
    isbn13,
    isbn10,
    googleBooks: volume.id,
    providerRecord: volume.id,
  };
  const editionId = findEditionForIdentifiers(
    input.editions,
    sourceIdentifiers,
    volume.volumeInfo?.title,
    volume.volumeInfo?.language ?? input.language,
  );
  const viewability = volume.accessInfo?.viewability;
  const readerUrl = safeHttpUrl(volume.accessInfo?.webReaderLink);
  const previewUrl = safeHttpUrl(volume.volumeInfo?.previewLink);
  const catalogUrl = safeHttpUrl(volume.volumeInfo?.canonicalVolumeLink ?? previewUrl);
  const exactIdentifierMatch = (
    (isbn13 && input.isbn13.includes(isbn13)) ||
    (isbn10 && input.isbn10.includes(isbn10)) ||
    (volume.id && input.googleBooksIds.some((id) => id.includes(volume.id ?? '')))
  );
  const confidence = exactIdentifierMatch ? 'provider-reported' : 'catalog-only';

  if ((viewability === 'ALL_PAGES' || viewability === 'FULL_PUBLIC_DOMAIN') && (readerUrl || previewUrl || catalogUrl)) {
    routes.push(createRoute({
      materialId: input.materialId,
      editionId,
      providerId: PROVIDER_ID,
      providerName: PROVIDER_NAME,
      kind: 'full-view',
      format: 'ebook',
      status: 'available',
      confidence,
      requiresLibraryCard: false,
      requiresInstitutionLogin: false,
      eligibilityKnown: true,
      availabilityMessage: 'Google Books reports full-view access for this volume.',
      externalUrl: readerUrl ?? previewUrl ?? catalogUrl ?? '',
      checkedAt,
      sourceIdentifiers,
    }));
  } else if (viewability === 'PARTIAL' && (previewUrl || readerUrl || catalogUrl)) {
    routes.push(createRoute({
      materialId: input.materialId,
      editionId,
      providerId: PROVIDER_ID,
      providerName: PROVIDER_NAME,
      kind: 'preview',
      format: 'ebook',
      status: 'available',
      confidence,
      requiresLibraryCard: false,
      requiresInstitutionLogin: false,
      eligibilityKnown: true,
      availabilityMessage: 'A limited preview is available. This is not borrowing or full access.',
      externalUrl: previewUrl ?? readerUrl ?? catalogUrl ?? '',
      checkedAt,
      sourceIdentifiers,
    }));
  }

  if (catalogUrl) {
    routes.push(createRoute({
      materialId: input.materialId,
      editionId,
      providerId: PROVIDER_ID,
      providerName: PROVIDER_NAME,
      kind: 'catalog-record',
      format: 'mixed',
      status: 'unknown',
      confidence,
      requiresLibraryCard: false,
      requiresInstitutionLogin: false,
      eligibilityKnown: false,
      availabilityMessage: 'Google Books volume record found. Access level is provider-reported above when available.',
      externalUrl: catalogUrl,
      checkedAt,
      sourceIdentifiers,
    }));
  }

  return routes;
}

export const googleBooksAvailabilityProvider: AvailabilityProvider = {
  id: PROVIDER_ID,
  label: PROVIDER_NAME,
  isConfigured: () => true,
  async findRoutes(input, options) {
    const checkedAt = new Date().toISOString();

    try {
      const response = await fetch(buildRequestUrl(input), { signal: options?.signal });

      if (!response.ok) {
        throw new Error(`Google Books request failed with ${response.status}`);
      }

      const payload = await response.json() as GoogleBooksResponse;

      return {
        providerId: PROVIDER_ID,
        providerName: PROVIDER_NAME,
        status: 'success',
        routes: (payload.items ?? []).flatMap((volume) => normalizeVolume(input, volume, checkedAt)),
        checkedAt,
      };
    } catch (error) {
      return {
        providerId: PROVIDER_ID,
        providerName: PROVIDER_NAME,
        status: 'failed',
        routes: [],
        checkedAt,
        errorCode: error instanceof DOMException && error.name === 'AbortError' ? 'aborted' : 'google-books-unavailable',
        errorMessage: 'Google Books could not be reached.',
      };
    }
  },
};
