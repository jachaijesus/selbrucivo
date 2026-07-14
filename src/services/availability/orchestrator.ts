import { getCachedProviderResult, setCachedProviderResult } from './cache';
import { googleBooksAvailabilityProvider } from './providers/googleBooksAvailability';
import { openLibraryAvailabilityProvider } from './providers/openLibraryAvailability';
import { overDriveAvailabilityProvider } from './providers/overDriveAvailability';
import { worldCatAvailabilityProvider } from './providers/worldCatAvailability';
import { createAvailabilityLookupInput, deduplicateRoutes, sortAccessRoutes } from './routeUtils';
import type {
  AvailabilityProvider,
  AvailabilityRequestOptions,
  AvailabilityResult,
  MaterialAvailabilityContext,
  ProviderAvailabilityResult,
} from './types';

const PROVIDER_TIMEOUT_MS = 6_500;
const SUCCESS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const providers: AvailabilityProvider[] = [
  openLibraryAvailabilityProvider,
  googleBooksAvailabilityProvider,
  worldCatAvailabilityProvider,
  overDriveAvailabilityProvider,
];

function createTimeoutSignal(parentSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  const abortFromParent = () => controller.abort();

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeout);
      parentSignal?.removeEventListener('abort', abortFromParent);
    },
  };
}

async function runProvider(
  provider: AvailabilityProvider,
  input: ReturnType<typeof createAvailabilityLookupInput>,
  options: AvailabilityRequestOptions,
): Promise<ProviderAvailabilityResult> {
  const checkedAt = new Date().toISOString();

  if (!provider.isConfigured()) {
    return {
      providerId: provider.id,
      providerName: provider.label,
      status: 'not-configured',
      routes: [],
      checkedAt,
      errorCode: 'not-configured',
    };
  }

  const cached = options.refresh ? undefined : getCachedProviderResult(provider.id, input);

  if (cached) {
    return cached;
  }

  const timeout = createTimeoutSignal(options.signal, PROVIDER_TIMEOUT_MS);

  try {
    const result = await provider.findRoutes(input, {
      signal: timeout.signal,
      timeoutMs: PROVIDER_TIMEOUT_MS,
    });

    if (result.status === 'success' || result.status === 'partial') {
      setCachedProviderResult(provider.id, input, result, SUCCESS_CACHE_TTL_MS);
    }

    return result;
  } catch {
    return {
      providerId: provider.id,
      providerName: provider.label,
      status: 'failed',
      routes: [],
      checkedAt,
      errorCode: timeout.signal.aborted ? 'provider-timeout' : 'provider-failed',
      errorMessage: `${provider.label} could not be checked.`,
    };
  } finally {
    timeout.cleanup();
  }
}

function getAggregateState(results: ProviderAvailabilityResult[], routesLength: number): AvailabilityResult['state'] {
  const configuredResults = results.filter((result) => result.status !== 'not-configured');
  const failedConfigured = configuredResults.filter((result) => result.status === 'failed');
  const successfulConfigured = configuredResults.filter((result) => result.status === 'success' || result.status === 'partial');

  if (routesLength > 0 && failedConfigured.length > 0) {
    return 'partial';
  }

  if (routesLength > 0) {
    return 'ready';
  }

  if (successfulConfigured.length > 0) {
    return 'empty';
  }

  if (configuredResults.length > 0 && failedConfigured.length === configuredResults.length) {
    return 'failed';
  }

  return 'empty';
}

export async function getBookAvailability(
  context: MaterialAvailabilityContext,
  options: AvailabilityRequestOptions = {},
): Promise<AvailabilityResult> {
  const input = createAvailabilityLookupInput(context.material, context.selectedEditionId);
  const providerResults = await Promise.all(providers.map((provider) => runProvider(provider, input, options)));
  const routes = sortAccessRoutes(deduplicateRoutes(providerResults.flatMap((provider) => provider.routes)));
  const checkedValues = providerResults.map((provider) => provider.checkedAt).sort();
  const checkedAt = checkedValues[checkedValues.length - 1];

  return {
    materialId: input.materialId,
    state: getAggregateState(providerResults, routes.length),
    routes,
    providers: providerResults,
    checkedAt,
  };
}
