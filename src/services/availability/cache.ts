import type { AvailabilityLookupInput, ProviderAvailabilityResult } from './types';

type CacheEntry = {
  checkedAt: string;
  expiresAt: string;
  result: ProviderAvailabilityResult;
};

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

function serialize(values: string[]) {
  return values.slice().sort().join(',');
}

export function createProviderCacheKey(providerId: string, input: AvailabilityLookupInput) {
  return [
    providerId,
    input.materialId,
    input.preferredEditionId ?? 'material',
    serialize(input.isbn13),
    serialize(input.isbn10),
    serialize(input.openLibraryIds),
    serialize(input.googleBooksIds),
    input.language ?? '',
  ].join('|');
}

export function getCachedProviderResult(providerId: string, input: AvailabilityLookupInput) {
  const key = createProviderCacheKey(providerId, input);
  const entry = cache.get(key);

  if (!entry || Date.parse(entry.expiresAt) <= Date.now()) {
    if (entry) {
      cache.delete(key);
    }

    return undefined;
  }

  return entry.result;
}

export function setCachedProviderResult(
  providerId: string,
  input: AvailabilityLookupInput,
  result: ProviderAvailabilityResult,
  ttlMs = DEFAULT_TTL_MS,
) {
  const checkedAt = result.checkedAt || new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  cache.set(createProviderCacheKey(providerId, input), {
    checkedAt,
    expiresAt,
    result: {
      ...result,
      routes: result.routes.map((route) => ({
        ...route,
        expiresAt: route.expiresAt ?? expiresAt,
      })),
    },
  });
}

export function invalidateProviderCache(providerId: string, input: AvailabilityLookupInput) {
  cache.delete(createProviderCacheKey(providerId, input));
}
