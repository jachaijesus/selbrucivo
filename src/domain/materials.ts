import type { PathwayId } from './pathways';
import type { MaterialRoute } from './relationships';

export type MaterialKind = 'observation' | 'reference' | 'draft' | 'reflection' | 'essay' | 'archive-record';
export type LifecycleStage = 'observation' | 'engagement' | 'preservation' | 'synthesis' | 'reflection';

export type MaterialSearchIndexing = {
  status: 'not-indexed' | 'queued' | 'indexed';
  indexKey?: string;
};

export type MaterialImportSource = {
  sourceType?: 'manual' | 'external-import' | 'web' | 'file' | 'extension';
  sourceUrl?: string;
  externalId?: string;
};

export type SphereMaterial = {
  id: string;
  title: string;
  kind: MaterialKind;
  lifecycleStage: LifecycleStage;
  originPathway: PathwayId;
  currentPathways: PathwayId[];
  sourceMaterialIds: string[];
  linkedMaterialIds: string[];
  routeHistory: MaterialRoute[];
  parentSection?: string;
  createdAt: string;
  updatedAt: string;
  searchIndexing: MaterialSearchIndexing;
  importSource?: MaterialImportSource;
  body?: string;
  completed?: boolean;
  archivedAt?: string;
  archiveRecordId?: string;
};

export function compactTitle(title: string) {
  return title.replace(/\s*->\s*/g, ' to ');
}

export function uniqueValues<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function createMaterialIdentityMetadata(parentSection?: string) {
  const now = new Date().toISOString();

  return {
    parentSection,
    createdAt: now,
    updatedAt: now,
    searchIndexing: {
      status: 'not-indexed' as const,
    },
    importSource: {
      sourceType: 'manual' as const,
    },
  };
}
