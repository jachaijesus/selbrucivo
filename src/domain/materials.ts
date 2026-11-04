import type { PathwayId } from './pathways';
import type { MaterialRoute } from './relationships';

export type MaterialKind = 'observation' | 'reference' | 'draft' | 'reflection' | 'essay' | 'archive-record';
export type LifecycleStage = 'observation' | 'engagement' | 'preservation' | 'synthesis' | 'reflection';
export type MaterialType = 'book' | 'essay' | 'article' | 'recording' | 'image' | 'observation' | 'other';
export type LibraryBookAccessType =
  | 'available-through-connected-provider'
  | 'available-through-library'
  | 'open-access'
  | 'physical-holding'
  | 'reference-only'
  | 'unavailable';
export type LibraryBookRelationshipType =
  | 'physical-copy'
  | 'library-loan'
  | 'digital-purchase'
  | 'audiobook'
  | 'institution-access'
  | 'open-access'
  | 'reference-only'
  | 'wishlist'
  | 'researching';
export type LibraryBookShelfGroup =
  | 'currently-reading'
  | 'reading-queue'
  | 'recently-added'
  | 'completed-reading'
  | 'reference-shelf'
  | 'wishlist';

export type MaterialSearchIndexing = {
  status: 'not-indexed' | 'queued' | 'indexed';
  indexKey?: string;
};

export type MaterialImportSource = {
  sourceType?: 'manual' | 'external-import' | 'web' | 'file' | 'extension';
  sourceUrl?: string;
  externalId?: string;
};

export type MaterialPathwayState = {
  currentPathway: PathwayId;
  librarySection?: 'active-materials/current-studies/books';
  status: 'active-study';
};

export type MaterialIdentifiers = {
  isbn?: string;
  externalId?: string;
};

export type BookEdition = {
  id: string;
  title: string;
  publicationYear?: string;
  language?: string;
  isbn?: string;
  publisher?: string;
};

export type BookAccessSource = {
  id: string;
  label: string;
  type: LibraryBookAccessType;
  url?: string;
};

export type StudentReadingNote = {
  id: string;
  body: string;
  createdAt: string;
};

export type StudentHighlight = {
  id: string;
  text: string;
  reflection?: string;
  linkedEssay?: string;
  linkedArchiveMaterial?: string;
  linkedTrainStationObservation?: string;
  createdAt: string;
};

export type StudentCitation = {
  id: string;
  edition?: string;
  page?: string;
  chapter?: string;
  location?: string;
  studentNote?: string;
  linkedEssay?: string;
  linkedArchiveMaterial?: string;
  linkedHighlight?: string;
  createdAt: string;
};

export type StudentBookRelationship = {
  relationshipStatus: LibraryBookShelfGroup;
  accessType: LibraryBookRelationshipType;
  currentEngagement: string;
  readingNotes: StudentReadingNote[];
  highlights: StudentHighlight[];
  citations: StudentCitation[];
  bookmarks: string[];
  linkedEssays: string[];
  archiveReferences: string[];
  trainStationReferences: string[];
  currentPage?: string;
  currentChapter?: string;
  lastReadingSession?: string;
  lastOpened?: string;
  dateAdded: string;
};

export type SphereMaterial = {
  id: string;
  title: string;
  kind: MaterialKind;
  materialType?: MaterialType;
  lifecycleStage: LifecycleStage;
  originPathway: PathwayId;
  currentPathways: PathwayId[];
  sourceMaterialIds: string[];
  linkedMaterialIds: string[];
  routeHistory: MaterialRoute[];
  parentSection?: string;
  creator?: string;
  source?: string;
  description?: string;
  thumbnail?: string;
  identifiers?: MaterialIdentifiers;
  publicationYear?: string;
  language?: string;
  subjects?: string[];
  editions?: BookEdition[];
  accessSources?: BookAccessSource[];
  relatedMaterialTitles?: string[];
  studentRelationship?: StudentBookRelationship;
  pathwayState?: MaterialPathwayState;
  createdAt: string;
  updatedAt: string;
  searchIndexing: MaterialSearchIndexing;
  importSource?: MaterialImportSource;
  body?: string;
  completed?: boolean;
  archivedAt?: string;
  archiveRecordId?: string;
};

const LEGACY_PATHWAY_IDS: Record<string, PathwayId> = {
  archive: 'chrysopoeia',
  library: 'golem',
  'train-station': 'fafo',
};

function migratePathwayId(pathwayId: PathwayId): PathwayId {
  return LEGACY_PATHWAY_IDS[pathwayId] ?? pathwayId;
}

export function migrateLegacyPathwayIds(material: SphereMaterial): SphereMaterial {
  return {
    ...material,
    originPathway: migratePathwayId(material.originPathway),
    currentPathways: material.currentPathways.map(migratePathwayId),
    routeHistory: material.routeHistory.map((route) => ({
      ...route,
      from: migratePathwayId(route.from),
      to: migratePathwayId(route.to),
    })),
    ...(material.pathwayState && {
      pathwayState: {
        ...material.pathwayState,
        currentPathway: migratePathwayId(material.pathwayState.currentPathway),
      },
    }),
  };
}

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
