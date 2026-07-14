import type { AvailabilityLookupInput, AvailabilityProvider, BookAccessRoute } from '../types';
import { createStableRouteId, findEditionForIdentifiers, safeHttpUrl } from '../routeUtils';

type OpenLibrarySearchDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  language?: string[];
  isbn?: string[];
  edition_key?: string[];
  ebook_access?: string;
  ia?: string[];
  has_fulltext?: boolean;
  public_scan_b?: boolean;
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibrarySearchDoc[];
};

type OpenLibraryEdition = {
  key?: string;
  title?: string;
  isbn_10?: string[];
  isbn_13?: string[];
  works?: Array<{ key?: string }>;
};

const OPEN_LIBRARY_ORIGIN = 'https://openlibrary.org';
const PROVIDER_ID = 'open-library';
const PROVIDER_NAME = 'Open Library';

function getKnownOpenLibraryPath(input: AvailabilityLookupInput) {
  const known = input.openLibraryIds[0];

  if (!known) {
    return undefined;
  }

  if (known.startsWith('open-library:')) {
    return known.replace('open-library:', '');
  }

  if (known.startsWith('/works/') || known.startsWith('/books/')) {
    return known;
  }

  if (/^OL.+W$/.test(known)) {
    return `/works/${known}`;
  }

  if (/^OL.+M$/.test(known)) {
    return `/books/${known}`;
  }

  return undefined;
}

function buildSearchUrl(input: AvailabilityLookupInput) {
  const url = new URL(`${OPEN_LIBRARY_ORIGIN}/search.json`);
  const isbn = input.isbn13[0] ?? input.isbn10[0];

  if (isbn) {
    url.searchParams.set('isbn', isbn);
  } else {
    url.searchParams.set('title', input.title);
    input.authors.slice(0, 1).forEach((author) => url.searchParams.set('author', author));
  }

  url.searchParams.set('fields', [
    'key',
    'title',
    'author_name',
    'language',
    'isbn',
    'edition_key',
    'ebook_access',
    'ia',
    'has_fulltext',
    'public_scan_b',
  ].join(','));
  url.searchParams.set('limit', '3');

  return url.toString();
}

function createRoute(route: Omit<BookAccessRoute, 'id'>): BookAccessRoute {
  return {
    ...route,
    id: createStableRouteId(route),
  };
}

function normalizeSearchDoc(input: AvailabilityLookupInput, doc: OpenLibrarySearchDoc, checkedAt: string) {
  const routes: BookAccessRoute[] = [];
  const workPath = doc.key;
  const editionKey = doc.edition_key?.[0];
  const primaryIsbn = doc.isbn?.find((isbn) => isbn.length === 13) ?? doc.isbn?.[0];
  const sourceIdentifiers = {
    isbn13: primaryIsbn?.length === 13 ? primaryIsbn : undefined,
    isbn10: primaryIsbn?.length === 10 ? primaryIsbn : undefined,
    openLibrary: editionKey ?? workPath,
    providerRecord: editionKey ?? workPath,
  };
  const editionId = findEditionForIdentifiers(input.editions, sourceIdentifiers, doc.title, doc.language?.[0] ?? input.language);
  const catalogUrl = safeHttpUrl(workPath ? `${OPEN_LIBRARY_ORIGIN}${workPath}` : undefined);

  if (catalogUrl) {
    routes.push(createRoute({
      materialId: input.materialId,
      editionId,
      providerId: PROVIDER_ID,
      providerName: PROVIDER_NAME,
      kind: 'catalog-record',
      format: 'mixed',
      status: 'unknown',
      confidence: input.isbn10.length || input.isbn13.length ? 'provider-reported' : 'catalog-only',
      requiresLibraryCard: false,
      requiresInstitutionLogin: false,
      eligibilityKnown: false,
      availabilityMessage: 'Provider record found. Current readable or borrowable status may vary.',
      externalUrl: catalogUrl,
      checkedAt,
      sourceIdentifiers,
    }));
  }

  const readableUrl = safeHttpUrl(editionKey ? `${OPEN_LIBRARY_ORIGIN}/books/${editionKey}` : catalogUrl);

  if (readableUrl && (doc.ebook_access === 'public' || doc.public_scan_b)) {
    routes.push(createRoute({
      materialId: input.materialId,
      editionId,
      providerId: PROVIDER_ID,
      providerName: PROVIDER_NAME,
      kind: 'open-access',
      format: 'ebook',
      status: 'available',
      confidence: 'provider-reported',
      requiresLibraryCard: false,
      requiresInstitutionLogin: false,
      eligibilityKnown: true,
      availabilityMessage: 'Readable access is reported by Open Library.',
      externalUrl: readableUrl,
      checkedAt,
      sourceIdentifiers,
    }));
  }

  if (readableUrl && doc.ebook_access === 'borrowable') {
    routes.push(createRoute({
      materialId: input.materialId,
      editionId,
      providerId: PROVIDER_ID,
      providerName: PROVIDER_NAME,
      kind: 'digital-borrow',
      format: 'ebook',
      status: 'eligibility-unknown',
      confidence: 'provider-reported',
      requiresLibraryCard: true,
      requiresInstitutionLogin: false,
      eligibilityKnown: false,
      availabilityMessage: 'Open Library reports a borrowable edition. Account eligibility is managed by the provider.',
      externalUrl: readableUrl,
      checkedAt,
      sourceIdentifiers,
    }));
  }

  return routes;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Open Library request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const openLibraryAvailabilityProvider: AvailabilityProvider = {
  id: PROVIDER_ID,
  label: PROVIDER_NAME,
  isConfigured: () => true,
  async findRoutes(input, options) {
    const checkedAt = new Date().toISOString();

    try {
      const routes: BookAccessRoute[] = [];
      const knownPath = getKnownOpenLibraryPath(input);

      if (knownPath) {
        const catalogUrl = safeHttpUrl(`${OPEN_LIBRARY_ORIGIN}${knownPath}`);

        if (catalogUrl) {
          routes.push(createRoute({
            materialId: input.materialId,
            editionId: findEditionForIdentifiers(input.editions, { openLibrary: knownPath, providerRecord: knownPath }),
            providerId: PROVIDER_ID,
            providerName: PROVIDER_NAME,
            kind: 'catalog-record',
            format: 'mixed',
            status: 'unknown',
            confidence: 'catalog-only',
            requiresLibraryCard: false,
            requiresInstitutionLogin: false,
            eligibilityKnown: false,
            availabilityMessage: 'Open Library record is available. This does not confirm readable or borrowable access.',
            externalUrl: catalogUrl,
            checkedAt,
            sourceIdentifiers: {
              openLibrary: knownPath,
              providerRecord: knownPath,
            },
          }));
        }
      }

      const isbn = input.isbn13[0] ?? input.isbn10[0];

      if (isbn) {
        try {
          const edition = await fetchJson<OpenLibraryEdition>(`${OPEN_LIBRARY_ORIGIN}/isbn/${isbn}.json`, options?.signal);
          const editionPath = edition.key;
          const workPath = edition.works?.[0]?.key;
          const externalUrl = safeHttpUrl(`${OPEN_LIBRARY_ORIGIN}${editionPath ?? workPath ?? ''}`);

          if (externalUrl) {
            const sourceIdentifiers = {
              isbn13: input.isbn13[0],
              isbn10: input.isbn10[0],
              openLibrary: editionPath ?? workPath,
              providerRecord: editionPath ?? workPath,
            };

            routes.push(createRoute({
              materialId: input.materialId,
              editionId: findEditionForIdentifiers(input.editions, sourceIdentifiers, edition.title ?? input.title, input.language),
              providerId: PROVIDER_ID,
              providerName: PROVIDER_NAME,
              kind: 'catalog-record',
              format: 'mixed',
              status: 'unknown',
              confidence: 'provider-reported',
              requiresLibraryCard: false,
              requiresInstitutionLogin: false,
              eligibilityKnown: false,
              availabilityMessage: 'ISBN matched an Open Library edition record.',
              externalUrl,
              checkedAt,
              sourceIdentifiers,
            }));
          }
        } catch {
          // Search fallback below may still produce a useful provider route.
        }
      }

      const searchPayload = await fetchJson<OpenLibrarySearchResponse>(buildSearchUrl(input), options?.signal);
      const searchRoutes = (searchPayload.docs ?? []).flatMap((doc) => normalizeSearchDoc(input, doc, checkedAt));

      return {
        providerId: PROVIDER_ID,
        providerName: PROVIDER_NAME,
        status: 'success',
        routes: [...routes, ...searchRoutes],
        checkedAt,
      };
    } catch (error) {
      return {
        providerId: PROVIDER_ID,
        providerName: PROVIDER_NAME,
        status: 'failed',
        routes: [],
        checkedAt,
        errorCode: error instanceof DOMException && error.name === 'AbortError' ? 'aborted' : 'open-library-unavailable',
        errorMessage: 'Open Library could not be reached.',
      };
    }
  },
};
