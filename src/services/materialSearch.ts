import type { BookAccessSource, BookEdition, MaterialType } from '../domain/materials';

export type MaterialSearchResult = {
  id: string;
  title: string;
  creator?: string;
  materialType: MaterialType;
  source?: string;
  description?: string;
  thumbnail?: string;
  publicationYear?: string;
  language?: string;
  subjects: string[];
  editions: BookEdition[];
  accessSources: BookAccessSource[];
  relatedMaterialTitles: string[];
  providerUrl?: string;
  identifiers?: {
    isbn?: string;
    externalId?: string;
  };
};

type OpenLibrarySearchDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  language?: string[];
  subject?: string[];
  isbn?: string[];
  cover_i?: number;
  edition_key?: string[];
  publisher?: string[];
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibrarySearchDoc[];
};

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
const OPEN_LIBRARY_WORK_URL = 'https://openlibrary.org';
const RESULT_LIMIT = 8;

function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ');
}

function buildSearchUrl(query: string) {
  const url = new URL(OPEN_LIBRARY_SEARCH_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('fields', [
    'key',
    'title',
    'author_name',
    'first_publish_year',
    'language',
    'subject',
    'isbn',
    'cover_i',
    'edition_key',
    'publisher',
  ].join(','));
  url.searchParams.set('limit', String(RESULT_LIMIT));

  return url.toString();
}

function getCoverUrl(coverId?: number) {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined;
}

function formatLanguage(languageCodes?: string[]) {
  if (!languageCodes?.length) {
    return undefined;
  }

  return languageCodes.slice(0, 3).map((language) => language.toUpperCase()).join(', ');
}

function createDescription(doc: OpenLibrarySearchDoc) {
  const parts = [
    doc.first_publish_year ? `First published ${doc.first_publish_year}` : undefined,
    doc.publisher?.[0] ? `Publisher record: ${doc.publisher[0]}` : undefined,
    doc.subject?.slice(0, 2).join(' / '),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join('. ') : 'Bibliographic record from Open Library.';
}

function normalizeOpenLibraryDoc(doc: OpenLibrarySearchDoc): MaterialSearchResult | undefined {
  if (!doc.key || !doc.title) {
    return undefined;
  }

  const creator = doc.author_name?.slice(0, 3).join(', ');
  const subjects = (doc.subject ?? []).slice(0, 6);
  const editionKeys = doc.edition_key?.slice(0, 5) ?? [];
  const editions = editionKeys.length > 0
    ? editionKeys.map((editionKey, index) => ({
        id: editionKey,
        title: index === 0 ? doc.title ?? 'Edition' : `${doc.title} edition ${index + 1}`,
        publicationYear: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
        language: formatLanguage(doc.language),
        isbn: doc.isbn?.[index],
        publisher: doc.publisher?.[0],
      }))
    : [{
        id: doc.key,
        title: doc.title,
        publicationYear: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
        language: formatLanguage(doc.language),
        isbn: doc.isbn?.[0],
        publisher: doc.publisher?.[0],
      }];

  return {
    id: `open-library:${doc.key}`,
    title: doc.title,
    creator,
    materialType: 'book',
    source: 'Open Library',
    description: createDescription(doc),
    thumbnail: getCoverUrl(doc.cover_i),
    publicationYear: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
    language: formatLanguage(doc.language),
    subjects,
    editions,
    accessSources: [],
    relatedMaterialTitles: subjects.slice(0, 3).map((subject) => `${subject} materials`),
    providerUrl: `${OPEN_LIBRARY_WORK_URL}${doc.key}`,
    identifiers: {
      isbn: doc.isbn?.[0],
      externalId: `open-library:${doc.key}`,
    },
  };
}

export async function searchLibraryMaterials(query: string): Promise<MaterialSearchResult[]> {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const response = await fetch(buildSearchUrl(normalizedQuery));

  if (!response.ok) {
    throw new Error(`Open Library search failed with ${response.status}`);
  }

  const payload = await response.json() as OpenLibrarySearchResponse;
  const materialByCanonicalId = new Map<string, MaterialSearchResult>();

  (payload.docs ?? []).forEach((doc) => {
    const material = normalizeOpenLibraryDoc(doc);

    if (!material) {
      return;
    }

    const canonicalId = material.identifiers?.externalId ?? material.id;
    const existing = materialByCanonicalId.get(canonicalId);

    materialByCanonicalId.set(canonicalId, existing ? {
      ...existing,
      editions: [...existing.editions, ...material.editions].slice(0, 8),
      accessSources: [],
    } : material);
  });

  return Array.from(materialByCanonicalId.values());
}
