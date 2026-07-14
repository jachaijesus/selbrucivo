import type { BookEdition, SphereMaterial } from '../../domain/materials';
import type {
  AccessRouteKind,
  AvailabilityLookupInput,
  BookAccessRoute,
  ProviderAvailabilityResult,
  RouteSourceIdentifiers,
} from './types';

const ISBN_10_PATTERN = /^(?:\d{9}[\dX])$/i;
const ISBN_13_PATTERN = /^\d{13}$/;

const ROUTE_ORDER: Record<AccessRouteKind, number> = {
  'institution-access': 10,
  'open-access': 20,
  'full-view': 25,
  'digital-borrow': 30,
  'physical-holding': 40,
  'interlibrary-request': 50,
  preview: 60,
  'catalog-record': 70,
  purchase: 90,
};

export function normalizeIdentifier(value?: string) {
  return value?.trim().replace(/^open-library:/, '').replace(/^google-books:/, '') ?? '';
}

export function normalizeIsbn(value?: string) {
  return value?.replace(/[^0-9X]/gi, '').toUpperCase() ?? '';
}

export function splitIsbns(values: Array<string | undefined>) {
  const isbn10 = new Set<string>();
  const isbn13 = new Set<string>();

  values.map(normalizeIsbn).forEach((isbn) => {
    if (ISBN_13_PATTERN.test(isbn)) {
      isbn13.add(isbn);
    } else if (ISBN_10_PATTERN.test(isbn)) {
      isbn10.add(isbn);
    }
  });

  return {
    isbn10: Array.from(isbn10),
    isbn13: Array.from(isbn13),
  };
}

export function createAvailabilityLookupInput(material: SphereMaterial, selectedEditionId?: string): AvailabilityLookupInput {
  const editions = material.editions ?? [];
  const materialIsbn = material.identifiers?.isbn;
  const editionIsbns = editions.map((edition) => edition.isbn);
  const { isbn10, isbn13 } = splitIsbns([materialIsbn, ...editionIsbns]);
  const providerIds = [
    material.identifiers?.externalId,
    material.importSource?.externalId,
    material.importSource?.sourceUrl,
    ...editions.map((edition) => edition.id),
  ].filter(Boolean) as string[];

  return {
    materialId: material.id,
    title: material.title,
    authors: material.creator ? material.creator.split(',').map((author) => author.trim()).filter(Boolean) : [],
    editions,
    isbn10,
    isbn13,
    openLibraryIds: providerIds.filter((id) => id.includes('open-library') || id.includes('/works/') || id.includes('/books/') || /^OL.+[MW]$/.test(id)),
    googleBooksIds: providerIds.filter((id) => id.includes('google-books')),
    oclcIds: [],
    preferredEditionId: selectedEditionId,
    language: material.language,
  };
}

export function findEditionForIdentifiers(
  editions: BookEdition[],
  identifiers: RouteSourceIdentifiers,
  fallbackTitle?: string,
  language?: string,
) {
  const isbnValues = [identifiers.isbn13, identifiers.isbn10].map(normalizeIsbn).filter(Boolean);
  const exactIsbnMatch = editions.find((edition) => isbnValues.includes(normalizeIsbn(edition.isbn)));

  if (exactIsbnMatch) {
    return exactIsbnMatch.id;
  }

  const providerRecord = normalizeIdentifier(identifiers.openLibrary ?? identifiers.googleBooks ?? identifiers.providerRecord);
  const providerMatch = editions.find((edition) => normalizeIdentifier(edition.id) === providerRecord);

  if (providerMatch) {
    return providerMatch.id;
  }

  const normalizedTitle = fallbackTitle?.trim().toLowerCase();
  const normalizedLanguage = language?.trim().toLowerCase();

  if (!normalizedTitle) {
    return undefined;
  }

  const titleMatches = editions.filter((edition) => edition.title.trim().toLowerCase() === normalizedTitle);

  if (titleMatches.length === 1) {
    return titleMatches[0].id;
  }

  return titleMatches.find((edition) => (
    normalizedLanguage &&
    edition.language?.trim().toLowerCase().includes(normalizedLanguage)
  ))?.id;
}

export function createStableRouteId(route: Omit<BookAccessRoute, 'id'>) {
  return [
    route.providerId,
    route.materialId,
    route.editionId ?? 'material',
    route.kind,
    route.format,
    route.externalUrl,
    route.libraryName ?? '',
    route.institutionName ?? '',
  ]
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

export function deduplicateRoutes(routes: BookAccessRoute[]) {
  const byKey = new Map<string, BookAccessRoute>();

  routes.forEach((route) => {
    const key = [
      route.providerId,
      route.externalUrl.trim().toLowerCase(),
      route.editionId ?? 'material',
      route.kind,
      route.format,
      route.libraryName ?? '',
      route.institutionName ?? '',
    ].join('|');
    const existing = byKey.get(key);

    if (!existing || ROUTE_ORDER[route.kind] < ROUTE_ORDER[existing.kind]) {
      byKey.set(key, route);
    }
  });

  return Array.from(byKey.values());
}

export function sortAccessRoutes(routes: BookAccessRoute[]) {
  return [...routes].sort((first, second) => {
    const firstEligible = first.eligibilityKnown && !first.requiresInstitutionLogin && !first.requiresLibraryCard ? 0 : 1;
    const secondEligible = second.eligibilityKnown && !second.requiresInstitutionLogin && !second.requiresLibraryCard ? 0 : 1;

    if (firstEligible !== secondEligible) {
      return firstEligible - secondEligible;
    }

    const kindOrder = ROUTE_ORDER[first.kind] - ROUTE_ORDER[second.kind];

    if (kindOrder !== 0) {
      return kindOrder;
    }

    return first.providerName.localeCompare(second.providerName);
  });
}

export function combineProviderResults(materialId: string, providers: ProviderAvailabilityResult[]): ProviderAvailabilityResult {
  const checkedAt = new Date().toISOString();

  return {
    providerId: 'combined',
    providerName: 'Connected sources',
    status: 'success',
    routes: sortAccessRoutes(deduplicateRoutes(providers.flatMap((provider) => provider.routes))),
    checkedAt,
  };
}

export function safeHttpUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
