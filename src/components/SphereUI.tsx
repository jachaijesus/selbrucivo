import { useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  getRelationshipVisibilityMode,
  isEnvironmentPanelState,
  isPanelActive,
  usePanelArchitecture,
} from '../panelArchitecture';
import type { OrientationSnapshot, PanelInteractionState, RelationshipVisibilityMode } from '../panelArchitecture';
import { getActionGroup, type PathwayAction } from '../domain/actions';
import {
  compactTitle,
  createMaterialIdentityMetadata,
  uniqueValues,
  type LibraryBookRelationshipType,
  type LibraryBookShelfGroup,
  type StudentBookRelationship,
  type SphereMaterial,
} from '../domain/materials';
import {
  getDestinationPathway,
  getPathwayDefinition,
  getPathwayLabel,
  PATHWAY_REGISTRY,
  PATHWAY_ROTATIONS,
  type PathwayId,
  type PathwayModel,
  type PathwayState,
} from '../domain/pathways';
import { createRoute, type MaterialRelationship, type RelationshipAction } from '../domain/relationships';
import { INTERNAL_MENU_TABS, type InternalMenuTab } from '../domain/policies';
import { searchLibraryMaterials, type MaterialSearchResult } from '../services/materialSearch';
import { getBookAvailability } from '../services/availability/orchestrator';
import { openAccessRoute, readAccessHandoff } from '../services/availability/handoff';
import type { AvailabilityResult, BookAccessRoute } from '../services/availability/types';
import { enrichAvailabilityWithAccounts } from '../services/libraryAccounts/routeEnrichment';
import { getLibraryAccountProviders, getLibraryAccountProvider, isPrototypeLibraryProviderEnabled } from '../services/libraryAccounts/registry';
import { removeLibraryAccount, readLibraryAccountState, upsertLibraryAccount } from '../services/libraryAccounts/storage';
import { createPrototypeAccount } from '../services/libraryAccounts/providers/prototypeLibraryAccount';
import {
  describeLibraryAccountStatus,
  formatLibraryAccountStatus,
  getMostRelevantAccount,
} from '../services/libraryAccounts/accountUtils';
import type { ConnectedLibraryAccount, LibraryAccountProvider, LibraryAccountStatus } from '../services/libraryAccounts/types';
import {
  CONTROL_CENTER_PREFERENCES_STORAGE_KEY,
  LANGUAGE_OPTIONS,
  TIMEZONE_OPTIONS,
  createDockPreferencesFromIdentity,
  fallbackWeatherContext,
  formatRecentMaterialLine,
  formatStudentIdentityLine,
  formatWeatherContext,
  normalizeDockPreferences,
  normalizeLocale,
  normalizeTimezone,
  type RecentMaterialContext,
  type StudentDockPreferences,
  type WeatherContext,
} from '../domain/controlCenter';
import type { OrientationIdentity } from '../domain/signupProtocol';
import {
  createSphereCartography,
  type CartographyNode,
  type SphereCartography,
  type SupportNode,
} from '../domain/sphereCartography';
import { createDemoSphereMaterials } from '../domain/sphereCartographyFixtures';
import './SphereUI.css';

type SizeKey = 'XS' | 'S' | 'M' | 'L' | 'XL';

type Rotation = {
  x: number;
  y: number;
};

type SpherePoint = {
  char: string;
  label?: string;
  position: [number, number, number];
};

type ProjectedPoint = {
  alpha: number;
  char: string;
  depth: number;
  label?: string;
  scale: number;
  x: number;
  y: number;
};

export const SPHERE_SIZE_PRESETS: Record<SizeKey, number> = {
  XS: 260,
  S: 340,
  M: 440,
  L: 560,
  XL: 680,
};

const SPHERE_RESPONSIVE_RULES: Record<SizeKey, { min: number; ratio: number; max: number }> = {
  XS: { min: 260, ratio: 0.36, max: 360 },
  S: { min: 340, ratio: 0.48, max: 500 },
  M: { min: 420, ratio: 0.54, max: 600 },
  L: { min: 520, ratio: 0.58, max: 700 },
  XL: { min: 620, ratio: 0.62, max: 780 },
};

const DATA_LABELS = ['LAT', 'LONG', 'ALT', 'SYS', 'NODE', 'SUPPORT', 'SIGNAL'];
const ASCII_CHARS = ['.', ':', '+', '*', '·', 'x', 'o'];
// The visual scale is designed for future expansion; M-XL remain postponed until those states are stable.
const SCALE_NODES: Array<{ key: SizeKey; enabled: boolean }> = [
  { key: 'XS', enabled: true },
  { key: 'S', enabled: true },
  { key: 'M', enabled: false },
  { key: 'L', enabled: false },
  { key: 'XL', enabled: false },
];
const ACTIVE_SIZE_KEYS = SCALE_NODES.filter((node) => node.enabled).map((node) => node.key);
const SUPPORT_MODULES = ['RX', 'NAV', 'SYS', 'MEM', 'ALT', 'LOG', 'IO', 'MAP', 'COM', 'AID', 'OBS', 'REF'];
const NEUTRAL_ROTATION: Rotation = { x: -0.18, y: 0.36 };
const MATERIAL_STORAGE_KEY = 'selbrucivo.library.materials.v1';
const RELATIONSHIP_OPTIONS: Array<{ id: LibraryBookRelationshipType; label: string }> = [
  { id: 'physical-copy', label: 'Physical Copy' },
  { id: 'library-loan', label: 'Library Loan' },
  { id: 'digital-purchase', label: 'Digital Purchase' },
  { id: 'audiobook', label: 'Audiobook' },
  { id: 'institution-access', label: 'Institution Access' },
  { id: 'open-access', label: 'Open Access' },
  { id: 'reference-only', label: 'Reference Only' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'researching', label: 'Researching' },
];
const SHELF_OPTIONS: Array<{ id: LibraryBookShelfGroup; label: string }> = [
  { id: 'currently-reading', label: 'Currently Reading' },
  { id: 'reading-queue', label: 'Reading Queue' },
  { id: 'recently-added', label: 'Recently Added' },
  { id: 'completed-reading', label: 'Completed Reading' },
  { id: 'reference-shelf', label: 'Reference Shelf' },
  { id: 'wishlist', label: 'Wishlist' },
];
const createIdleAvailabilityResult = (materialId = ''): AvailabilityResult => ({
  materialId,
  state: 'idle',
  routes: [],
  providers: [],
});

function formatBookRelationship(type?: LibraryBookRelationshipType) {
  return RELATIONSHIP_OPTIONS.find((option) => option.id === type)?.label ?? 'Researching';
}

function formatShelfGroup(group?: LibraryBookShelfGroup) {
  return SHELF_OPTIONS.find((option) => option.id === group)?.label ?? 'Recently Added';
}

function formatRouteKind(kind: BookAccessRoute['kind']) {
  const labels: Record<BookAccessRoute['kind'], string> = {
    'catalog-record': 'Catalog Record',
    'digital-borrow': 'Digital Library Access',
    'full-view': 'Full View Available',
    'institution-access': 'Institution Access',
    'interlibrary-request': 'Interlibrary Request',
    'open-access': 'Open Access',
    'physical-holding': 'Library Holding Found',
    preview: 'Limited Preview',
    purchase: 'Purchase',
  };

  return labels[kind];
}

function getRouteActionLabel(kind: BookAccessRoute['kind']) {
  const labels: Record<BookAccessRoute['kind'], string> = {
    'catalog-record': 'VIEW PROVIDER RECORD',
    'digital-borrow': 'CONTINUE TO PROVIDER',
    'full-view': 'READ THROUGH PROVIDER',
    'institution-access': 'CONTINUE TO PROVIDER',
    'interlibrary-request': 'CONTINUE TO PROVIDER',
    'open-access': 'OPEN SOURCE',
    'physical-holding': 'VIEW LIBRARY RECORD',
    preview: 'VIEW PREVIEW',
    purchase: 'CONTINUE TO PROVIDER',
  };

  return labels[kind];
}

function formatRouteCondition(route: BookAccessRoute) {
  if (route.requiresInstitutionLogin) {
    return 'Authentication may be required.';
  }

  if (route.requiresLibraryCard) {
    return 'Library card or provider account may be required.';
  }

  if (!route.eligibilityKnown) {
    return 'Current eligibility is unknown.';
  }

  return 'No eligibility requirement reported by this provider.';
}

function formatRouteConfidence(route: BookAccessRoute) {
  if (route.isMocked || route.confidence === 'mocked') {
    return 'Development mock / not live provider data.';
  }

  if (route.confidence === 'catalog-only') {
    return 'Catalog record / current availability unknown.';
  }

  if (route.confidence === 'provider-reported') {
    return 'Provider-reported.';
  }

  if (route.confidence === 'live') {
    return 'Checked recently.';
  }

  return 'Confidence unknown.';
}

function getRouteMeaningGroup(kind: BookAccessRoute['kind']) {
  if (kind === 'open-access' || kind === 'full-view') {
    return 'READ';
  }

  if (kind === 'preview') {
    return 'PREVIEW';
  }

  if (kind === 'digital-borrow' || kind === 'physical-holding' || kind === 'institution-access' || kind === 'interlibrary-request') {
    return 'LIBRARY ACCESS';
  }

  return 'REFERENCE';
}

function getAccountContextLine(route: BookAccessRoute) {
  if (!route.accountContext?.isPrototype) {
    return undefined;
  }

  if (route.accountContext.authorizationState === 'reauthentication-required') {
    return 'Prototype membership recognized; renewed authorization is needed for account-specific context.';
  }

  if (route.accountContext.eligibility === 'possibly-eligible') {
    return 'Prototype membership context available. Actual eligibility remains provider-controlled.';
  }

  return 'Prototype account context is present. This does not confirm access.';
}

function getProviderContextLabel(provider: LibraryAccountProvider) {
  if (provider.kind === 'prototype') {
    return 'PROTOTYPE CONNECTION';
  }

  if (provider.kind === 'public-source' && provider.id === 'open-library') {
    return 'PUBLIC ACCESS SOURCE';
  }

  if (provider.kind === 'public-source') {
    return 'PUBLIC BOOK SOURCE';
  }

  return 'CONFIGURATION REQUIRED';
}

function createDefaultStudentRelationship(accessType: LibraryBookRelationshipType, now: string): StudentBookRelationship {
  return {
    relationshipStatus: accessType === 'wishlist' ? 'wishlist' : accessType === 'reference-only' ? 'reference-shelf' : 'recently-added',
    accessType,
    currentEngagement: 'Relationship started',
    readingNotes: [],
    highlights: [],
    citations: [],
    bookmarks: [],
    linkedEssays: [],
    archiveReferences: [],
    trainStationReferences: [],
    lastOpened: now,
    dateAdded: now,
  };
}
function createSeedMaterials() {
  return PATHWAY_REGISTRY.flatMap((pathway) =>
    pathway.sections.flatMap((section, sectionIndex) =>
      section.items.map((item, itemIndex) => ({
        id: `${pathway.id}-${sectionIndex}-${itemIndex}`,
        title: compactTitle(item),
        kind: pathway.materialKind,
        lifecycleStage: pathway.lifecycleStage,
        originPathway: pathway.id,
        currentPathways: [pathway.id],
        sourceMaterialIds: [],
        linkedMaterialIds: [],
        routeHistory: [],
        ...createMaterialIdentityMetadata(section.title),
      } satisfies SphereMaterial)),
    ),
  );
}

function createInitialMaterials(isDemoMode: boolean) {
  const seedMaterials = createSeedMaterials();

  if (isDemoMode) {
    return [...createDemoSphereMaterials(), ...seedMaterials];
  }

  try {
    const stored = window.localStorage.getItem(MATERIAL_STORAGE_KEY);
    const storedMaterials = stored ? JSON.parse(stored) as SphereMaterial[] : [];
    return storedMaterials.length > 0 ? [...storedMaterials, ...seedMaterials] : seedMaterials;
  } catch {
    return seedMaterials;
  }
}

function isActivePathwayState(state: PathwayState) {
  return isPanelActive(state);
}

function getResponsiveSphereSize(sizeKey: SizeKey, viewport: { width: number; height: number }) {
  const rule = SPHERE_RESPONSIVE_RULES[sizeKey];
  const viewportMin = Math.min(viewport.width, viewport.height);
  const viewportCeiling = viewport.width < 720 ? viewportMin * 0.68 : viewportMin * 0.62;
  const sizeCeiling = Math.min(rule.max, viewportCeiling);
  const idealSize = Math.max(rule.min, viewportMin * rule.ratio);

  return Math.round(Math.min(sizeCeiling, idealSize));
}

function useMaterialRelationshipLayer(isDemoMode: boolean) {
  const [materials, setMaterials] = useState<SphereMaterial[]>(() => {
    return createInitialMaterials(isDemoMode);
  });
  const [relationships, setRelationships] = useState<MaterialRelationship[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState<string | undefined>(() => createSeedMaterials()[0]?.id);
  const [lastActiveMaterial, setLastActiveMaterial] = useState<RecentMaterialContext | undefined>();
  const materialCounterRef = useRef(0);
  const relationshipCounterRef = useRef(0);

  const recordMaterialActivation = (material: SphereMaterial, pathwayId: PathwayId) => {
    setLastActiveMaterial({
      materialId: material.id,
      title: material.title,
      pathwayId,
      pathwayLabel: getPathwayLabel(pathwayId),
      lastActivatedAt: new Date().toISOString(),
    });
  };

  const activateMaterial = (material: SphereMaterial, pathwayId: PathwayId) => {
    setActiveMaterialId(material.id);
    recordMaterialActivation(material, pathwayId);
  };

  useEffect(() => {
    if (isDemoMode) {
      return;
    }

    const libraryMaterials = materials.filter((material) => material.pathwayState?.librarySection === 'active-materials/current-studies/books');
    window.localStorage.setItem(MATERIAL_STORAGE_KEY, JSON.stringify(libraryMaterials));
  }, [isDemoMode, materials]);

  const createMaterial = (
    pathwayId: PathwayId,
    title: string,
    options: Partial<Pick<SphereMaterial, 'kind' | 'lifecycleStage' | 'sourceMaterialIds' | 'linkedMaterialIds' | 'body' | 'parentSection'>> = {},
  ) => {
    const id = `${pathwayId}-material-${materialCounterRef.current}`;
    materialCounterRef.current += 1;
    const pathwayDefinition = getPathwayDefinition(pathwayId);
    const material: SphereMaterial = {
      id,
      title: compactTitle(title),
      kind: options.kind ?? pathwayDefinition?.materialKind ?? 'reference',
      lifecycleStage: options.lifecycleStage ?? pathwayDefinition?.lifecycleStage ?? 'engagement',
      originPathway: pathwayId,
      currentPathways: [pathwayId],
      sourceMaterialIds: options.sourceMaterialIds ?? [],
      linkedMaterialIds: options.linkedMaterialIds ?? [],
      routeHistory: [],
      ...createMaterialIdentityMetadata(options.parentSection),
      body: options.body,
    };

    setMaterials((current) => [material, ...current]);
    activateMaterial(material, pathwayId);
    return material;
  };

  const ensureMaterial = (pathwayId: PathwayId, title: string) => {
    const existing = materials.find((material) => material.title === compactTitle(title) && material.currentPathways.includes(pathwayId));

    if (existing) {
      activateMaterial(existing, pathwayId);
      return existing;
    }

    return createMaterial(pathwayId, title);
  };

  const appendRelationship = (
    action: RelationshipAction,
    source: SphereMaterial,
    target: SphereMaterial,
    fromPathway: PathwayId,
    toPathway: PathwayId,
    label: string,
  ) => {
    const id = `relationship-${relationshipCounterRef.current}`;
    relationshipCounterRef.current += 1;
    const relationship: MaterialRelationship = {
      id,
      action,
      at: new Date().toISOString(),
      fromMaterialId: source.id,
      toMaterialId: target.id,
      fromPathway,
      toPathway,
      label,
    };

    setRelationships((current) => [relationship, ...current].slice(0, 48));
  };

  const routeMaterial = (pathwayId: PathwayId, title: string, destination?: string) => {
    const destinationPathway = getDestinationPathway(destination);

    if (!destinationPathway) {
      return `${destination ?? 'Destination'} remains doctrinal only`;
    }

    const source = ensureMaterial(pathwayId, title);
    const action: RelationshipAction = pathwayId === 'essays' && destinationPathway === 'archive' ? 'preserve' : 'route';
    const destinationDefinition = getPathwayDefinition(destinationPathway);
    const routedMaterial: SphereMaterial = {
      ...source,
      currentPathways: uniqueValues([...source.currentPathways, destinationPathway]),
      lifecycleStage: destinationDefinition?.lifecycleStage ?? source.lifecycleStage,
      kind: destinationPathway === 'archive' ? 'archive-record' : source.kind,
      completed: action === 'preserve' ? true : source.completed,
      archivedAt: action === 'preserve' ? new Date().toISOString() : source.archivedAt,
      routeHistory: [...source.routeHistory, createRoute(action, pathwayId, destinationPathway)],
      updatedAt: new Date().toISOString(),
    };

    setMaterials((current) => current.map((material) => (material.id === source.id ? routedMaterial : material)));
    appendRelationship(action, source, routedMaterial, pathwayId, destinationPathway, `${source.title} -> ${destination}`);
    activateMaterial(routedMaterial, pathwayId);
    return `${action === 'preserve' ? 'Preserved' : 'Routed'}: ${source.title} -> ${destination}`;
  };

  const linkMaterial = (pathwayId: PathwayId, title: string, destination?: string) => {
    const destinationPathway = getDestinationPathway(destination);

    if (!destinationPathway) {
      return `${destination ?? 'Reference'} link noted without pathway transfer`;
    }

    const source = ensureMaterial(pathwayId, title);
    const destinationDefinition = getPathwayDefinition(destinationPathway);
    const target = createMaterial(destinationPathway, `${source.title} reference`, {
      kind: destinationDefinition?.materialKind,
      lifecycleStage: destinationDefinition?.lifecycleStage,
      sourceMaterialIds: [source.id],
      linkedMaterialIds: [source.id],
    });

    setMaterials((current) =>
      current.map((material) =>
        material.id === source.id
          ? {
              ...material,
              linkedMaterialIds: uniqueValues([...material.linkedMaterialIds, target.id]),
              updatedAt: new Date().toISOString(),
            }
          : material,
      ),
    );
    appendRelationship('link', source, target, pathwayId, destinationPathway, `${source.title} linked to ${destination}`);
    activateMaterial(source, pathwayId);
    return `Linked: ${source.title} -> ${destination}`;
  };

  const captureMaterial = (pathwayId: PathwayId, title: string, actionLabel: string) => {
    const captured = createMaterial(pathwayId, title, {
      body: `${actionLabel}: ${title}`,
    });
    return `Captured material: ${captured.title}`;
  };

  const composeFromMaterial = (pathwayId: PathwayId, title: string) => {
    const source = ensureMaterial(pathwayId, title);
    const draft = createMaterial('essays', `Draft from ${source.title}`, {
      kind: 'draft',
      lifecycleStage: 'synthesis',
      sourceMaterialIds: [source.id],
    });
    appendRelationship('compose', source, draft, pathwayId, 'essays', `${source.title} opened as draft`);
    return `Draft created: ${draft.title}`;
  };

  const completeMaterial = (pathwayId: PathwayId, title: string) => {
    const source = ensureMaterial(pathwayId, title);
    setMaterials((current) =>
      current.map((material) =>
        material.id === source.id
          ? {
              ...material,
              kind: 'essay',
              lifecycleStage: 'reflection',
              completed: true,
              routeHistory: [...material.routeHistory, createRoute('complete', pathwayId, pathwayId)],
              updatedAt: new Date().toISOString(),
            }
          : material,
      ),
    );
    return `Marked complete by student: ${source.title}`;
  };

  const openMaterial = (pathwayId: PathwayId, title: string) => {
    const material = ensureMaterial(pathwayId, title);
    activateMaterial(material, pathwayId);
    return `Opened material: ${material.title}`;
  };

  const removeMaterial = (pathwayId: PathwayId, title: string) => {
    const material = ensureMaterial(pathwayId, title);
    setMaterials((current) =>
      current.map((item) =>
        item.id === material.id
          ? {
              ...item,
              currentPathways: item.currentPathways.filter((currentPathway) => currentPathway !== pathwayId),
              routeHistory: [...item.routeHistory, createRoute('remove', pathwayId, pathwayId)],
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    return `Removed from ${getPathwayDefinition(pathwayId)?.label}: ${material.title}`;
  };

  const activateMaterialById = (pathwayId: PathwayId, materialId: string) => {
    const material = materials.find((item) => item.id === materialId);

    if (!material) {
      return;
    }

    activateMaterial(material, pathwayId);
  };

  const saveLibraryBookMaterial = (result: MaterialSearchResult, accessType: LibraryBookRelationshipType) => {
    const externalId = result.identifiers?.externalId ?? result.id;
    const existing = materials.find((material) => (
      material.currentPathways.includes('library') &&
      material.pathwayState?.librarySection === 'active-materials/current-studies/books' &&
      (
        material.identifiers?.externalId === externalId ||
        (result.identifiers?.isbn && material.identifiers?.isbn === result.identifiers.isbn) ||
        material.title === compactTitle(result.title)
      )
    ));

    if (existing) {
      activateMaterial(existing, 'library');
      const now = new Date().toISOString();
      setMaterials((current) => current.map((material) => material.id === existing.id ? {
        ...material,
        studentRelationship: {
          ...(material.studentRelationship ?? createDefaultStudentRelationship(accessType, now)),
          accessType,
          lastOpened: now,
        },
        updatedAt: now,
      } : material));
      return `${existing.title} relationship updated.`;
    }

    const id = `library-book-material-${materialCounterRef.current}`;
    materialCounterRef.current += 1;
    const now = new Date().toISOString();
    const material: SphereMaterial = {
      id,
      title: compactTitle(result.title),
      creator: result.creator,
      kind: 'reference',
      materialType: result.materialType,
      lifecycleStage: 'engagement',
      originPathway: 'library',
      currentPathways: ['library'],
      sourceMaterialIds: [],
      linkedMaterialIds: [],
      routeHistory: [createRoute('route', 'library', 'library')],
      parentSection: 'Current Studies / Books',
      source: result.source,
      description: result.description,
      thumbnail: result.thumbnail,
      publicationYear: result.publicationYear,
      language: result.language,
      subjects: result.subjects,
      editions: result.editions,
      accessSources: result.accessSources,
      relatedMaterialTitles: result.relatedMaterialTitles,
      identifiers: {
        ...result.identifiers,
        externalId,
      },
      pathwayState: {
        currentPathway: 'library',
        librarySection: 'active-materials/current-studies/books',
        status: 'active-study',
      },
      createdAt: now,
      updatedAt: now,
      searchIndexing: {
        status: 'not-indexed',
      },
      importSource: {
        sourceType: 'external-import',
        externalId,
        sourceUrl: result.providerUrl,
      },
      studentRelationship: createDefaultStudentRelationship(accessType, now),
    };

    setMaterials((current) => [material, ...current]);
    activateMaterial(material, 'library');
    return `${material.title} saved as Active Material.`;
  };

  const updateLibraryBookRelationship = (materialId: string, patch: Partial<StudentBookRelationship>) => {
    setMaterials((current) => current.map((material) => {
      if (material.id !== materialId) {
        return material;
      }

      const now = new Date().toISOString();
      const relationship = material.studentRelationship ?? createDefaultStudentRelationship('researching', now);

      return {
        ...material,
        studentRelationship: {
          ...relationship,
          ...patch,
          lastOpened: now,
        },
        updatedAt: now,
      };
    }));
  };

  const addLibraryBookNote = (materialId: string, body: string) => {
    const trimmed = body.trim();

    if (!trimmed) {
      return;
    }

    setMaterials((current) => current.map((material) => {
      if (material.id !== materialId) {
        return material;
      }

      const now = new Date().toISOString();
      const relationship = material.studentRelationship ?? createDefaultStudentRelationship('researching', now);

      return {
        ...material,
        studentRelationship: {
          ...relationship,
          readingNotes: [{ id: `note-${now}`, body: trimmed, createdAt: now }, ...relationship.readingNotes],
          lastOpened: now,
        },
        updatedAt: now,
      };
    }));
  };

  const addLibraryBookHighlight = (materialId: string, text: string) => {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    setMaterials((current) => current.map((material) => {
      if (material.id !== materialId) {
        return material;
      }

      const now = new Date().toISOString();
      const relationship = material.studentRelationship ?? createDefaultStudentRelationship('researching', now);

      return {
        ...material,
        studentRelationship: {
          ...relationship,
          highlights: [{ id: `highlight-${now}`, text: trimmed, createdAt: now }, ...relationship.highlights],
          lastOpened: now,
        },
        updatedAt: now,
      };
    }));
  };

  const addLibraryBookCitation = (materialId: string, citation: { page?: string; chapter?: string; location?: string; studentNote?: string }) => {
    if (!citation.page?.trim() && !citation.chapter?.trim() && !citation.location?.trim() && !citation.studentNote?.trim()) {
      return;
    }

    setMaterials((current) => current.map((material) => {
      if (material.id !== materialId) {
        return material;
      }

      const now = new Date().toISOString();
      const relationship = material.studentRelationship ?? createDefaultStudentRelationship('researching', now);

      return {
        ...material,
        studentRelationship: {
          ...relationship,
          citations: [{ id: `citation-${now}`, createdAt: now, ...citation }, ...relationship.citations],
          lastOpened: now,
        },
        updatedAt: now,
      };
    }));
  };

  return {
    activeMaterialId,
    lastActiveMaterial,
    materials,
    relationships,
    captureMaterial,
    completeMaterial,
    composeFromMaterial,
    linkMaterial,
    openMaterial,
    removeMaterial,
    routeMaterial,
    saveLibraryBookMaterial,
    updateLibraryBookRelationship,
    addLibraryBookCitation,
    addLibraryBookHighlight,
    addLibraryBookNote,
    activateMaterialById,
  };
}

function PathwayLabel({
  isSuppressed = false,
  pathway,
  handlers,
}: {
  isSuppressed?: boolean;
  pathway: PathwayModel;
  handlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
    onClick: () => void;
  };
}) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isSuppressed || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    event.preventDefault();
    handlers.onClick();
  };

  if (pathway.enabled) {
    return (
      <button
        className={`pathway-label pathway-label-${pathway.position} pathway-trigger ${pathway.id}-pathway-trigger`}
        type="button"
        aria-label={`Select ${pathway.label} pathway`}
        aria-hidden={isSuppressed}
        aria-pressed={isActivePathwayState(pathway.state)}
        data-pathway-id={pathway.id}
        data-pathway-direction={pathway.direction}
        data-pathway-state={pathway.state}
        tabIndex={isSuppressed ? -1 : undefined}
        {...handlers}
        onKeyDown={handleKeyDown}
      >
        {pathway.label}
      </button>
    );
  }

  return (
    <span
      className={`pathway-label pathway-label-${pathway.position}`}
      aria-hidden="true"
      data-pathway-id={pathway.id}
      data-pathway-direction={pathway.direction}
    >
      {pathway.label}
    </span>
  );
}

function PathwayMetadata({ pathway }: { pathway: PathwayModel }) {
  const showCounts = pathway.state === 'hover' || pathway.state === 'focused';
  const showFocus = pathway.state === 'focused';

  if (!showCounts && !showFocus) {
    return null;
  }

  return (
    <aside className={`pathway-metadata ${pathway.id}-metadata`} aria-live="polite">
      {showCounts && (
        <div className="pathway-meta-group">
          {pathway.counts.map((count) => (
            <span key={count}>{count}</span>
          ))}
        </div>
      )}

      {showFocus && (
        <div className="pathway-meta-group pathway-meta-focus">
          <span>{pathway.summary}</span>
          {pathway.preview.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}
    </aside>
  );
}

function PathwayEntryPanel({
  pathway,
  previewMaterialTitle,
  onOpenPathway,
  onReturnFromOverview,
}: {
  pathway: PathwayModel;
  previewMaterialTitle?: string;
  onOpenPathway: () => void;
  onReturnFromOverview: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (pathway.state === 'selected') {
      const focusTimer = window.setTimeout(() => {
        panelRef.current?.focus({ preventScroll: true });
      }, 0);

      return () => window.clearTimeout(focusTimer);
    }

    return undefined;
  }, [pathway.id, pathway.state]);

  if (pathway.state !== 'selected') {
    return null;
  }

  return (
    <aside
      ref={panelRef}
      className={`pathway-entry-panel ${pathway.id}-entry-panel`}
      aria-label={`${pathway.label} entry metadata`}
      tabIndex={-1}
    >
      <span>{pathway.label} SELECTED</span>
      {pathway.id === 'library' && (
        <div className="pathway-entry-overview-list" aria-label="Library pathway overview">
          <span>Active Study / Current Engagement</span>
          <span>{pathway.summary}</span>
          {previewMaterialTitle && <span>Recent Material: {previewMaterialTitle}</span>}
        </div>
      )}
      {pathway.id !== 'library' && <span>{pathway.summary}</span>}
      <button className="pathway-action-control" type="button" onClick={onOpenPathway}>
        {pathway.entryAction}
      </button>
      <button className="pathway-return-control" type="button" onClick={onReturnFromOverview}>
        Return to Sphere
      </button>
    </aside>
  );
}

function formatPanelLevel(level: OrientationSnapshot<PathwayId>['returnTarget']) {
  if (level === 'threshold') {
    return 'Threshold';
  }

  return level
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatEnvironmentDateTime(now: Date, preferences: StudentDockPreferences) {
  const locale = normalizeLocale(preferences.language);
  const timeZone = normalizeTimezone(preferences.timezone);
  const dateParts = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone,
  }).formatToParts(now);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((part) => part.type === type)?.value ?? '';
  const time = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: preferences.timeFormat === '12h',
    timeZone,
  }).format(now);

  return {
    date: [getPart('weekday'), getPart('day'), getPart('month')].filter(Boolean).join(' ').toUpperCase(),
    time: time.toUpperCase(),
  };
}

function ControlCenterDock({
  preferences,
  recentMaterial,
  weather,
  onOpenStudentSettings,
}: {
  preferences: StudentDockPreferences;
  recentMaterial?: RecentMaterialContext;
  weather?: WeatherContext;
  onOpenStudentSettings: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const { date, time } = formatEnvironmentDateTime(now, preferences);
  const identityLine = formatStudentIdentityLine(preferences);
  const weatherLine = preferences.showWeather && weather ? formatWeatherContext(weather, preferences.temperatureUnit) : '';
  const recentLine = preferences.showRecentMaterial ? formatRecentMaterialLine(recentMaterial) : '';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="control-center-dock" aria-label="Control Center Dock">
      <div className="control-center-zone control-center-zone-left">
        <span className="dock-date">{date}</span>
        <span>{time}</span>
        {weatherLine && <span className="dock-weather">{weatherLine}</span>}
      </div>

      <button
        className="control-center-identity"
        type="button"
        aria-label={`Open student settings for ${preferences.displayName || 'student'}`}
        onClick={onOpenStudentSettings}
      >
        <span>{identityLine}</span>
        <small aria-hidden="true">OPEN STUDENT SETTINGS</small>
      </button>

      <div className="control-center-zone control-center-zone-right">
        {recentLine && <span>{recentLine}</span>}
      </div>
    </div>
  );
}

function StudentSettingsEnvironment({
  preferences,
  state,
  onOpenLibraryConnections,
  onPreferenceChange,
  onReturnToSphere,
}: {
  preferences: StudentDockPreferences;
  state: 'student-settings' | 'returning-to-orientation';
  onOpenLibraryConnections: () => void;
  onPreferenceChange: (patch: Partial<StudentDockPreferences>) => void;
  onReturnToSphere: () => void;
}) {
  const isReturning = state === 'returning-to-orientation';
  const updateText = (field: keyof Pick<StudentDockPreferences, 'displayName' | 'preferredTitle' | 'schoolName' | 'programOfStudy' | 'majorOrDiscipline' | 'careerTitle'>) => (
    event: ChangeEvent<HTMLInputElement>
  ) => onPreferenceChange({ [field]: event.target.value });

  return (
    <section
      className={`student-settings-environment ${isReturning ? 'is-returning' : ''}`}
      aria-label="Student settings environment"
      aria-busy={isReturning}
    >
      <div className="student-settings-return-region">
        <button className="pathway-return-control" type="button" onClick={onReturnToSphere} disabled={isReturning}>
          RETURN TO SPHERE
        </button>
      </div>

      <div className="student-settings-inner">
        <div className="student-settings-heading">
          <span className="pathway-section-title">STUDENT SETTINGS</span>
          <span>Environment construction remains editable.</span>
        </div>

        <div className="student-settings-grid">
          <section className="student-settings-group" aria-label="Identity">
            <span className="pathway-section-title">IDENTITY</span>
            <label>
              <span>Preferred display name</span>
              <input value={preferences.displayName} onChange={updateText('displayName')} disabled={isReturning} />
            </label>
            <label>
              <span>Preferred title</span>
              <input value={preferences.preferredTitle} onChange={updateText('preferredTitle')} disabled={isReturning} />
            </label>
          </section>

          <section className="student-settings-group" aria-label="Educational context">
            <span className="pathway-section-title">EDUCATIONAL CONTEXT</span>
            <label>
              <span>School name</span>
              <input value={preferences.schoolName} onChange={updateText('schoolName')} disabled={isReturning} />
            </label>
            <label>
              <span>Program of study</span>
              <input value={preferences.programOfStudy} onChange={updateText('programOfStudy')} disabled={isReturning} />
            </label>
            <label>
              <span>Major or discipline</span>
              <input value={preferences.majorOrDiscipline} onChange={updateText('majorOrDiscipline')} disabled={isReturning} />
            </label>
            <label>
              <span>Career or professional title</span>
              <input value={preferences.careerTitle} onChange={updateText('careerTitle')} disabled={isReturning} />
            </label>
          </section>

          <section className="student-settings-group" aria-label="Environment">
            <span className="pathway-section-title">ENVIRONMENT</span>
            <label>
              <span>Time zone</span>
              <select
                value={normalizeTimezone(preferences.timezone)}
                onChange={(event) => onPreferenceChange({ timezone: event.target.value })}
                disabled={isReturning}
              >
                {TIMEZONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <small>Time zone keeps the Control Center aligned with your current location or practice.</small>
            </label>
            <label>
              <span>Language</span>
              <select
                className="student-locale-select"
                value={normalizeLocale(preferences.language)}
                onChange={(event) => onPreferenceChange({ language: event.target.value })}
                disabled={isReturning}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <small>Language shapes regional date and time presentation. Expanded interface translation will inherit this preference in future phases.</small>
            </label>
          </section>

          <section className="student-settings-group" aria-label="Display preferences">
            <span className="pathway-section-title">DISPLAY PREFERENCES</span>
            <label>
              <span>Time format</span>
              <select
                value={preferences.timeFormat}
                onChange={(event) => onPreferenceChange({ timeFormat: event.target.value as StudentDockPreferences['timeFormat'] })}
                disabled={isReturning}
              >
                <option value="24h">24-hour</option>
                <option value="12h">12-hour</option>
              </select>
            </label>
            <label>
              <span>Temperature unit</span>
              <select
                value={preferences.temperatureUnit}
                onChange={(event) => onPreferenceChange({ temperatureUnit: event.target.value as StudentDockPreferences['temperatureUnit'] })}
                disabled={isReturning}
              >
                <option value="c">Celsius</option>
                <option value="f">Fahrenheit</option>
              </select>
            </label>
            <label className="student-settings-toggle">
              <input
                type="checkbox"
                checked={preferences.showWeather}
                onChange={(event) => onPreferenceChange({ showWeather: event.target.checked })}
                disabled={isReturning}
              />
              <span>Weather visibility</span>
            </label>
            <label className="student-settings-toggle">
              <input
                type="checkbox"
                checked={preferences.showContext}
                onChange={(event) => onPreferenceChange({ showContext: event.target.checked })}
                disabled={isReturning}
              />
              <span>Institution / career context visibility</span>
            </label>
            <label className="student-settings-toggle">
              <input
                type="checkbox"
                checked={preferences.showRecentMaterial}
                onChange={(event) => onPreferenceChange({ showRecentMaterial: event.target.checked })}
                disabled={isReturning}
              />
              <span>Recent-material visibility</span>
            </label>
            <button className="pathway-inline-action" type="button" onClick={onOpenLibraryConnections} disabled={isReturning}>
              LIBRARY CONNECTIONS
            </button>
          </section>
        </div>
      </div>
    </section>
  );
}

function LibraryEnvironmentShell({
  activeMaterial,
  discoveryState,
  libraryAccounts,
  materials,
  onBeginLibraryAccountConnection,
  onCancelLibraryAccountConnection,
  onDeclineLibraryAccountConnection,
  onDisconnectLibraryAccount,
  onAddLibraryBookCitation,
  onAddLibraryBookHighlight,
  onAddLibraryBookNote,
  onEnterMaterial,
  onEnterSection,
  onReturnOneDepth,
  onReturnToLibraryLanding,
  onReturnToPathwayOverview,
  onSaveLibraryBookMaterial,
  onSelectMaterial,
  onSetDiscoveryState,
  onUpdateLibraryBookRelationship,
  onSetPrototypeLibraryAccountStatus,
  orientation,
  pathway,
}: {
  activeMaterial?: SphereMaterial;
  discoveryState: BookDiscoveryState;
  libraryAccounts: ConnectedLibraryAccount[];
  materials: SphereMaterial[];
  onBeginLibraryAccountConnection: (providerId: string) => void;
  onCancelLibraryAccountConnection: (providerId: string) => void;
  onDeclineLibraryAccountConnection: (providerId: string) => void;
  onDisconnectLibraryAccount: (providerId: string) => void;
  onAddLibraryBookCitation: (materialId: string, citation: { page?: string; chapter?: string; location?: string; studentNote?: string }) => void;
  onAddLibraryBookHighlight: (materialId: string, text: string) => void;
  onAddLibraryBookNote: (materialId: string, body: string) => void;
  onEnterMaterial: (materialId: string, sectionId?: string) => void;
  onEnterSection: (sectionId: string) => void;
  onReturnOneDepth: () => void;
  onReturnToLibraryLanding: () => void;
  onReturnToPathwayOverview: () => void;
  onSaveLibraryBookMaterial: (result: MaterialSearchResult, accessType: LibraryBookRelationshipType) => string;
  onSelectMaterial: (materialId: string) => void;
  onSetDiscoveryState: Dispatch<SetStateAction<BookDiscoveryState>>;
  onUpdateLibraryBookRelationship: (materialId: string, patch: Partial<StudentBookRelationship>) => void;
  onSetPrototypeLibraryAccountStatus: (status: LibraryAccountStatus) => void;
  orientation: OrientationSnapshot<PathwayId>;
  pathway: PathwayModel;
}) {
  const environmentRef = useRef<HTMLElement>(null);
  const currentStudyBooks = materials.filter((material) => (
    material.currentPathways.includes('library') &&
    material.pathwayState?.librarySection === 'active-materials/current-studies/books'
  ));
  const activeLibraryMaterial = activeMaterial?.currentPathways.includes('library') ? activeMaterial : undefined;
  const materialTitle = activeLibraryMaterial?.title ?? orientation.activeMaterialId ?? '';
  const isBooksWorkspace = orientation.activeLevel === 'material-view' && (
    orientation.activeSectionId === 'Current Studies' &&
    (materialTitle === 'Books' || !activeLibraryMaterial)
  );
  const isBookMaterialWorkspace = activeLibraryMaterial?.pathwayState?.librarySection === 'active-materials/current-studies/books';
  const headerMaterial = activeLibraryMaterial?.title ?? (isBooksWorkspace ? 'BOOKS' : orientation.activeSectionId ?? 'ACTIVE SHELF');
  const recentlyOpened = currentStudyBooks.slice(0, 3);
  const currentlyReading = currentStudyBooks.filter((material) => material.studentRelationship?.relationshipStatus === 'currently-reading').slice(0, 3);
  const selectedSection = pathway.sections.find((section) => section.title === orientation.activeSectionId);

  const openBooksDiscovery = () => {
    onEnterMaterial('library:Current Studies:Books', 'Current Studies');
    onSetDiscoveryState((current) => ({
      ...current,
      stage: current.results.length > 0 ? current.stage : 'search',
    }));
  };

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      environmentRef.current?.focus({ preventScroll: true });
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, []);

  return (
    <section
      ref={environmentRef}
      className={`library-dedicated-environment ${pathway.state === 'returning' ? 'is-returning' : ''}`}
      aria-label="Library environment"
      tabIndex={-1}
    >
      <div className="library-memory-layer" aria-hidden="true">
        <span>LIB / 021</span>
        <span>SHELF TRACE</span>
        <span>REF 047</span>
      </div>

      <header className="library-environment-header" aria-label="Library environment header">
        <button className="library-environment-title-control" type="button" onClick={onReturnToLibraryLanding}>
          LIBRARY
        </button>
        <span className="library-active-material" title={headerMaterial}>{headerMaterial}</span>
        <button className="pathway-return-control library-overview-return" type="button" onClick={onReturnToPathwayOverview}>
          RETURN TO PATHWAY OVERVIEW
        </button>
      </header>

      <div className="library-workspace-scroll">
        <nav className="library-local-navigation" aria-label="Library navigation">
          <button type="button" className="pathway-material-control" onClick={onReturnToLibraryLanding}>Continue Reading</button>
          <button type="button" className="pathway-material-control" onClick={() => onEnterSection('Recently Opened')}>Recently Opened</button>
          <button type="button" className="pathway-material-control" onClick={openBooksDiscovery}>Search Books</button>
          <button type="button" className="pathway-material-control" onClick={() => onEnterSection('Reference Shelf')}>My Shelf</button>
          <button type="button" className="pathway-material-control" onClick={() => onEnterSection('Connected Libraries')}>Connected Libraries</button>
        </nav>

        {orientation.activeLevel === 'pathway-environment' && (
          <div className="library-landing-grid">
            <section className="library-landing-lead">
              <span className="pathway-section-title">ACTIVE STUDY / CURRENT ENGAGEMENT</span>
              <span>Library gathers current materials, relationships, notes, highlights, and citations into a dedicated study environment.</span>
            </section>

            <section className="library-feature-panel">
              <span className="pathway-section-title">CURRENTLY READING</span>
              {currentlyReading.length > 0 ? currentlyReading.map((material) => (
                <button
                  key={material.id}
                  className="saved-material-card"
                  type="button"
                  onClick={() => {
                    onSelectMaterial(material.id);
                    onSetDiscoveryState((current) => ({ ...current, selectedSavedId: material.id, stage: 'workspace' }));
                    onEnterMaterial(material.id, 'Current Studies');
                  }}
                >
                  <span className="material-card-title">{material.title}</span>
                  {material.creator && <span>{material.creator}</span>}
                </button>
              )) : <span>No current reading relationship yet.</span>}
            </section>

            <section className="library-feature-panel">
              <span className="pathway-section-title">RECENTLY OPENED</span>
              {recentlyOpened.length > 0 ? recentlyOpened.map((material) => (
                <button
                  key={material.id}
                  className="saved-material-card"
                  type="button"
                  onClick={() => {
                    onSelectMaterial(material.id);
                    onSetDiscoveryState((current) => ({ ...current, selectedSavedId: material.id, stage: 'workspace' }));
                    onEnterMaterial(material.id, 'Current Studies');
                  }}
                >
                  <span className="material-card-title">{material.title}</span>
                  <span>{formatBookRelationship(material.studentRelationship?.accessType)}</span>
                </button>
              )) : <span>No books opened from discovery yet.</span>}
            </section>

            <section className="library-feature-panel library-search-invitation">
              <span className="pathway-section-title">BOOKS DISCOVERY</span>
              <span>Search connected book catalogs without configuring a relationship first.</span>
              <button className="pathway-inline-action" type="button" onClick={openBooksDiscovery}>
                SEARCH BOOKS
              </button>
            </section>
          </div>
        )}

        {orientation.activeLevel === 'section-view' && orientation.activeSectionId === 'Connected Libraries' && (
          <ConnectedLibrariesPanel
            accounts={libraryAccounts}
            onBeginConnection={onBeginLibraryAccountConnection}
            onCancelConnection={onCancelLibraryAccountConnection}
            onDeclineConnection={onDeclineLibraryAccountConnection}
            onDisconnectAccount={onDisconnectLibraryAccount}
            onSetPrototypeStatus={onSetPrototypeLibraryAccountStatus}
            onReturnToLibrary={onReturnOneDepth}
          />
        )}

        {orientation.activeLevel === 'section-view' && orientation.activeSectionId !== 'Connected Libraries' && (
          <section className="library-section-workspace" aria-label={`${orientation.activeSectionId ?? 'Library'} section`}>
            <div className="nested-panel-heading">
              <span className="pathway-section-title">SECTION VIEW</span>
              <span>{orientation.activeSectionId}</span>
            </div>
            <div className="pathway-material-columns">
              {(selectedSection?.items ?? []).map((item) => (
                <button
                  key={item}
                  className="pathway-material-control"
                  type="button"
                  onClick={() => {
                    if (item === 'Books') {
                      openBooksDiscovery();
                      return;
                    }

                    onEnterMaterial(`library:${orientation.activeSectionId ?? 'section'}:${item}`, orientation.activeSectionId);
                  }}
                >
                  {item}
                </button>
              ))}
              {orientation.activeSectionId === 'Reference Shelf' && currentStudyBooks.map((material) => (
                <button
                  key={material.id}
                  className="pathway-material-control"
                  type="button"
                  onClick={() => {
                    onSelectMaterial(material.id);
                    onSetDiscoveryState((current) => ({ ...current, selectedSavedId: material.id, stage: 'workspace' }));
                    onEnterMaterial(material.id, 'Current Studies');
                  }}
                >
                  {material.title}
                </button>
              ))}
            </div>
            <button className="pathway-return-control" type="button" onClick={onReturnOneDepth}>
              Return to Library
            </button>
          </section>
        )}

        {orientation.activeLevel === 'material-view' && (isBooksWorkspace || isBookMaterialWorkspace) && (
          <BookMaterialInput
            savedMaterials={currentStudyBooks}
            activeMaterial={activeLibraryMaterial}
            discoveryState={isBookMaterialWorkspace ? { ...discoveryState, stage: discoveryState.stage === 'workspace' ? 'workspace' : discoveryState.stage } : discoveryState}
            onAddCitation={onAddLibraryBookCitation}
            onAddHighlight={onAddLibraryBookHighlight}
            onAddNote={onAddLibraryBookNote}
            libraryAccounts={libraryAccounts}
            onSaveMaterial={onSaveLibraryBookMaterial}
            onSelectMaterial={onSelectMaterial}
            onSetDiscoveryState={onSetDiscoveryState}
            onUpdateRelationship={onUpdateLibraryBookRelationship}
          />
        )}

        {orientation.activeLevel === 'material-view' && !isBooksWorkspace && !isBookMaterialWorkspace && (
          <section className="library-section-workspace" aria-label="Library material">
            <div className="nested-panel-heading">
              <span className="pathway-section-title">MATERIAL VIEW</span>
              <span>{materialTitle || 'Selected Material'}</span>
            </div>
            <span>{activeLibraryMaterial?.description ?? 'Material registered in Library panel trail.'}</span>
            <button className="pathway-return-control" type="button" onClick={onReturnOneDepth}>
              Return to {formatPanelLevel(orientation.returnTarget)}
            </button>
          </section>
        )}
      </div>
    </section>
  );
}

function PathwayEnvironment({
  pathway,
  activeMaterial,
  discoveryState,
  materials,
  relationships,
  orientation,
  relationshipVisibilityMode,
  onCaptureMaterial,
  onCompleteMaterial,
  onComposeFromMaterial,
  onEnterMaterial,
  onEnterSection,
  onLinkMaterial,
  onOpenMaterial,
  onRemoveMaterial,
  onRouteMaterial,
  onAddLibraryBookCitation,
  onAddLibraryBookHighlight,
  onAddLibraryBookNote,
  onSaveLibraryBookMaterial,
  onSelectMaterial,
  onSetDiscoveryState,
  onSetPathwayInteractionState,
  onUpdateLibraryBookRelationship,
  onReturnFromPathway,
}: {
  pathway: PathwayModel;
  activeMaterial?: SphereMaterial;
  discoveryState: BookDiscoveryState;
  materials: SphereMaterial[];
  relationships: MaterialRelationship[];
  orientation: OrientationSnapshot<PathwayId>;
  relationshipVisibilityMode: RelationshipVisibilityMode;
  onCaptureMaterial: (pathwayId: PathwayId, title: string, actionLabel: string) => string;
  onCompleteMaterial: (pathwayId: PathwayId, title: string) => string;
  onComposeFromMaterial: (pathwayId: PathwayId, title: string) => string;
  onEnterMaterial: (materialId: string, sectionId?: string) => void;
  onEnterSection: (sectionId: string) => void;
  onLinkMaterial: (pathwayId: PathwayId, title: string, destination?: string) => string;
  onOpenMaterial: (pathwayId: PathwayId, title: string) => string;
  onRemoveMaterial: (pathwayId: PathwayId, title: string) => string;
  onRouteMaterial: (pathwayId: PathwayId, title: string, destination?: string) => string;
  onAddLibraryBookCitation: (materialId: string, citation: { page?: string; chapter?: string; location?: string; studentNote?: string }) => void;
  onAddLibraryBookHighlight: (materialId: string, text: string) => void;
  onAddLibraryBookNote: (materialId: string, body: string) => void;
  onSaveLibraryBookMaterial: (result: MaterialSearchResult, accessType: LibraryBookRelationshipType) => string;
  onSelectMaterial: (materialId: string) => void;
  onSetDiscoveryState: Dispatch<SetStateAction<BookDiscoveryState>>;
  onSetPathwayInteractionState: (state: PanelInteractionState | 'expanded') => void;
  onUpdateLibraryBookRelationship: (materialId: string, patch: Partial<StudentBookRelationship>) => void;
  onReturnFromPathway: () => void;
}) {
  const [activeTab, setActiveTab] = useState<InternalMenuTab>('materials');
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [stationEvents, setStationEvents] = useState<string[]>([]);
  const selectedSection = pathway.sections[selectedSectionIndex] ?? pathway.sections[0];
  const pathwayMaterials = materials.filter((material) => material.currentPathways.includes(pathway.id));
  const activePathwayMaterial = activeMaterial?.currentPathways.includes(pathway.id) ? activeMaterial : undefined;
  const primaryMaterial = activePathwayMaterial?.title || selectedMaterial || pathwayMaterials[0]?.title || selectedSection?.items[0] || 'Selected Material';
  const visibleSectionTitles = pathway.materialAreas;
  const actionGroups = pathway.actionGroups.map((groupName) => ({
    groupName,
    actions: pathway.actions.filter((action) => getActionGroup(pathway.id, action) === groupName),
  })).filter((group) => group.actions.length > 0);
  const shouldShowRelationships = relationshipVisibilityMode !== 'hidden';
  const currentStudyBooks = materials.filter((material) => (
    material.currentPathways.includes('library') &&
    material.pathwayState?.librarySection === 'active-materials/current-studies/books'
  ));
  const isCurrentStudiesBooksView = (
    pathway.id === 'library' &&
    orientation.activeLevel === 'material-view' &&
    orientation.activeSectionId === 'Current Studies' &&
    (activePathwayMaterial?.title ?? orientation.activeMaterialId) === 'Books'
  );
  const isLowerTierMaterialView = orientation.activeLevel === 'section-view' || orientation.activeLevel === 'material-view';
  const isSectionTierView = orientation.activeLevel === 'section-view';
  const isMaterialTierView = orientation.activeLevel === 'material-view';
  const relatedRelationships = shouldShowRelationships ? relationships.filter((relationship) =>
    relationship.fromPathway === pathway.id ||
    relationship.toPathway === pathway.id ||
    relationship.fromMaterialId === activePathwayMaterial?.id ||
    relationship.toMaterialId === activePathwayMaterial?.id,
  ) : [];

  useEffect(() => {
    setActiveTab('materials');
    setSelectedSectionIndex(0);
    setSelectedMaterial('');
    setSelectedRoute('');
    setStationEvents([]);
  }, [pathway.id]);

  if (!isEnvironmentPanelState(pathway.state)) {
    return null;
  }

  const handleAction = (action: PathwayAction) => {
    if (pathway.state === 'returning') {
      return;
    }

    if (action.kind === 'route') {
      setSelectedRoute(action.destination ?? action.label.replace(/^Route to /i, ''));
      onSetPathwayInteractionState('routing');
      return;
    }

    if (action.kind === 'link') {
      setSelectedRoute(action.destination ?? action.label.replace(/^Link (to )?/i, ''));
      onSetPathwayInteractionState('linking');
      return;
    }

    if (action.kind === 'hold') {
      setStationEvents((current) => [`Holding: ${primaryMaterial}`, ...current].slice(0, 3));
      onSetPathwayInteractionState('holding');
      return;
    }

    if (action.kind === 'capture') {
      const event = onCaptureMaterial(pathway.id, primaryMaterial, action.label);
      setStationEvents((current) => [event, ...current].slice(0, 3));
      onSetPathwayInteractionState('expanded');
      return;
    }

    if (action.kind === 'departure') {
      setStationEvents((current) => [`Departure marked: ${primaryMaterial}`, ...current].slice(0, 3));
      onSetPathwayInteractionState('expanded');
      return;
    }

    if (action.kind === 'remove') {
      const event = onRemoveMaterial(pathway.id, primaryMaterial);
      setStationEvents((current) => [event, ...current].slice(0, 3));
      onSetPathwayInteractionState('expanded');
      return;
    }

    if (action.kind === 'compose') {
      const event = onComposeFromMaterial(pathway.id, primaryMaterial);
      setStationEvents((current) => [event, ...current].slice(0, 3));
      onSetPathwayInteractionState('composing');
      return;
    }

    if (action.kind === 'revise') {
      setStationEvents((current) => [`Revision return: ${primaryMaterial}`, ...current].slice(0, 3));
      onSetPathwayInteractionState('revising');
      return;
    }

    if (action.kind === 'complete') {
      onSetPathwayInteractionState('completing');
      return;
    }

    const event = onOpenMaterial(pathway.id, primaryMaterial);
    setStationEvents((current) => [event, ...current].slice(0, 3));
    onSetPathwayInteractionState('expanded');
  };

  const confirmRoute = () => {
    const event = onRouteMaterial(pathway.id, primaryMaterial, selectedRoute);
    setStationEvents((current) => [event, ...current].slice(0, 3));
    onSetPathwayInteractionState('expanded');
  };

  const confirmLink = () => {
    const event = onLinkMaterial(pathway.id, primaryMaterial, selectedRoute);
    setStationEvents((current) => [event, ...current].slice(0, 3));
    onSetPathwayInteractionState('expanded');
  };

  const confirmCompletion = () => {
    const event = onCompleteMaterial(pathway.id, primaryMaterial);
    setStationEvents((current) => [event, ...current].slice(0, 3));
    onSetPathwayInteractionState('expanded');
  };

  return (
    <section
      className={[
        'pathway-environment',
        `${pathway.id}-environment`,
        pathway.state === 'returning' ? 'is-returning' : '',
        isLowerTierMaterialView ? 'is-lower-tier-material-view' : '',
        isSectionTierView ? 'is-section-tier-view' : '',
        isMaterialTierView ? 'is-material-tier-view' : '',
        isCurrentStudiesBooksView ? 'is-books-material-view' : '',
      ].join(' ')}
      aria-label={`${pathway.label} environment`}
    >
      <div className="pathway-environment-header">
        <div>
          <span className="pathway-environment-title">{pathway.label}</span>
          <span>{pathway.purpose}</span>
        </div>
        <button className="pathway-return-control" type="button" onClick={onReturnFromPathway}>
          Return to {formatPanelLevel(orientation.returnTarget)}
        </button>
      </div>

      <div className="pathway-section-tabs pathway-menu-tabs" role="tablist" aria-label={`${pathway.label} internal menu`}>
        {INTERNAL_MENU_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`pathway-section-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(pathway.state === 'routing' ||
        pathway.state === 'holding' ||
        pathway.state === 'composing' ||
        pathway.state === 'revising' ||
        pathway.state === 'linking' ||
        pathway.state === 'completing' ||
        stationEvents.length > 0) && (
        <div className="pathway-routing-status" aria-live="polite">
          {pathway.state === 'routing' && (
            <>
              <span>Routing: {primaryMaterial}</span>
              <span>Destination Preview: {selectedRoute}</span>
              <button className="pathway-inline-action" type="button" onClick={confirmRoute}>
                Confirm Route
              </button>
            </>
          )}

          {pathway.state === 'holding' && (
            <>
              <span>Holding: {primaryMaterial}</span>
              <span>Material remains inside {pathway.label}</span>
              <button className="pathway-inline-action" type="button" onClick={() => onSetPathwayInteractionState('expanded')}>
                Return to Station Board
              </button>
            </>
          )}

          {pathway.state === 'composing' && (
            <>
              <span>Composing: {primaryMaterial}</span>
              <span>Linked references remain available</span>
              <button className="pathway-inline-action" type="button" onClick={() => onSetPathwayInteractionState('expanded')}>
                Return to Desk Surface
              </button>
            </>
          )}

          {pathway.state === 'revising' && (
            <>
              <span>Revising: {primaryMaterial}</span>
              <span>Previous versions and margin notes available</span>
              <button className="pathway-inline-action" type="button" onClick={() => onSetPathwayInteractionState('expanded')}>
                Return to Revisions
              </button>
            </>
          )}

          {pathway.state === 'linking' && (
            <>
              <span>Linking: {primaryMaterial}</span>
              <span>Destination Preview: {selectedRoute}</span>
              <button className="pathway-inline-action" type="button" onClick={confirmLink}>
                Confirm Link
              </button>
            </>
          )}

          {pathway.state === 'completing' && (
            <>
              <span>Completing: {primaryMaterial}</span>
              <span>Completion is student-defined</span>
              <button className="pathway-inline-action" type="button" onClick={confirmCompletion}>
                Mark Complete
              </button>
            </>
          )}

          {stationEvents.map((event, eventIndex) => (
            <span key={`${event}-${eventIndex}`}>{event}</span>
          ))}
        </div>
      )}

      <div className="pathway-focus-panel">
        {activeTab === 'materials' && (
          <>
            <div className="pathway-focus-lead">
              <span className="pathway-section-title">Active Material</span>
              <span>{primaryMaterial}</span>
              {activePathwayMaterial ? (
                <span>{activePathwayMaterial.kind} / {activePathwayMaterial.lifecycleStage}</span>
              ) : (
                <span>Select or open a material to begin.</span>
              )}
            </div>

            <div className="pathway-material-columns">
              <div className="pathway-environment-section">
                <span className="pathway-section-title">Material Areas</span>
                {visibleSectionTitles.map((sectionTitle, sectionIndex) => (
                  <button
                    key={sectionTitle}
                    className={`pathway-material-control ${selectedSection?.title === sectionTitle ? 'is-active' : ''}`}
                    type="button"
                    aria-pressed={selectedSection?.title === sectionTitle}
                    onClick={() => {
                      const nextSection = pathway.sections.find((section) => section.title === sectionTitle) ?? pathway.sections[sectionIndex] ?? pathway.sections[0];
                      const nextSectionIndex = Math.max(0, pathway.sections.findIndex((section) => section.title === nextSection?.title));
                      setSelectedSectionIndex(nextSectionIndex);
                      setSelectedMaterial(nextSection?.items[0] ?? '');
                      onEnterSection(nextSection?.title ?? sectionTitle);
                    }}
                  >
                    {sectionTitle}
                  </button>
                ))}
              </div>

              <div className="pathway-environment-section pathway-primary-section">
                <span className="pathway-section-title">{selectedSection?.title ?? 'Recent Items'}</span>
                {pathwayMaterials.slice(0, 5).map((material) => (
                  <button
                    key={material.id}
                    className={`pathway-material-control ${material.id === activePathwayMaterial?.id ? 'is-active' : ''}`}
                    type="button"
                    aria-pressed={material.id === activePathwayMaterial?.id}
                    onClick={() => {
                      onSelectMaterial(material.id);
                      setSelectedMaterial(material.title);
                      onEnterMaterial(material.id, selectedSection?.title);
                    }}
                  >
                    {material.title}
                  </button>
                ))}
                {selectedSection?.items.map((item) => (
                  <button
                    key={item}
                    className={`pathway-material-control ${item === primaryMaterial && !activePathwayMaterial ? 'is-active' : ''}`}
                    type="button"
                    aria-pressed={item === primaryMaterial && !activePathwayMaterial}
                    onClick={() => {
                      setSelectedMaterial(item);
                      const event = onOpenMaterial(pathway.id, item);
                      setStationEvents((current) => [event, ...current].slice(0, 3));
                      onEnterMaterial(`${pathway.id}:${selectedSection?.title ?? 'section'}:${item}`, selectedSection?.title);
                    }}
                  >
                    {item}
                  </button>
                ))}
                {pathwayMaterials.length === 0 && !selectedSection && <span>No materials yet</span>}
              </div>

              {shouldShowRelationships && (
              <div className="pathway-environment-section pathway-related-materials">
                <span className="pathway-section-title">Related Materials</span>
                {relatedRelationships.length > 0 ? (
                  relatedRelationships.slice(0, 3).map((relationship) => (
                    <span key={relationship.id}>{relationship.action}: {relationship.label}</span>
                  ))
                ) : (
                  <span>No connected materials yet</span>
                )}
              </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'actions' && (
          <div className="pathway-action-groups">
            {actionGroups.map((group, groupIndex) => (
              <div key={group.groupName} className={`pathway-environment-section ${groupIndex > 1 ? 'is-secondary-group' : ''}`}>
                <span className="pathway-section-title">{group.groupName}</span>
                {group.actions.map((action) => (
                  <button key={action.id} className="pathway-inline-action" type="button" onClick={() => handleAction(action)}>
                    {action.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="pathway-connections-panel">
            <div className="pathway-environment-section">
              <span className="pathway-section-title">Lineage</span>
              {activePathwayMaterial ? (
                <>
                  <span>Origin: {getPathwayLabel(activePathwayMaterial.originPathway)}</span>
                  <span>Current: {activePathwayMaterial.currentPathways.map(getPathwayLabel).join(' / ')}</span>
                  <span>Linked: {activePathwayMaterial.linkedMaterialIds.length}</span>
                  <span>Sources: {activePathwayMaterial.sourceMaterialIds.length}</span>
                  {activePathwayMaterial.archivedAt && <span>Preserved: Archive</span>}
                </>
              ) : (
                <span>No live material selected</span>
              )}
            </div>

            <div className="pathway-environment-section">
              <span className="pathway-section-title">Route History</span>
              {activePathwayMaterial && activePathwayMaterial.routeHistory.length > 0 ? (
                activePathwayMaterial.routeHistory.slice(-5).map((route) => (
                  <span key={`${route.at}-${route.action}`}>{route.action}: {getPathwayLabel(route.from)} -&gt; {getPathwayLabel(route.to)}</span>
                ))
              ) : (
                <span>No route history yet</span>
              )}
            </div>

            <div className="pathway-environment-section">
              <span className="pathway-section-title">Relationship Chips</span>
              {relatedRelationships.length > 0 ? (
                relatedRelationships.slice(0, 5).map((relationship) => (
                  <span key={relationship.id}>{relationship.action}: {getPathwayLabel(relationship.fromPathway)} -&gt; {getPathwayLabel(relationship.toPathway)}</span>
                ))
              ) : (
                <span>No relationship edges yet</span>
              )}
            </div>
          </div>
        )}

        {activeTab === 'doctrine' && (
          <div className="pathway-doctrine-panel">
            <div className="pathway-environment-section pathway-relationships">
              <span className="pathway-section-title">Relationship Rules</span>
              {pathway.relationships.map((relationship) => (
                <span key={`${relationship.from}-${relationship.to}`}>
                  {relationship.from} -&gt; {relationship.to}: {relationship.rule}
                </span>
              ))}
            </div>

            <div className="pathway-environment-section">
              <span className="pathway-section-title">Pathway Sections</span>
              {pathway.sections.map((section) => (
                <span key={section.title}>{section.title}</span>
              ))}
            </div>

            <div className="pathway-environment-section">
              <span className="pathway-section-title">Behavioral Notes</span>
              <span>{pathway.summary}</span>
              <span>Success: material remains traceable across pathways</span>
              <span>Exit: return recenters the Sphere</span>
            </div>
          </div>
        )}

        <SectionViewPanel onReturnOneDepth={onReturnFromPathway} pathway={pathway} orientation={orientation} />
        <MaterialViewPanel
          activeMaterial={activePathwayMaterial}
          currentStudyBooks={currentStudyBooks}
          discoveryState={discoveryState}
          onReturnOneDepth={onReturnFromPathway}
          orientation={orientation}
          pathway={pathway}
          relationships={relationships}
          relationshipVisibilityMode={relationshipVisibilityMode}
          onAddLibraryBookCitation={onAddLibraryBookCitation}
          onAddLibraryBookHighlight={onAddLibraryBookHighlight}
          onAddLibraryBookNote={onAddLibraryBookNote}
          onSaveLibraryBookMaterial={onSaveLibraryBookMaterial}
          onSelectMaterial={onSelectMaterial}
          onSetDiscoveryState={onSetDiscoveryState}
          onUpdateLibraryBookRelationship={onUpdateLibraryBookRelationship}
        />
      </div>
    </section>
  );
}

function SectionViewPanel({
  onReturnOneDepth,
  pathway,
  orientation,
}: {
  onReturnOneDepth: () => void;
  pathway: PathwayModel;
  orientation: OrientationSnapshot<PathwayId>;
}) {
  const sectionTitle = orientation.activeSectionId;

  if (!sectionTitle || (orientation.activeLevel !== 'section-view' && orientation.activeLevel !== 'material-view')) {
    return null;
  }

  const section = pathway.sections.find((item) => item.title === sectionTitle);
  const returnTarget = orientation.activeLevel === 'material-view' ? 'section-view' : orientation.returnTarget;
  const sectionActions = pathway.actions.filter((action) => (
    action.kind === 'standard' ||
    action.kind === 'capture' ||
    action.kind === 'departure' ||
    action.kind === 'hold'
  )).slice(0, 3);

  return (
    <section className="nested-panel section-view-panel" aria-label={`${pathway.label} section view`}>
      <div className="nested-panel-heading">
        <span className="pathway-section-title">Section View</span>
        <span>{sectionTitle}</span>
      </div>

      <div className="nested-panel-grid">
        <div className="nested-panel-group">
          <span className="pathway-section-title">Context</span>
          <span>{pathway.label}</span>
          <span>{section ? `${section.items.length} visible materials` : 'Section registered in panel trail'}</span>
        </div>

        <div className="nested-panel-group">
          <span className="pathway-section-title">Section Actions</span>
          {sectionActions.length > 0 ? (
            sectionActions.map((action) => <span key={action.id}>{action.label}</span>)
          ) : (
            <span>No section actions available</span>
          )}
        </div>

        <div className="nested-panel-group">
          <span className="pathway-section-title">Return Target</span>
          <span>{formatPanelLevel(returnTarget)}</span>
          <button className="pathway-return-control" type="button" onClick={onReturnOneDepth}>
            Return to {formatPanelLevel(returnTarget)}
          </button>
        </div>
      </div>
    </section>
  );
}

function MaterialViewPanel({
  activeMaterial,
  currentStudyBooks,
  discoveryState,
  onReturnOneDepth,
  onAddLibraryBookCitation,
  onAddLibraryBookHighlight,
  onAddLibraryBookNote,
  onSaveLibraryBookMaterial,
  onSelectMaterial,
  onSetDiscoveryState,
  onUpdateLibraryBookRelationship,
  orientation,
  pathway,
  relationships,
  relationshipVisibilityMode,
}: {
  activeMaterial?: SphereMaterial;
  currentStudyBooks: SphereMaterial[];
  discoveryState: BookDiscoveryState;
  onReturnOneDepth: () => void;
  onAddLibraryBookCitation: (materialId: string, citation: { page?: string; chapter?: string; location?: string; studentNote?: string }) => void;
  onAddLibraryBookHighlight: (materialId: string, text: string) => void;
  onAddLibraryBookNote: (materialId: string, body: string) => void;
  onSaveLibraryBookMaterial: (result: MaterialSearchResult, accessType: LibraryBookRelationshipType) => string;
  onSelectMaterial: (materialId: string) => void;
  onSetDiscoveryState: Dispatch<SetStateAction<BookDiscoveryState>>;
  onUpdateLibraryBookRelationship: (materialId: string, patch: Partial<StudentBookRelationship>) => void;
  orientation: OrientationSnapshot<PathwayId>;
  pathway: PathwayModel;
  relationships: MaterialRelationship[];
  relationshipVisibilityMode: RelationshipVisibilityMode;
}) {
  if (orientation.activeLevel !== 'material-view') {
    return null;
  }

  const relationshipActions = relationshipVisibilityMode === 'hidden' ? [] : relationships.filter((relationship) => (
    relationship.fromPathway === pathway.id ||
    relationship.toPathway === pathway.id ||
    relationship.fromMaterialId === activeMaterial?.id ||
    relationship.toMaterialId === activeMaterial?.id
  ));
  const materialTitle = activeMaterial?.title ?? orientation.activeMaterialId ?? 'Selected Material';
  const isCurrentStudiesBooksView = (
    pathway.id === 'library' &&
    orientation.activeSectionId === 'Current Studies' &&
    materialTitle === 'Books'
  );

  return (
    <section
      className={`nested-panel material-view-panel ${isCurrentStudiesBooksView ? 'books-material-view' : ''}`}
      aria-label={`${pathway.label} material view`}
    >
      <div className="nested-panel-heading">
        <span className="pathway-section-title">Material View</span>
        <span>{materialTitle}</span>
      </div>

      <div className="nested-panel-grid">
        <div className="nested-panel-group">
          <span className="pathway-section-title">Material Context</span>
          <span>{pathway.label} / {orientation.activeSectionId ?? 'Current Section'}</span>
          {activeMaterial ? (
            <>
              <span>{activeMaterial.kind} / {activeMaterial.lifecycleStage}</span>
              <span>Current: {activeMaterial.currentPathways.map(getPathwayLabel).join(' / ')}</span>
            </>
          ) : (
            <span>Material registered in panel trail</span>
          )}
        </div>

        {relationshipVisibilityMode !== 'hidden' && (
          <div className="nested-panel-group nested-panel-relationships">
            <span className="pathway-section-title">Relationship Actions</span>
            {relationshipActions.length > 0 ? (
              relationshipActions.slice(0, 3).map((relationship) => (
                <span key={relationship.id}>{relationship.action}: {getPathwayLabel(relationship.fromPathway)} -&gt; {getPathwayLabel(relationship.toPathway)}</span>
              ))
            ) : (
              <span>{relationshipVisibilityMode}: no relationship edges yet</span>
            )}
          </div>
        )}

        <div className="nested-panel-group">
          <span className="pathway-section-title">Return Target</span>
          <span>{formatPanelLevel(orientation.returnTarget)}</span>
          <button className="pathway-return-control" type="button" onClick={onReturnOneDepth}>
            Return to {formatPanelLevel(orientation.returnTarget)}
          </button>
        </div>
      </div>

      {isCurrentStudiesBooksView && (
        <BookMaterialInput
          savedMaterials={currentStudyBooks}
          activeMaterial={activeMaterial}
          discoveryState={discoveryState}
          libraryAccounts={[]}
          onAddCitation={onAddLibraryBookCitation}
          onAddHighlight={onAddLibraryBookHighlight}
          onAddNote={onAddLibraryBookNote}
          onSaveMaterial={onSaveLibraryBookMaterial}
          onSelectMaterial={onSelectMaterial}
          onSetDiscoveryState={onSetDiscoveryState}
          onUpdateRelationship={onUpdateLibraryBookRelationship}
        />
      )}
    </section>
  );
}

function AccessRoutesPanel({
  availability,
  material,
  onOpenRoute,
  onRefresh,
}: {
  availability: AvailabilityResult;
  material: SphereMaterial;
  onOpenRoute: (route: BookAccessRoute) => void;
  onRefresh: () => void;
}) {
  const failedProviders = availability.providers.filter((provider) => provider.status === 'failed');
  const isLoading = availability.state === 'loading';
  const isRefreshing = availability.state === 'refreshing';
  const showRoutes = availability.routes.length > 0;
  const routeGroups = ['READ', 'PREVIEW', 'LIBRARY ACCESS', 'REFERENCE'].map((group) => ({
    group,
    routes: availability.routes.filter((route) => getRouteMeaningGroup(route.kind) === group),
  })).filter((group) => group.routes.length > 0);

  return (
    <section className="access-routes-panel" aria-label="Access routes" aria-busy={isLoading || isRefreshing}>
      <div className="access-routes-heading">
        <div>
          <span className="pathway-section-title">ACCESS ROUTES</span>
          <span>Legitimate external routes for this Book or a valid edition.</span>
        </div>
        <button className="pathway-inline-action" type="button" onClick={onRefresh} disabled={isLoading || isRefreshing}>
          {isRefreshing ? 'CHECKING' : 'CHECK ACCESS AGAIN'}
        </button>
      </div>

      {(isLoading || isRefreshing) && (
        <div className="access-route-notice" aria-live="polite">
          <span>{isRefreshing ? 'CHECKING ACCESS AGAIN' : 'CHECKING CONNECTED SOURCES'}</span>
          <span>Open Library / Google Books</span>
        </div>
      )}

      {availability.state === 'partial' && (
        <div className="access-route-notice" aria-live="polite">
          <span>SOME SOURCES COULD NOT BE CHECKED</span>
          <span>Available routes are shown below.</span>
        </div>
      )}

      {failedProviders.length > 0 && availability.state !== 'failed' && (
        <div className="access-route-provider-status" aria-live="polite">
          {failedProviders.slice(0, 2).map((provider) => (
            <span key={provider.providerId}>{provider.providerName.toUpperCase()} COULD NOT BE REACHED</span>
          ))}
        </div>
      )}

      {availability.state === 'empty' && (
        <div className="access-route-empty" aria-live="polite">
          <span>NO CONNECTED ACCESS ROUTE FOUND</span>
          <span>This Book remains available within your Library relationship.</span>
          <span>Additional providers may be connected later.</span>
        </div>
      )}

      {availability.state === 'failed' && (
        <div className="access-route-empty" aria-live="polite">
          <span>CONNECTED SOURCES COULD NOT BE CHECKED</span>
          <span>This Book remains available within your Library relationship.</span>
        </div>
      )}

      {showRoutes && (
        <div className="access-route-list">
          {routeGroups.map((group) => (
            <section className="access-route-group" key={group.group} aria-label={`${group.group} routes`}>
              <span className="access-route-group-title">{group.group}</span>
              {group.routes.map((route) => {
                const edition = material.editions?.find((item) => item.id === route.editionId);
                const accountLine = getAccountContextLine(route);

                return (
                  <article className="access-route-card" key={route.id} aria-label={`${formatRouteKind(route.kind)} through ${route.providerName}`}>
                    <div className="access-route-card-main">
                      <span className="access-route-kind">{formatRouteKind(route.kind)}</span>
                      <span>{route.availabilityMessage ?? formatRouteCondition(route)}</span>
                      {accountLine && <span className="access-route-account-context">{accountLine}</span>}
                      <span>{edition?.title ?? 'Material-level route'} / {route.format}</span>
                    </div>
                    <div className="access-route-card-meta">
                      <span>{route.providerName}{route.libraryName ? ` / ${route.libraryName}` : ''}</span>
                      <span>{formatRouteCondition(route)}</span>
                      <span>{formatRouteConfidence(route)}</span>
                      <button
                        className="pathway-inline-action"
                        type="button"
                        onClick={() => onOpenRoute(route)}
                        aria-label={`${getRouteActionLabel(route.kind)} through ${route.providerName}. Opens externally.`}
                      >
                        {getRouteActionLabel(route.kind)}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function ConnectedLibrariesPanel({
  accounts,
  onBeginConnection,
  onCancelConnection,
  onDeclineConnection,
  onDisconnectAccount,
  onSetPrototypeStatus,
  onReturnToLibrary,
}: {
  accounts: ConnectedLibraryAccount[];
  onBeginConnection: (providerId: string) => void;
  onCancelConnection: (providerId: string) => void;
  onDeclineConnection: (providerId: string) => void;
  onDisconnectAccount: (providerId: string) => void;
  onSetPrototypeStatus: (status: LibraryAccountStatus) => void;
  onReturnToLibrary: () => void;
}) {
  const providers = getLibraryAccountProviders();
  const connectedAccount = getMostRelevantAccount(accounts);
  const prototypeEnabled = isPrototypeLibraryProviderEnabled();

  return (
    <section className="connected-libraries-panel" aria-label="Connected Libraries">
      <div className="connected-libraries-heading">
        <span className="pathway-section-title">CONNECTED LIBRARIES</span>
        <span>External library connections may help clarify collection context. Library remains usable without them.</span>
        <span>Your Books, notes, highlights, citations, reading placement, and shelf remain part of Selbrucivo.</span>
      </div>

      {connectedAccount && (
        <div className="connected-account-summary" aria-live="polite">
          <span className="pathway-section-title">CURRENT ACCOUNT CONTEXT</span>
          <span>{formatLibraryAccountStatus(connectedAccount.status)}</span>
          <span>{describeLibraryAccountStatus(connectedAccount.status)}</span>
          {connectedAccount.isMocked && <span>PROTOTYPE CONNECTION / This is not a live library account.</span>}
          {connectedAccount.connectedAt && <span>Connected: {new Date(connectedAccount.connectedAt).toLocaleDateString()}</span>}
          {connectedAccount.lastVerifiedAt && <span>Last checked: {new Date(connectedAccount.lastVerifiedAt).toLocaleDateString()}</span>}
          <span>Scopes: {connectedAccount.scopes.length > 0 ? connectedAccount.scopes.join(' / ') : 'No granted scopes'}</span>
          {(connectedAccount.status === 'connected' || connectedAccount.status === 'reauthentication-required') && (
            <button className="pathway-inline-action" type="button" onClick={() => onBeginConnection(connectedAccount.providerId)}>
              CONTINUE TO PROTOTYPE
            </button>
          )}
          <button className="pathway-return-control" type="button" onClick={() => onDisconnectAccount(connectedAccount.providerId)}>
            DISCONNECT
          </button>
        </div>
      )}

      <div className="connected-provider-list" role="list" aria-label="Library account providers">
        {providers.map((provider) => {
          const account = accounts.find((item) => item.providerId === provider.id);
          const capabilities = provider.getConnectionCapabilities();

          return (
            <article className="connected-provider-card" role="listitem" key={provider.id}>
              <div className="connected-provider-main">
                <span className="connected-provider-kind">{getProviderContextLabel(provider)}</span>
                <span className="material-card-title">{provider.label}</span>
                {provider.kind === 'prototype' && (
                  <>
                    <span>This is not a live library account.</span>
                    <span>No real credentials are collected.</span>
                  </>
                )}
                {provider.id === 'open-library' && <span>Account connection is not required for current routes.</span>}
                {provider.id === 'google-books' && <span>A Google account is not treated as a library membership.</span>}
                {provider.kind === 'disabled' && <span>Live connection is not available in this prototype.</span>}
              </div>

              <div className="connected-provider-meta">
                <span>Status: {formatLibraryAccountStatus(account?.status ?? (provider.kind === 'disabled' ? 'configuration-required' : 'disconnected'))}</span>
                <span>Membership status: {capabilities.supportsMembershipStatus ? 'Prototype-supported' : 'Not supported here'}</span>
                <span>Collection eligibility: {capabilities.supportsCollectionEligibility ? 'Prototype-supported' : 'Not supported here'}</span>
                <span>Loans / Holds: {capabilities.supportsLoans || capabilities.supportsHolds ? 'Supported' : 'Not supported'}</span>
                {capabilities.requiresServerBoundary && <span>Requires approved server boundary.</span>}
                {provider.kind === 'prototype' && prototypeEnabled && (
                  <>
                    <button
                      className="pathway-inline-action"
                      type="button"
                      onClick={() => onBeginConnection(provider.id)}
                    >
                      {account?.status === 'reauthentication-required' ? 'REAUTHENTICATE' : 'REVIEW CONNECTION'}
                    </button>
                    <button className="pathway-return-control" type="button" onClick={() => onDeclineConnection(provider.id)}>
                      DECLINE
                    </button>
                    <button className="pathway-return-control" type="button" onClick={() => onCancelConnection(provider.id)}>
                      CANCEL
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {prototypeEnabled && (
        <section className="prototype-review-controls" aria-label="Prototype review controls">
          <span className="pathway-section-title">PROTOTYPE REVIEW CONTROLS</span>
          <span>Not part of a live provider experience.</span>
          <div className="prototype-status-grid">
            {([
              'connected',
              'reauthentication-required',
              'authorization-declined',
              'connection-revoked',
              'card-expired',
              'access-limited',
              'provider-unavailable',
              'configuration-required',
            ] as LibraryAccountStatus[]).map((status) => (
              <button className="relationship-chip" type="button" key={status} onClick={() => onSetPrototypeStatus(status)}>
                {formatLibraryAccountStatus(status)}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="connected-libraries-consent" aria-label="Prototype connection explanation">
        <span className="pathway-section-title">CONNECT LIBRARY ACCOUNT</span>
        <span>This prototype does not connect to a live library.</span>
        <span>Do not enter a real library-card number or password.</span>
        <span>The connection demonstrates how a future approved provider may clarify membership and collection eligibility.</span>
        <span>Selbrucivo stores only the normalized prototype account status.</span>
        <span>Your Books, notes, highlights, citations, reading placement, and shelf remain part of your Selbrucivo environment.</span>
      </section>

      <button className="pathway-return-control" type="button" onClick={onReturnToLibrary}>
        RETURN TO LIBRARY
      </button>
    </section>
  );
}

function BookMaterialInput({
  activeMaterial,
  discoveryState,
  libraryAccounts,
  onAddCitation,
  onAddHighlight,
  onAddNote,
  onSaveMaterial,
  onSelectMaterial,
  onSetDiscoveryState,
  onUpdateRelationship,
  savedMaterials,
}: {
  activeMaterial?: SphereMaterial;
  discoveryState: BookDiscoveryState;
  libraryAccounts: ConnectedLibraryAccount[];
  onAddCitation: (materialId: string, citation: { page?: string; chapter?: string; location?: string; studentNote?: string }) => void;
  onAddHighlight: (materialId: string, text: string) => void;
  onAddNote: (materialId: string, body: string) => void;
  onSaveMaterial: (result: MaterialSearchResult, accessType: LibraryBookRelationshipType) => string;
  onSelectMaterial: (materialId: string) => void;
  onSetDiscoveryState: Dispatch<SetStateAction<BookDiscoveryState>>;
  onUpdateRelationship: (materialId: string, patch: Partial<StudentBookRelationship>) => void;
  savedMaterials: SphereMaterial[];
}) {
  const {
    citationDraft,
    highlightDraft,
    noteDraft,
    query,
    results,
    selectedRelationship,
    selectedResult,
    selectedSavedId,
    stage,
    status,
  } = discoveryState;
  const savedExternalIds = useMemo(() => new Set(savedMaterials.map((material) => material.identifiers?.externalId).filter(Boolean)), [savedMaterials]);
  const selectedSavedMaterial = savedMaterials.find((material) => material.id === selectedSavedId) ??
    (activeMaterial?.pathwayState?.librarySection === 'active-materials/current-studies/books' ? activeMaterial : undefined) ??
    savedMaterials[0];
  const shelfGroups = SHELF_OPTIONS.map((option) => ({
    ...option,
    materials: savedMaterials.filter((material) => (material.studentRelationship?.relationshipStatus ?? 'recently-added') === option.id),
  }));
  const [availability, setAvailability] = useState<AvailabilityResult>(() => createIdleAvailabilityResult());
  const selectedSavedMaterialId = selectedSavedMaterial?.id;
  const libraryAccountSignature = libraryAccounts.map((account) => `${account.id}:${account.status}`).join('|');

  useEffect(() => {
    if (stage !== 'workspace' || !selectedSavedMaterial) {
      setAvailability(createIdleAvailabilityResult());
      return undefined;
    }

    const controller = new AbortController();

    setAvailability((current) => (
      current.materialId === selectedSavedMaterial.id && current.routes.length > 0
        ? { ...current, state: 'refreshing' }
        : {
            ...createIdleAvailabilityResult(selectedSavedMaterial.id),
            state: 'loading',
          }
    ));

    getBookAvailability({ material: selectedSavedMaterial }, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setAvailability(enrichAvailabilityWithAccounts(result, libraryAccounts));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAvailability({
            ...createIdleAvailabilityResult(selectedSavedMaterial.id),
            state: 'failed',
          });
        }
      });

    return () => controller.abort();
  }, [selectedSavedMaterialId, stage, libraryAccountSignature]);

  useEffect(() => {
    if (!selectedSavedMaterial) {
      return;
    }

    const handoff = readAccessHandoff();

    if (handoff?.materialId !== selectedSavedMaterial.id || handoff.returnContext.scrollPosition === undefined) {
      return;
    }

    window.requestAnimationFrame(() => {
      const scrollRegion = document.querySelector<HTMLElement>('.library-workspace-scroll');
      scrollRegion?.scrollTo({ top: handoff.returnContext.scrollPosition });
    });
  }, [selectedSavedMaterialId]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      onSetDiscoveryState((current) => ({
        ...current,
        status: 'Enter a title, author, ISBN, subject, or keyword before searching.',
      }));
      return;
    }

    onSetDiscoveryState((current) => ({
      ...current,
      selectedResult: undefined,
      stage: 'search',
      status: 'Searching Open Library...',
    }));

    try {
      const nextResults = await searchLibraryMaterials(trimmedQuery);
      onSetDiscoveryState((current) => ({
        ...current,
        results: nextResults,
        selectedResult: undefined,
        stage: nextResults.length > 0 ? 'results' : 'search',
        status: nextResults.length > 0 ? `${nextResults.length} results returned from connected book catalogs.` : 'No matching book materials found.',
      }));
    } catch {
      onSetDiscoveryState((current) => ({
        ...current,
        stage: 'search',
        status: 'Search provider is unavailable. Try again when the network connection returns.',
      }));
    }
  };

  const handleSave = (result: MaterialSearchResult) => {
    const event = onSaveMaterial(result, selectedRelationship);
    onSetDiscoveryState((current) => ({
      ...current,
      selectedSavedId: undefined,
      stage: 'workspace',
      status: `${event} Material identity remains continuous across access changes.`,
    }));
  };

  const handleAddNote = () => {
    if (!selectedSavedMaterial) {
      return;
    }

    onAddNote(selectedSavedMaterial.id, noteDraft);
    onSetDiscoveryState((current) => ({ ...current, noteDraft: '' }));
  };

  const handleAddHighlight = () => {
    if (!selectedSavedMaterial) {
      return;
    }

    onAddHighlight(selectedSavedMaterial.id, highlightDraft);
    onSetDiscoveryState((current) => ({ ...current, highlightDraft: '' }));
  };

  const handleAddCitation = () => {
    if (!selectedSavedMaterial) {
      return;
    }

    onAddCitation(selectedSavedMaterial.id, citationDraft);
    onSetDiscoveryState((current) => ({ ...current, citationDraft: { page: '', chapter: '', location: '', studentNote: '' } }));
  };

  const refreshAvailability = () => {
    if (!selectedSavedMaterial) {
      return;
    }

    const controller = new AbortController();

    setAvailability((current) => ({
      ...current,
      materialId: selectedSavedMaterial.id,
      state: current.routes.length > 0 ? 'refreshing' : 'loading',
    }));

    getBookAvailability({ material: selectedSavedMaterial }, { refresh: true, signal: controller.signal })
      .then((result) => setAvailability(enrichAvailabilityWithAccounts(result, libraryAccounts)))
      .catch(() => setAvailability({
        ...createIdleAvailabilityResult(selectedSavedMaterial.id),
        state: 'failed',
      }));
  };

  const handleOpenRoute = (route: BookAccessRoute) => {
    const scrollRegion = document.querySelector<HTMLElement>('.library-workspace-scroll');
    const opened = openAccessRoute(route, scrollRegion?.scrollTop);

    onSetDiscoveryState((current) => ({
      ...current,
      status: opened
        ? 'External provider opened. Access remains managed by the connected source.'
        : 'This provider link could not be opened safely.',
    }));
  };

  return (
    <div className="book-material-input" data-book-stage={stage} aria-label="Current Studies Books input">
      <div className="book-material-intro">
        <span className="pathway-section-title">BOOKS DISCOVERY</span>
        <span>Search connected book catalogs.</span>
      </div>

      <form className="book-material-search" onSubmit={handleSearch}>
        <label className="book-material-search-label" htmlFor="library-book-material-search">
          Title, author, ISBN, subject, or keyword
        </label>
        <input
          id="library-book-material-search"
          className="book-material-search-input"
          type="search"
          value={query}
          placeholder="Title, author, ISBN, subject, keyword"
          onChange={(event) => onSetDiscoveryState((current) => ({ ...current, query: event.target.value }))}
        />
        <button className="pathway-inline-action" type="submit">
          SEARCH
        </button>
      </form>

      <span className="book-material-status" aria-live="polite">{status}</span>

      <div className="book-material-stage-region">
        {results.length > 0 && (stage === 'results' || stage === 'material' || stage === 'relationship') && (
          <div className="material-search-results" aria-label="Search results">
            <div className="book-stage-heading">
              <span className="pathway-section-title">RESULTS</span>
              <span>{results.length} results / Open Library source</span>
            </div>
            {results.map((result) => {
              const isSaved = savedExternalIds.has(result.identifiers?.externalId ?? result.id);

              return (
                <article className={`material-search-result-card ${selectedResult?.id === result.id ? 'is-active' : ''}`} key={result.id}>
                  {result.thumbnail ? (
                    <img className="book-cover" src={result.thumbnail} alt="" />
                  ) : (
                    <div className="book-cover book-cover-placeholder" aria-hidden="true">BOOK</div>
                  )}
                  <button
                    className="material-search-result-main"
                    type="button"
                    onClick={() => onSetDiscoveryState((current) => ({
                      ...current,
                      selectedResult: result,
                      stage: 'material',
                      status: `${result.title} opened as a Book Material.`,
                    }))}
                  >
                    <span className="material-card-title">{result.title}</span>
                    {result.creator && <span>{result.creator}</span>}
                    <span>{result.publicationYear ?? 'Unknown year'} / {result.language ?? 'Language unknown'}</span>
                    {result.description && <span>{result.description}</span>}
                    <span>{result.subjects.slice(0, 4).join(' / ') || 'No subjects listed'}</span>
                    <span>{result.editions.length} editions / availability checked after saving</span>
                  </button>
                  <button
                    className="pathway-inline-action"
                    type="button"
                    disabled={isSaved}
                    onClick={() => onSetDiscoveryState((current) => ({
                      ...current,
                      selectedResult: result,
                      stage: 'material',
                      status: isSaved ? 'This Material is already in Library.' : `${result.title} opened as a Book Material.`,
                    }))}
                  >
                    {isSaved ? 'SAVED' : 'VIEW MATERIAL'}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {selectedResult && (stage === 'material' || stage === 'relationship') && (
          <article className="book-material-detail" aria-label="Discovered book material">
            {selectedResult.thumbnail ? (
              <img className="book-cover is-large" src={selectedResult.thumbnail} alt="" />
            ) : (
              <div className="book-cover book-cover-placeholder is-large" aria-hidden="true">BOOK</div>
            )}
            <div className="book-material-detail-body">
              <span className="pathway-section-title">MATERIAL VIEW</span>
              <span className="material-card-title">{selectedResult.title}</span>
              <span>{selectedResult.creator ?? 'Author unknown'} / {selectedResult.publicationYear ?? 'Year unknown'} / {selectedResult.language ?? 'Language unknown'}</span>
              <span>{selectedResult.description}</span>
              <div className="book-chip-row">
                {selectedResult.subjects.slice(0, 6).map((subject) => <span key={subject}>{subject}</span>)}
              </div>
              <div className="book-material-columns">
                <div>
                  <span className="pathway-section-title">Editions</span>
                  {selectedResult.editions.slice(0, 4).map((edition) => (
                    <span key={edition.id}>{edition.title} {edition.publicationYear ? `/ ${edition.publicationYear}` : ''}</span>
                  ))}
                </div>
                <div>
                  <span className="pathway-section-title">Bibliographic Source</span>
                  {selectedResult.providerUrl ? (
                    <a href={selectedResult.providerUrl} target="_blank" rel="noreferrer">Open Library record</a>
                  ) : (
                    <span>Provider record unavailable</span>
                  )}
                  <span>Access routes are checked after the Book is saved to Library.</span>
                </div>
              </div>
              {stage === 'material' && (
                <div className="book-material-actions">
                  <button
                    className="pathway-inline-action"
                    type="button"
                    onClick={() => onSetDiscoveryState((current) => ({
                      ...current,
                      stage: 'relationship',
                      status: 'Choose how you are engaging with this Book Material.',
                    }))}
                  >
                    ADD TO LIBRARY
                  </button>
                  <button className="pathway-return-control" type="button" onClick={() => onSetDiscoveryState((current) => ({ ...current, stage: 'results' }))}>
                    RETURN TO RESULTS
                  </button>
                </div>
              )}
              {stage === 'relationship' && (
                <>
                  <div className="relationship-selector" aria-label="Relationship type">
                    <span className="pathway-section-title">HOW ARE YOU ENGAGING WITH THIS BOOK?</span>
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        className={`relationship-chip ${selectedRelationship === option.id ? 'is-active' : ''}`}
                        type="button"
                        aria-pressed={selectedRelationship === option.id}
                        onClick={() => onSetDiscoveryState((current) => ({ ...current, selectedRelationship: option.id }))}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <button className="pathway-inline-action" type="button" onClick={() => handleSave(selectedResult)}>
                    BEGIN RELATIONSHIP
                  </button>
                </>
              )}
            </div>
          </article>
        )}

        {(stage === 'workspace' || (stage === 'search' && savedMaterials.length > 0)) && (
        <div className="saved-materials-list library-shelf" aria-label="My Shelf">
          <span className="pathway-section-title">MY SHELF</span>
          {savedMaterials.length > 0 ? (
            shelfGroups.map((group) => (
              <section className="shelf-group" key={group.id}>
                <span>{group.label}</span>
                {group.materials.length > 0 ? group.materials.map((material) => (
                  <button
                    className={`saved-material-card ${selectedSavedMaterial?.id === material.id ? 'is-active' : ''}`}
                    key={material.id}
                    type="button"
                    onClick={() => {
                      onSetDiscoveryState((current) => ({
                        ...current,
                        selectedSavedId: material.id,
                        stage: 'workspace',
                        status: `${material.title} opened in Reading Workspace.`,
                      }));
                      onSelectMaterial(material.id);
                    }}
                  >
                    <span className="material-card-title">{material.title}</span>
                    {material.creator && <span>{material.creator}</span>}
                    <span>{formatBookRelationship(material.studentRelationship?.accessType)} / {material.publicationYear ?? 'Year unknown'}</span>
                  </button>
                )) : <span>No materials</span>}
              </section>
            ))
          ) : (
            <span>No books saved for active study yet.</span>
          )}
        </div>
        )}

        {selectedSavedMaterial && stage === 'workspace' && (
          <article className="student-relationship-panel" aria-label="Student relationship">
            <span className="pathway-section-title">READING WORKSPACE</span>
            <span className="material-card-title">{selectedSavedMaterial.title}</span>
            <div className="book-material-columns">
              <label>
                Access Type
                <select
                  value={selectedSavedMaterial.studentRelationship?.accessType ?? 'researching'}
                  onChange={(event) => onUpdateRelationship(selectedSavedMaterial.id, { accessType: event.target.value as LibraryBookRelationshipType })}
                >
                  {RELATIONSHIP_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <label>
                Shelf
                <select
                  value={selectedSavedMaterial.studentRelationship?.relationshipStatus ?? 'recently-added'}
                  onChange={(event) => onUpdateRelationship(selectedSavedMaterial.id, { relationshipStatus: event.target.value as LibraryBookShelfGroup })}
                >
                  {SHELF_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <label>
                Current Page
                <input
                  disabled={(selectedSavedMaterial.studentRelationship?.accessType ?? 'researching') === 'researching'}
                  value={selectedSavedMaterial.studentRelationship?.currentPage ?? ''}
                  onChange={(event) => onUpdateRelationship(selectedSavedMaterial.id, { currentPage: event.target.value })}
                />
              </label>
              <label>
                Current Chapter
                <input
                  disabled={(selectedSavedMaterial.studentRelationship?.accessType ?? 'researching') === 'researching'}
                  value={selectedSavedMaterial.studentRelationship?.currentChapter ?? ''}
                  onChange={(event) => onUpdateRelationship(selectedSavedMaterial.id, { currentChapter: event.target.value })}
                />
              </label>
            </div>
            <label>
              Current Engagement
              <textarea
                value={selectedSavedMaterial.studentRelationship?.currentEngagement ?? ''}
                onChange={(event) => onUpdateRelationship(selectedSavedMaterial.id, { currentEngagement: event.target.value })}
              />
            </label>
            <AccessRoutesPanel
              availability={availability.materialId === selectedSavedMaterial.id ? availability : createIdleAvailabilityResult(selectedSavedMaterial.id)}
              material={selectedSavedMaterial}
              onOpenRoute={handleOpenRoute}
              onRefresh={refreshAvailability}
            />
            <section className="edition-information-panel" aria-label="Edition information">
              <span className="pathway-section-title">EDITION INFORMATION</span>
              {(selectedSavedMaterial.editions ?? []).length > 0 ? (
                (selectedSavedMaterial.editions ?? []).slice(0, 4).map((edition) => (
                  <span key={edition.id}>
                    {edition.title}
                    {edition.publicationYear ? ` / ${edition.publicationYear}` : ''}
                    {edition.language ? ` / ${edition.language}` : ''}
                    {edition.isbn ? ` / ISBN ${edition.isbn}` : ''}
                  </span>
                ))
              ) : (
                <span>No edition records attached yet.</span>
              )}
            </section>
            <div className="student-entry-grid">
              <label>
                Reading Note
                <textarea value={noteDraft} onChange={(event) => onSetDiscoveryState((current) => ({ ...current, noteDraft: event.target.value }))} />
                <button className="pathway-inline-action" type="button" onClick={handleAddNote}>Add Note</button>
              </label>
              <label>
                Highlight
                <textarea value={highlightDraft} onChange={(event) => onSetDiscoveryState((current) => ({ ...current, highlightDraft: event.target.value }))} />
                <button className="pathway-inline-action" type="button" onClick={handleAddHighlight}>Add Highlight</button>
              </label>
              <div className="citation-form">
                <span>Citation</span>
                <input placeholder="Page" value={citationDraft.page} onChange={(event) => onSetDiscoveryState((current) => ({ ...current, citationDraft: { ...current.citationDraft, page: event.target.value } }))} />
                <input placeholder="Chapter" value={citationDraft.chapter} onChange={(event) => onSetDiscoveryState((current) => ({ ...current, citationDraft: { ...current.citationDraft, chapter: event.target.value } }))} />
                <input placeholder="Location" value={citationDraft.location} onChange={(event) => onSetDiscoveryState((current) => ({ ...current, citationDraft: { ...current.citationDraft, location: event.target.value } }))} />
                <textarea placeholder="Student note" value={citationDraft.studentNote} onChange={(event) => onSetDiscoveryState((current) => ({ ...current, citationDraft: { ...current.citationDraft, studentNote: event.target.value } }))} />
                <button className="pathway-inline-action" type="button" onClick={handleAddCitation}>Add Citation</button>
              </div>
            </div>
            <div className="relationship-object-list">
              <span>Notes: {selectedSavedMaterial.studentRelationship?.readingNotes.length ?? 0}</span>
              <span>Highlights: {selectedSavedMaterial.studentRelationship?.highlights.length ?? 0}</span>
              <span>Citations: {selectedSavedMaterial.studentRelationship?.citations.length ?? 0}</span>
              <span>Last Opened: {selectedSavedMaterial.studentRelationship?.lastOpened ? new Date(selectedSavedMaterial.studentRelationship.lastOpened).toLocaleDateString() : 'Not opened'}</span>
            </div>
            <div className="relationship-object-list">
              {(selectedSavedMaterial.studentRelationship?.readingNotes ?? []).slice(0, 3).map((note) => <span key={note.id}>Note: {note.body}</span>)}
              {(selectedSavedMaterial.studentRelationship?.highlights ?? []).slice(0, 3).map((highlight) => <span key={highlight.id}>Highlight: {highlight.text}</span>)}
              {(selectedSavedMaterial.studentRelationship?.citations ?? []).slice(0, 3).map((citation) => <span key={citation.id}>Citation: {citation.page || citation.chapter || citation.location} {citation.studentNote}</span>)}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

function createSpherePoints() {
  const points: SpherePoint[] = [];
  const count = 360;

  for (let index = 0; index < count; index += 1) {
    const y = 1 - (index / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = index * Math.PI * (3 - Math.sqrt(5));
    const hasLabel = index % 37 === 0;
    const labelBase = DATA_LABELS[(index / 37) % DATA_LABELS.length | 0];

    points.push({
      char: ASCII_CHARS[index % ASCII_CHARS.length],
      label: hasLabel ? `${labelBase} ${(index * 7) % 360}` : undefined,
      position: [Math.cos(theta) * radius, y, Math.sin(theta) * radius],
    });
  }

  return points;
}

function rotatePoint([x, y, z]: [number, number, number], rotation: Rotation) {
  const cosY = Math.cos(rotation.y);
  const sinY = Math.sin(rotation.y);
  const cosX = Math.cos(rotation.x);
  const sinX = Math.sin(rotation.x);
  const yRotatedX = x * cosY - z * sinY;
  const yRotatedZ = x * sinY + z * cosY;
  const xRotatedY = y * cosX - yRotatedZ * sinX;
  const xRotatedZ = y * sinX + yRotatedZ * cosX;

  return [yRotatedX, xRotatedY, xRotatedZ] as [number, number, number];
}

function projectPoint(
  point: SpherePoint,
  rotation: Rotation,
  center: number,
  radius: number,
): ProjectedPoint {
  const [x, y, z] = rotatePoint(point.position, rotation);
  const cameraDistance = 3.2;
  const perspective = cameraDistance / (cameraDistance - z);
  const depth = (z + 1) / 2;

  return {
    alpha: 0.24 + depth * 0.68,
    char: point.char,
    depth,
    label: point.label,
    scale: perspective,
    x: center + x * radius * perspective,
    y: center + y * radius * perspective,
  };
}

function colorWithAlpha(color: string, alpha: number) {
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}

function drawGlyph(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  alpha: number,
  fontSize: number,
) {
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.font = `${fontSize}px "SFMono-Regular", Consolas, "Liberation Mono", monospace`;
  context.fillText(text, x, y);
}

function drawProjectedPath(
  context: CanvasRenderingContext2D,
  points: SpherePoint[],
  rotation: Rotation,
  center: number,
  radius: number,
  color: string,
  alpha: number,
  width: number,
) {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();

  points.forEach((point, index) => {
    const projected = projectPoint(point, rotation, center, radius);

    if (index === 0) {
      context.moveTo(projected.x, projected.y);
      return;
    }

    context.lineTo(projected.x, projected.y);
  });

  context.stroke();
  context.restore();
}

function drawCurvedCartographyPath(
  context: CanvasRenderingContext2D,
  points: [SpherePoint, SpherePoint, SpherePoint],
  rotation: Rotation,
  center: number,
  radius: number,
  color: string,
  alpha: number,
  width: number,
) {
  const [source, control, target] = points.map((point) => projectPoint(point, rotation, center, radius));

  if (source.depth < 0.2 && target.depth < 0.2) {
    return;
  }

  context.save();
  context.globalAlpha = alpha * Math.max(0.2, (source.depth + target.depth) / 2);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(source.x, source.y);
  context.quadraticCurveTo(control.x, control.y, target.x, target.y);
  context.stroke();
  context.restore();
}

function interpolateSpherePoint(first: [number, number, number], second: [number, number, number], amount: number) {
  const x = first[0] * (1 - amount) + second[0] * amount;
  const y = first[1] * (1 - amount) + second[1] * amount;
  const z = first[2] * (1 - amount) + second[2] * amount;
  const length = Math.hypot(x, y, z) || 1;

  return [x / length, y / length, z / length] as [number, number, number];
}

function cartographyNodeToPoint(node: CartographyNode): SpherePoint {
  return {
    char: node.glyph,
    label: node.title,
    position: node.position,
  };
}

function supportNodeToPoint(node: SupportNode): SpherePoint {
  return {
    char: '●',
    label: node.label,
    position: node.position,
  };
}

type SphereUIProps = {
  isInteractionDisabled?: boolean;
  isDemoMode?: boolean;
  orientationIdentity?: OrientationIdentity;
  onResetDemo?: () => void;
  onReturnToThreshold?: () => void;
};

type SphereEnvironmentState = 'orientation' | 'student-settings' | 'returning-to-orientation';
type BookDiscoveryStage = 'search' | 'results' | 'material' | 'relationship' | 'workspace';

type BookDiscoveryState = {
  citationDraft: { page: string; chapter: string; location: string; studentNote: string };
  highlightDraft: string;
  noteDraft: string;
  query: string;
  results: MaterialSearchResult[];
  selectedRelationship: LibraryBookRelationshipType;
  selectedResult?: MaterialSearchResult;
  selectedSavedId?: string;
  stage: BookDiscoveryStage;
  status: string;
};

const createInitialBookDiscoveryState = (): BookDiscoveryState => ({
  citationDraft: { page: '', chapter: '', location: '', studentNote: '' },
  highlightDraft: '',
  noteDraft: '',
  query: '',
  results: [],
  selectedRelationship: 'researching',
  stage: 'search',
  status: 'Search by title, author, ISBN, subject, or keyword.',
});

export function SphereUI({
  isInteractionDisabled = false,
  isDemoMode = false,
  orientationIdentity,
  onResetDemo,
  onReturnToThreshold,
}: SphereUIProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const rotationRef = useRef<Rotation>({ ...NEUTRAL_ROTATION });
  const velocityRef = useRef<Rotation>({ x: 0.001, y: 0.002 });
  const dragRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });
  const points = useMemo(() => createSpherePoints(), []);
  const {
    pathwayStates,
    getHandlers,
    orientation,
    panelTrail,
    expandPathway,
    enterMaterial,
    enterSection,
    returnOneDepth,
    returnToPathwayOverview,
    setPathwayInteractionState,
    returnFromPathway,
  } = usePanelArchitecture<PathwayId>(PATHWAY_REGISTRY);
  const materialLayer = useMaterialRelationshipLayer(isDemoMode);
  const [bookDiscoveryState, setBookDiscoveryState] = useState<BookDiscoveryState>(() => createInitialBookDiscoveryState());
  const [libraryAccounts, setLibraryAccounts] = useState<ConnectedLibraryAccount[]>(() => (
    readLibraryAccountState(isPrototypeLibraryProviderEnabled()).accounts
  ));
  const pathwayModels = useMemo(
    () =>
      PATHWAY_REGISTRY.map((pathway) => ({
        ...pathway,
        state: pathwayStates[pathway.id],
      })),
    [pathwayStates],
  );
  const activePathway = pathwayModels.find((pathway) => isActivePathwayState(pathway.state));
  const visiblePathway = pathwayModels.find((pathway) => pathway.state !== 'inactive');
  const [sizeKey, setSizeKey] = useState<SizeKey>('S');
  const [sphereEnvironmentState, setSphereEnvironmentState] = useState<SphereEnvironmentState>('orientation');
  const hasPersistentDockPreferencesRef = useRef(false);
  const persistedDockPreferencesRef = useRef<StudentDockPreferences | undefined>(undefined);
  const [dockPreferences, setDockPreferences] = useState<StudentDockPreferences>(() => {
    const basePreferences = createDockPreferencesFromIdentity(orientationIdentity);
    const defaultPersistentPreferences = createDockPreferencesFromIdentity();
    persistedDockPreferencesRef.current = defaultPersistentPreferences;

    try {
      const stored = window.localStorage.getItem(CONTROL_CENTER_PREFERENCES_STORAGE_KEY);
      const storedPreferences = stored ? JSON.parse(stored) as Partial<StudentDockPreferences> : {};
      hasPersistentDockPreferencesRef.current = stored !== null;
      persistedDockPreferencesRef.current = normalizeDockPreferences({
        ...defaultPersistentPreferences,
        ...storedPreferences,
      });

      return normalizeDockPreferences({
        ...basePreferences,
        ...storedPreferences,
      });
    } catch {
      return basePreferences;
    }
  });
  const [weatherContext] = useState<WeatherContext | undefined>(fallbackWeatherContext);
  const [viewportSize, setViewportSize] = useState(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }));
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  ));
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);
  const isStudentSettingsOpen = sphereEnvironmentState !== 'orientation';
  const isSphereInputDisabled = isInteractionDisabled || isStudentSettingsOpen;
  const isPathwayControllingSphere = activePathway !== undefined;
  const visiblePathwayState = visiblePathway?.state ?? 'inactive';
  const visiblePathwayClass = visiblePathway ? `${visiblePathway.id}-state-${visiblePathway.state}` : '';
  const isDedicatedLibraryEnvironment = (
    visiblePathway?.id === 'library' &&
    orientation.activePathwayId === 'library' &&
    orientation.activeLevel !== 'pathway-overview'
  );
  const activeMaterial = materialLayer.materials.find((material) => material.id === materialLayer.activeMaterialId);
  const libraryPreviewMaterialTitle = materialLayer.materials.find((material) => (
    material.currentPathways.includes('library') &&
    material.pathwayState?.librarySection === 'active-materials/current-studies/books'
  ))?.title;
  const relationshipVisibilityMode = getRelationshipVisibilityMode(
    visiblePathwayState,
    panelTrail.some((panel) => panel.level === 'material-view' || panel.level === 'section-view'),
  );
  const sphereCartography = useMemo(
    () => createSphereCartography(materialLayer.materials, materialLayer.relationships),
    [materialLayer.materials, materialLayer.relationships],
  );

  const persistLibraryAccount = (account: ConnectedLibraryAccount) => {
    upsertLibraryAccount(account, isPrototypeLibraryProviderEnabled());
    setLibraryAccounts(readLibraryAccountState(isPrototypeLibraryProviderEnabled()).accounts);
  };

  const beginLibraryAccountConnection = (providerId: string) => {
    const provider = getLibraryAccountProvider(providerId);

    if (!provider || !provider.getConnectionCapabilities().supportsConnection) {
      return;
    }

    provider.beginConnection({
      providerId,
      returnContext: {
        pathway: 'library',
        view: 'connected-libraries',
        scrollPosition: document.querySelector<HTMLElement>('.library-workspace-scroll')?.scrollTop,
      },
    }).then((result) => {
      if (result.account) {
        persistLibraryAccount(result.account);
      }
    });
  };

  const declineLibraryAccountConnection = (providerId: string) => {
    if (providerId !== 'selbrucivo-library-prototype' || !isPrototypeLibraryProviderEnabled()) {
      return;
    }

    persistLibraryAccount(createPrototypeAccount('authorization-declined'));
  };

  const cancelLibraryAccountConnection = (providerId: string) => {
    if (providerId !== 'selbrucivo-library-prototype' || !isPrototypeLibraryProviderEnabled()) {
      return;
    }

    persistLibraryAccount(createPrototypeAccount('disconnected'));
  };

  const setPrototypeLibraryAccountStatus = (status: LibraryAccountStatus) => {
    if (!isPrototypeLibraryProviderEnabled()) {
      return;
    }

    persistLibraryAccount(createPrototypeAccount(status));
  };

  const disconnectLibraryAccount = (providerId: string) => {
    const confirmed = window.confirm(
      [
        'DISCONNECT LIBRARY ACCOUNT',
        '',
        'Disconnecting removes this prototype provider relationship from Selbrucivo.',
        '',
        'Your Books, notes, highlights, citations, reading placement, shelf relationships, and public access routes will remain.',
      ].join('\n'),
    );

    if (!confirmed) {
      return;
    }

    removeLibraryAccount(providerId, isPrototypeLibraryProviderEnabled());
    setLibraryAccounts(readLibraryAccountState(isPrototypeLibraryProviderEnabled()).accounts);
  };

  const openStudentSettings = () => {
    if (isInteractionDisabled || (activePathway && !isDedicatedLibraryEnvironment)) {
      return;
    }

    setSphereEnvironmentState('student-settings');
  };

  const returnToSphereOrientation = () => {
    if (sphereEnvironmentState === 'returning-to-orientation') {
      return;
    }

    setSphereEnvironmentState('returning-to-orientation');
    window.setTimeout(() => setSphereEnvironmentState('orientation'), 620);
  };

  const openLibraryConnectionsFromSettings = () => {
    setSphereEnvironmentState('orientation');
    expandPathway('library');
    window.setTimeout(() => enterSection('library', 'Connected Libraries'), 0);
  };

  const updateDockPreferences = (patch: Partial<StudentDockPreferences>) => {
    hasPersistentDockPreferencesRef.current = true;
    persistedDockPreferencesRef.current = normalizeDockPreferences({
      ...(persistedDockPreferencesRef.current ?? createDockPreferencesFromIdentity()),
      ...patch,
    });
    setDockPreferences((current) => normalizeDockPreferences({ ...current, ...patch }));
  };

  useEffect(() => {
    if (!hasPersistentDockPreferencesRef.current) {
      return;
    }

    window.localStorage.setItem(
      CONTROL_CENTER_PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalizeDockPreferences(persistedDockPreferencesRef.current ?? dockPreferences)),
    );
  }, [dockPreferences]);

  useEffect(() => {
    let resizeFrame: number | null = null;

    const updateViewportSize = () => {
      if (resizeFrame !== null) {
        window.cancelAnimationFrame(resizeFrame);
      }

      resizeFrame = window.requestAnimationFrame(() => {
        setViewportSize({
          height: window.innerHeight,
          width: window.innerWidth,
        });
      });
    };

    window.addEventListener('resize', updateViewportSize);

    return () => {
      window.removeEventListener('resize', updateViewportSize);
      if (resizeFrame !== null) {
        window.cancelAnimationFrame(resizeFrame);
      }
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    if (!media) {
      return undefined;
    }

    const updateMotionPreference = () => setPrefersReducedMotion(media.matches);
    const legacyMedia = media as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };

    updateMotionPreference();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', updateMotionPreference);
    } else {
      legacyMedia.addListener?.(updateMotionPreference);
    }

    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', updateMotionPreference);
        return;
      }

      legacyMedia.removeListener?.(updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return undefined;
    }

    const drawWireframe = (rotation: Rotation, size: number, center: number, radius: number) => {
      context.save();
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      for (let latitudeIndex = -3; latitudeIndex <= 3; latitudeIndex += 1) {
        const latitude = latitudeIndex / 4;
        const ringRadius = Math.sqrt(1 - latitude * latitude);
        const ringPoints = Array.from({ length: 132 }, (_, step) => {
          const angle = (step / 131) * Math.PI * 2;
          return {
            char: '.',
            position: [Math.cos(angle) * ringRadius, latitude, Math.sin(angle) * ringRadius],
          } as SpherePoint;
        });

        drawProjectedPath(
          context,
          ringPoints,
          rotation,
          center,
          radius,
          latitudeIndex === 0 ? '#21f58a' : '#35e9ff',
          latitudeIndex === 0 ? 0.44 : 0.22,
          Math.max(0.7, size * 0.002),
        );

        for (let step = 0; step < 96; step += 1) {
          const angle = (step / 96) * Math.PI * 2;
          const spherePoint: SpherePoint = {
            char: step % 8 === 0 ? '+' : '.',
            position: [Math.cos(angle) * ringRadius, latitude, Math.sin(angle) * ringRadius],
          };
          const projected = projectPoint(spherePoint, rotation, center, radius);
          const visibleAlpha = latitudeIndex === 0 ? 0.42 : 0.22;
          drawGlyph(
            context,
            spherePoint.char,
            projected.x,
            projected.y,
            '#21f58a',
            visibleAlpha * projected.alpha,
            Math.max(7, size * 0.018),
          );
        }
      }

      for (let longitudeIndex = 0; longitudeIndex < 10; longitudeIndex += 1) {
        const longitude = (longitudeIndex / 10) * Math.PI * 2;
        const meridianPoints = Array.from({ length: 96 }, (_, step) => {
          const latitudeAngle = -Math.PI / 2 + (step / 95) * Math.PI;
          return {
            char: '.',
            position: [
              Math.cos(longitude) * Math.cos(latitudeAngle),
              Math.sin(latitudeAngle),
              Math.sin(longitude) * Math.cos(latitudeAngle),
            ],
          } as SpherePoint;
        });

        drawProjectedPath(
          context,
          meridianPoints,
          rotation,
          center,
          radius,
          longitudeIndex % 2 === 0 ? '#21f58a' : '#76579b',
          longitudeIndex % 2 === 0 ? 0.22 : 0.16,
          Math.max(0.55, size * 0.0016),
        );

        for (let step = 0; step < 82; step += 1) {
          const latitudeAngle = -Math.PI / 2 + (step / 81) * Math.PI;
          const spherePoint: SpherePoint = {
            char: step % 11 === 0 ? '|' : '.',
            position: [
              Math.cos(longitude) * Math.cos(latitudeAngle),
              Math.sin(latitudeAngle),
              Math.sin(longitude) * Math.cos(latitudeAngle),
            ],
          };
          const projected = projectPoint(spherePoint, rotation, center, radius);
          drawGlyph(
            context,
            spherePoint.char,
            projected.x,
            projected.y,
            '#35e9ff',
            0.16 * projected.alpha,
            Math.max(7, size * 0.016),
          );
        }
      }

      context.restore();
    };

    const drawSelectionBand = (rotation: Rotation, size: number, center: number, radius: number) => {
      context.save();
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      for (let row = -2; row <= 2; row += 1) {
        for (let column = -5; column <= 5; column += 1) {
          const longitude = column * 0.16;
          const latitude = row * 0.13;
          const position: [number, number, number] = [
            Math.sin(longitude) * Math.cos(latitude),
            Math.sin(latitude),
            Math.cos(longitude) * Math.cos(latitude),
          ];
          const projected = projectPoint(
            {
              char: '#',
              position,
            },
            rotation,
            center,
            radius * 0.98,
          );

          if (projected.depth < 0.45) {
            continue;
          }

          const moduleLabel = SUPPORT_MODULES[(row + 2) * 3 + Math.abs(column % SUPPORT_MODULES.length)] ?? 'SYS';
          const cellSize = Math.max(13, size * 0.042 * projected.scale);

          context.globalAlpha = 0.11 + projected.depth * 0.22;
          context.strokeStyle = column === 0 && row === 0 ? '#f0d36a' : '#21f58a';
          context.lineWidth = Math.max(0.8, size * 0.002);
          context.strokeRect(projected.x - cellSize / 2, projected.y - cellSize / 2, cellSize, cellSize);
          drawGlyph(
            context,
            moduleLabel,
            projected.x,
            projected.y + 1,
            column === 0 && row === 0 ? '#f0d36a' : '#35e9ff',
            0.18 + projected.depth * 0.32,
            Math.max(6, size * 0.015 * projected.scale),
          );
        }
      }

      context.restore();
    };

    const drawCartographyRegions = (rotation: Rotation, size: number, center: number, radius: number, cartography: SphereCartography, showLabels: boolean) => {
      context.save();

      cartography.latitudeRegions.slice(0, 7).forEach((region, index) => {
        const latitude = cartography.latitudeRegions.length <= 1
          ? 0
          : -0.72 + (index / (cartography.latitudeRegions.length - 1)) * 1.44;
        const ringRadius = Math.cos(latitude);
        const y = Math.sin(latitude);
        const ringPoints = Array.from({ length: 96 }, (_, step) => {
          const angle = (step / 95) * Math.PI * 2;
          return {
            char: '.',
            position: [Math.cos(angle) * ringRadius, y, Math.sin(angle) * ringRadius],
          } as SpherePoint;
        });

        drawProjectedPath(
          context,
          ringPoints,
          rotation,
          center,
          radius * 1.03,
          '#f0d36a',
          Math.min(0.42, 0.12 + region.strength * 0.045),
          Math.max(0.7, size * 0.0018),
        );

        const labelPoint = projectPoint({
          char: '.',
          label: region.label,
          position: [ringRadius, y, 0],
        }, rotation, center, radius * 1.06);

        if (showLabels && labelPoint.depth > 0.48) {
          drawGlyph(
            context,
            `LAT ${region.label.toUpperCase().slice(0, 18)}`,
            labelPoint.x + size * 0.035,
            labelPoint.y,
            '#f0d36a',
            Math.min(0.72, 0.24 + labelPoint.depth * 0.38),
            Math.max(7, size * 0.015),
          );
        }
      });

      cartography.longitudeRegions.slice(0, 10).forEach((region, index) => {
        const longitude = (index / Math.max(1, cartography.longitudeRegions.length)) * Math.PI * 2;
        const meridianPoints = Array.from({ length: 82 }, (_, step) => {
          const latitudeAngle = -Math.PI / 2 + (step / 81) * Math.PI;
          return {
            char: '.',
            position: [
              Math.cos(longitude) * Math.cos(latitudeAngle),
              Math.sin(latitudeAngle),
              Math.sin(longitude) * Math.cos(latitudeAngle),
            ],
          } as SpherePoint;
        });

        drawProjectedPath(
          context,
          meridianPoints,
          rotation,
          center,
          radius * 1.01,
          '#35e9ff',
          Math.min(0.32, 0.09 + region.strength * 0.04),
          Math.max(0.55, size * 0.0014),
        );
      });

      context.restore();
    };

    const drawCartographyPaths = (rotation: Rotation, size: number, center: number, radius: number, cartography: SphereCartography) => {
      const nodeById = new Map(cartography.nodes.map((node) => [node.id, node]));

      cartography.paths.slice(0, 26).forEach((path) => {
        const source = nodeById.get(path.sourceId);
        const target = nodeById.get(path.targetId);

        if (!source || !target) {
          return;
        }

        drawCurvedCartographyPath(
          context,
          [
            cartographyNodeToPoint(source),
            { char: '.', position: path.control },
            cartographyNodeToPoint(target),
          ],
          rotation,
          center,
          radius,
          path.coVisitCount > 1 ? '#f0d36a' : '#21f58a',
          0.1 + path.strength * 0.34,
          Math.max(0.7, size * (0.0012 + path.strength * 0.0018)),
        );
      });
    };

    const drawSignalNodes = (rotation: Rotation, size: number, center: number, radius: number, showLabels: boolean) => {
      const nodePositions = Array.from({ length: 15 }, (_, index) => {
        const longitude = (index / 15) * Math.PI * 2 + 0.35;
        const latitude = Math.sin(index * 1.7) * 0.74;
        return {
          char: '●',
          label: DATA_LABELS[index % DATA_LABELS.length],
          position: [
            Math.cos(longitude) * Math.cos(latitude),
            Math.sin(latitude),
            Math.sin(longitude) * Math.cos(latitude),
          ],
        } as SpherePoint;
      });

      nodePositions.forEach((node, index) => {
        const projected = projectPoint(node, rotation, center, radius * 1.02);

        if (projected.depth < 0.34) {
          return;
        }

        context.save();
        context.globalAlpha = 0.16 + projected.depth * 0.58;
        context.fillStyle = index % 4 === 0 ? '#f0d36a' : '#21f58a';
        context.beginPath();
        context.arc(projected.x, projected.y, Math.max(2.5, size * 0.009 * projected.scale), 0, Math.PI * 2);
        context.fill();
        context.restore();

        if (showLabels && index % 3 === 0) {
          drawGlyph(
            context,
            `${node.label} ${String((index * 39) % 360).padStart(3, '0')}`,
            projected.x + size * 0.03,
            projected.y - size * 0.022,
            '#f0d36a',
            0.32 + projected.depth * 0.4,
            Math.max(7, size * 0.017),
          );
        }
      });
    };

    const drawCartographyNodes = (rotation: Rotation, size: number, center: number, radius: number, cartography: SphereCartography, showLabels: boolean) => {
      const supportPoints = cartography.supportNodes.map(supportNodeToPoint)
        .map((point, index) => ({
          index,
          point,
          projected: projectPoint(point, rotation, center, radius * 1.07),
          support: cartography.supportNodes[index],
        }))
        .sort((first, second) => first.projected.depth - second.projected.depth);

      for (const entry of supportPoints) {
        if (entry.projected.depth < 0.34) {
          continue;
        }

        const sizeBoost = Math.min(1, entry.support.strength / 5);

        context.save();
        context.globalAlpha = (0.18 + entry.projected.depth * 0.52) * (0.7 + sizeBoost * 0.3);
        context.strokeStyle = '#f0d36a';
        context.lineWidth = Math.max(0.8, size * 0.002);
        context.beginPath();
        context.arc(entry.projected.x, entry.projected.y, Math.max(4, size * (0.011 + sizeBoost * 0.006) * entry.projected.scale), 0, Math.PI * 2);
        context.stroke();
        context.restore();

        if (showLabels && entry.index < 5 && entry.projected.depth > 0.56) {
          drawGlyph(
            context,
            `SUPPORT ${entry.support.label.toUpperCase().slice(0, 16)}`,
            entry.projected.x + size * 0.034,
            entry.projected.y - size * 0.018,
            '#f0d36a',
            0.32 + entry.projected.depth * 0.38,
            Math.max(7, size * 0.015),
          );
        }
      }

      const materialPoints = cartography.nodes
        .map((node) => ({
          node,
          projected: projectPoint(cartographyNodeToPoint(node), rotation, center, radius * (0.94 + node.density * 0.08)),
        }))
        .sort((first, second) => first.projected.depth - second.projected.depth);

      for (const entry of materialPoints) {
        const { node, projected } = entry;

        if (projected.depth < 0.28) {
          continue;
        }

        const pulse = !prefersReducedMotion && node.pulse > 0 ? (Math.sin(performance.now() * 0.004) + 1) * 0.5 * node.pulse : 0;
        const alpha = Math.min(0.92, (0.18 + projected.depth * 0.54) * node.luminosity + pulse * 0.18);
        const markRadius = Math.max(3.2, size * (0.008 + node.density * 0.007) * projected.scale);

        context.save();
        context.globalAlpha = alpha;
        context.fillStyle = node.color.hue;
        context.beginPath();
        context.arc(projected.x, projected.y, markRadius, 0, Math.PI * 2);
        context.fill();
        context.restore();

        if (node.xMark || node.oMark) {
          drawGlyph(
            context,
            node.xMark ? 'X' : 'O',
            projected.x - size * 0.018,
            projected.y + size * 0.018,
            node.xMark ? '#f0d36a' : '#35e9ff',
            Math.min(0.84, alpha + 0.18),
            Math.max(8, size * 0.02 * projected.scale),
          );
        }

        drawGlyph(
          context,
          node.glyph,
          projected.x,
          projected.y,
          projected.depth > 0.58 ? '#f6f2ea' : node.color.hue,
          Math.min(0.9, alpha + 0.14),
          Math.max(8, size * 0.019 * projected.scale),
        );

        if (showLabels && (node.engagement.rediscovered || projected.depth > 0.7) && materialPoints.indexOf(entry) % 3 === 0) {
          drawGlyph(
            context,
            node.title.toUpperCase().slice(0, 22),
            projected.x + size * 0.038,
            projected.y - size * 0.016,
            node.color.source === 'declined' ? '#c7beb0' : '#35e9ff',
            Math.min(0.76, alpha),
            Math.max(7, size * 0.015),
          );
        }
      }
    };

    const render = () => {
      const size = getResponsiveSphereSize(sizeKey, viewportSize);
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = size * pixelRatio;
      canvas.height = size * pixelRatio;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, size, size);

      const center = size / 2;
      const radius = size * 0.36;
      const rotation = rotationRef.current;
      const showCartographyInspection = isCanvasFocused && !activePathway;
      const showCanvasCaption = viewportSize.width > 720 || showCartographyInspection;

      if (activePathway) {
        const target = activePathway.state === 'returning' ? NEUTRAL_ROTATION : PATHWAY_ROTATIONS[activePathway.direction];
        velocityRef.current = { x: 0, y: 0 };
        rotation.x += (target.x - rotation.x) * 0.055;
        rotation.y += (target.y - rotation.y) * 0.055;
      } else if (!dragRef.current.isDragging) {
        velocityRef.current.x *= 0.985;
        velocityRef.current.y *= 0.985;
        rotation.x += prefersReducedMotion ? 0 : velocityRef.current.x;
        rotation.y += prefersReducedMotion ? 0 : velocityRef.current.y + 0.0011;
      }

      context.save();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      drawWireframe(rotation, size, center, radius);
      drawCartographyRegions(rotation, size, center, radius, sphereCartography, showCartographyInspection);
      drawSelectionBand(rotation, size, center, radius);
      drawSignalNodes(rotation, size, center, radius, showCartographyInspection);
      drawCartographyPaths(rotation, size, center, radius, sphereCartography);
      drawCartographyNodes(rotation, size, center, radius, sphereCartography, showCartographyInspection);

      const projectedPoints = points
        .map((point) => projectPoint(point, rotation, center, radius))
        .sort((a, b) => a.depth - b.depth);

      for (const point of projectedPoints) {
        const frontColor = point.depth > 0.62 ? '#f0d36a' : point.depth > 0.44 ? '#21f58a' : '#76579b';
        drawGlyph(
          context,
          point.char,
          point.x,
          point.y,
          frontColor,
          point.alpha,
          Math.max(8, size * 0.021 * point.scale),
        );

        if (showCartographyInspection && point.label && point.depth > 0.48) {
          drawGlyph(
            context,
            `[${point.label}]`,
            point.x + size * 0.045,
            point.y - size * 0.018,
            '#35e9ff',
            Math.min(0.78, point.alpha),
            Math.max(8, size * 0.018),
          );
        }
      }

      context.strokeStyle = colorWithAlpha('#21f58a', 0.52);
      context.lineWidth = 1;
      context.setLineDash([size * 0.008, size * 0.014]);
      context.beginPath();
      context.arc(center, center, radius * 1.15, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);

      if (showCanvasCaption) {
        drawGlyph(context, showCartographyInspection ? 'CARTOGRAPHY INSPECTION' : 'SPHERE CARTOGRAPHY', center, size * 0.075, '#35e9ff', 0.68, Math.max(10, size * 0.027));
      }
      if (showCartographyInspection) {
        drawGlyph(
          context,
          `${sphereCartography.summary.materialCount} MATERIALS // ${sphereCartography.supportNodes.length} SUPPORT NODES`,
          center,
          size * 0.115,
          '#21f58a',
          0.6,
          Math.max(8, size * 0.018),
        );
        drawGlyph(
          context,
          `ARCHIVE RETURNS ${sphereCartography.summary.revisitedCount}  REDISCOVERED ${sphereCartography.summary.rediscoveredCount}`,
          center,
          size * 0.93,
          '#f0d36a',
          0.58,
          Math.max(8, size * 0.018),
        );
      }
      context.restore();

      animationRef.current = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activePathway, isCanvasFocused, points, prefersReducedMotion, sizeKey, sphereCartography, viewportSize]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isSphereInputDisabled || isPathwayControllingSphere) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current.isDragging = true;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isSphereInputDisabled || isPathwayControllingSphere || !dragRef.current.isDragging) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.lastX;
    const deltaY = event.clientY - dragRef.current.lastY;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;

    // Rotation logic: drag deltas alter X/Y axis rotation, while velocity is retained for post-drag inertia.
    const nextVelocity = {
      x: deltaY * 0.0035,
      y: deltaX * 0.0035,
    };
    velocityRef.current = nextVelocity;
    rotationRef.current.x += nextVelocity.x;
    rotationRef.current.y += nextVelocity.y;
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.isDragging) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current.isDragging = false;
  };

  const shiftSize = (direction: -1 | 1) => {
    const currentIndex = ACTIVE_SIZE_KEYS.indexOf(sizeKey);
    const nextIndex = Math.min(ACTIVE_SIZE_KEYS.length - 1, Math.max(0, currentIndex + direction));
    setSizeKey(ACTIVE_SIZE_KEYS[nextIndex]);
  };

  const handleCanvasKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (isSphereInputDisabled || isPathwayControllingSphere) {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const axis = event.key === 'ArrowUp' || event.key === 'ArrowDown' ? 'x' : 'y';
      const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      rotationRef.current[axis] += direction * 0.08;
      velocityRef.current = { x: 0, y: 0 };
    }

    if (event.key === 'Home' || event.key === 'Escape') {
      event.preventDefault();
      rotationRef.current = { ...NEUTRAL_ROTATION };
      velocityRef.current = { x: 0, y: 0 };
    }
  };

  return (
    <main
      className={[
        'ascii-shell',
        activePathway ? 'pathway-active' : '',
        isDedicatedLibraryEnvironment ? 'library-environment-active' : '',
        isStudentSettingsOpen ? 'student-settings-active' : '',
        visiblePathway ? `pathway-state-${visiblePathwayState}` : '',
        visiblePathwayClass,
      ].join(' ')}
      data-active-pathway={activePathway?.id ?? 'none'}
      data-sphere-environment={sphereEnvironmentState}
      data-visible-pathway={visiblePathway?.id ?? 'none'}
      data-visible-pathway-state={visiblePathwayState}
    >
      {isDemoMode && (
        <div className="demo-session-badge" role="status" aria-label="Investor demonstration mode">
          <span>DEMO</span>
          <small>Investor Demonstration</small>
        </div>
      )}

      {!isInteractionDisabled && !isStudentSettingsOpen && (
        <ControlCenterDock
          preferences={dockPreferences}
          recentMaterial={materialLayer.lastActiveMaterial}
          weather={weatherContext}
          onOpenStudentSettings={openStudentSettings}
        />
      )}

      {isStudentSettingsOpen && (
        <StudentSettingsEnvironment
          preferences={dockPreferences}
          state={sphereEnvironmentState}
          onOpenLibraryConnections={openLibraryConnectionsFromSettings}
          onPreferenceChange={updateDockPreferences}
          onReturnToSphere={returnToSphereOrientation}
        />
      )}

      <div className="pathway-orientation-layer">
        {pathwayModels.map((pathway) => (
          <PathwayLabel
            key={pathway.id}
            isSuppressed={isStudentSettingsOpen || isDedicatedLibraryEnvironment}
            pathway={pathway}
            handlers={getHandlers(pathway)}
          />
        ))}
      </div>

      <section className="ascii-stage" aria-label="Interactive ASCII retro support sphere">
        <div className="crt-haze" aria-hidden />
        <canvas
          ref={canvasRef}
          className="ascii-sphere-canvas"
          role="img"
          aria-label={`Rotatable ASCII cartography sphere. ${sphereCartography.summary.materialCount} Library and Archive materials, ${sphereCartography.supportNodes.length} Support Nodes, ${sphereCartography.paths.length} relationship paths. Arrow keys rotate the sphere. Home or Escape recenters it.`}
          tabIndex={isSphereInputDisabled || isPathwayControllingSphere ? -1 : 0}
          onBlur={() => setIsCanvasFocused(false)}
          onFocus={() => setIsCanvasFocused(true)}
          onKeyDown={handleCanvasKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      </section>

      {pathwayModels.map((pathway) => (
        <PathwayMetadata key={`${pathway.id}-metadata`} pathway={pathway} />
      ))}
      {pathwayModels.map((pathway) => (
        <PathwayEntryPanel
            key={`${pathway.id}-entry`}
            pathway={pathway}
            previewMaterialTitle={pathway.id === 'library' ? libraryPreviewMaterialTitle : undefined}
            onOpenPathway={() => expandPathway(pathway.id, pathway.sections.length === 0)}
            onReturnFromOverview={returnOneDepth}
        />
      ))}
      {pathwayModels.map((pathway) => {
        if (isDedicatedLibraryEnvironment && pathway.id === 'library') {
          return null;
        }

        return (
          <PathwayEnvironment
            key={`${pathway.id}-environment`}
            pathway={pathway}
            activeMaterial={activeMaterial}
            discoveryState={bookDiscoveryState}
            materials={materialLayer.materials}
            relationships={materialLayer.relationships}
            orientation={orientation}
            relationshipVisibilityMode={relationshipVisibilityMode}
            onCaptureMaterial={materialLayer.captureMaterial}
            onCompleteMaterial={materialLayer.completeMaterial}
            onComposeFromMaterial={materialLayer.composeFromMaterial}
            onEnterMaterial={(materialId, sectionId) => enterMaterial(pathway.id, materialId, sectionId)}
            onEnterSection={(sectionId) => enterSection(pathway.id, sectionId)}
            onLinkMaterial={materialLayer.linkMaterial}
            onOpenMaterial={materialLayer.openMaterial}
            onRemoveMaterial={materialLayer.removeMaterial}
            onRouteMaterial={materialLayer.routeMaterial}
            onAddLibraryBookCitation={materialLayer.addLibraryBookCitation}
            onAddLibraryBookHighlight={materialLayer.addLibraryBookHighlight}
            onAddLibraryBookNote={materialLayer.addLibraryBookNote}
            onSaveLibraryBookMaterial={materialLayer.saveLibraryBookMaterial}
            onSelectMaterial={(materialId) => materialLayer.activateMaterialById(pathway.id, materialId)}
            onSetDiscoveryState={setBookDiscoveryState}
            onUpdateLibraryBookRelationship={materialLayer.updateLibraryBookRelationship}
            onSetPathwayInteractionState={(state) => {
              if (state === 'expanded') {
                expandPathway(pathway.id, pathway.sections.length === 0);
                return;
              }

              setPathwayInteractionState(pathway.id, state);
            }}
            onReturnFromPathway={returnOneDepth}
          />
        );
      })}

      {isDedicatedLibraryEnvironment && visiblePathway?.id === 'library' && (
        <LibraryEnvironmentShell
          pathway={visiblePathway}
          activeMaterial={activeMaterial}
          discoveryState={bookDiscoveryState}
          libraryAccounts={libraryAccounts}
          materials={materialLayer.materials}
          orientation={orientation}
          onAddLibraryBookCitation={materialLayer.addLibraryBookCitation}
          onAddLibraryBookHighlight={materialLayer.addLibraryBookHighlight}
          onAddLibraryBookNote={materialLayer.addLibraryBookNote}
          onBeginLibraryAccountConnection={beginLibraryAccountConnection}
          onCancelLibraryAccountConnection={cancelLibraryAccountConnection}
          onDeclineLibraryAccountConnection={declineLibraryAccountConnection}
          onDisconnectLibraryAccount={disconnectLibraryAccount}
          onEnterMaterial={(materialId, sectionId) => enterMaterial('library', materialId, sectionId)}
          onEnterSection={(sectionId) => enterSection('library', sectionId)}
          onReturnOneDepth={returnOneDepth}
          onReturnToLibraryLanding={() => expandPathway('library')}
          onReturnToPathwayOverview={() => returnToPathwayOverview('library')}
          onSaveLibraryBookMaterial={materialLayer.saveLibraryBookMaterial}
          onSelectMaterial={(materialId) => materialLayer.activateMaterialById('library', materialId)}
          onSetDiscoveryState={setBookDiscoveryState}
          onSetPrototypeLibraryAccountStatus={setPrototypeLibraryAccountStatus}
          onUpdateLibraryBookRelationship={materialLayer.updateLibraryBookRelationship}
        />
      )}

      {!isStudentSettingsOpen && !isDedicatedLibraryEnvironment && (
        <>
          <aside className="ascii-panel" aria-label="Sphere size controls">
            <span className="ascii-panel-label">scale</span>
            <div
              className="ascii-size-selector"
              role="group"
              aria-label="Support sphere size scale"
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') {
                  event.preventDefault();
                  shiftSize(-1);
                }

                if (event.key === 'ArrowRight') {
                  event.preventDefault();
                  shiftSize(1);
                }
              }}
            >
              {SCALE_NODES.map((node, index) => {
                const selectedIndex = SCALE_NODES.findIndex((item) => item.key === sizeKey);
                const isFilled = index <= selectedIndex;

                return (
                  <button
                    key={node.key}
                    className={[
                      'ascii-size-node',
                      isFilled ? 'is-filled' : '',
                      sizeKey === node.key ? 'is-active' : '',
                      node.enabled ? '' : 'is-postponed',
                    ].join(' ')}
                    type="button"
                    aria-label={node.enabled ? `Set sphere size ${node.key}` : `${node.key} size postponed`}
                    aria-pressed={sizeKey === node.key}
                    disabled={!node.enabled || isInteractionDisabled}
                    onClick={() => setSizeKey(node.key)}
                  />
                );
              })}
            </div>
          </aside>

          {(onResetDemo || onReturnToThreshold) && (
            <aside className="ascii-demo-actions" aria-label="Investor demo controls">
              {onResetDemo && (
                <button
                  className="ascii-return-control demo-reset-control"
                  type="button"
                  disabled={isInteractionDisabled}
                  onClick={onResetDemo}
                >
                  Reset Demo
                </button>
              )}

              {onReturnToThreshold && (
                <button
                  className="ascii-return-control"
                  type="button"
                  disabled={isInteractionDisabled}
                  onClick={onReturnToThreshold}
                >
                  Return to Threshold
                </button>
              )}
            </aside>
          )}
        </>
      )}
    </main>
  );
}
