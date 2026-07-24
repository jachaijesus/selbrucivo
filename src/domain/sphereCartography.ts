import type { MaterialRelationship } from './relationships';
import type { SphereMaterial } from './materials';

export type SphereCartographyMaterialType =
  | 'book'
  | 'essay'
  | 'album'
  | 'artwork'
  | 'film'
  | 'video'
  | 'note'
  | 'website'
  | 'research'
  | 'other';

export type ColorAssociation = {
  id: string;
  label: string;
  hue: string;
  source: 'proposed' | 'student-confirmed' | 'declined';
  confidence: number;
};

export type ArchiveEngagement = {
  firstVisitedAt?: string;
  lastVisitedAt?: string;
  visitCount: number;
  visitHistory: string[];
  recencyScore: number;
  revisitScore: number;
  rediscovered: boolean;
};

export type CartographyNode = {
  id: string;
  materialId: string;
  title: string;
  creator?: string;
  materialType: SphereCartographyMaterialType;
  disciplines: string[];
  practices: string[];
  keywords: string[];
  position: [number, number, number];
  glyph: string;
  xMark: boolean;
  oMark: boolean;
  density: number;
  luminosity: number;
  saturation: number;
  pulse: number;
  color: ColorAssociation;
  engagement: ArchiveEngagement;
};

export type SupportNode = {
  id: string;
  label: string;
  kind: 'creator' | 'keyword' | 'source' | 'institution' | 'subject';
  strength: number;
  materialIds: string[];
  position: [number, number, number];
};

export type CartographyPath = {
  id: string;
  sourceId: string;
  targetId: string;
  keywords: string[];
  strength: number;
  coVisitCount: number;
  control: [number, number, number];
};

export type CartographyRegion = {
  id: string;
  label: string;
  kind: 'latitude' | 'longitude';
  value: string;
  index: number;
  strength: number;
};

export type SphereCartography = {
  nodes: CartographyNode[];
  supportNodes: SupportNode[];
  paths: CartographyPath[];
  latitudeRegions: CartographyRegion[];
  longitudeRegions: CartographyRegion[];
  summary: {
    materialCount: number;
    savedQuietCount: number;
    revisitedCount: number;
    rediscoveredCount: number;
  };
};

export const EMPTY_SPHERE_CARTOGRAPHY: SphereCartography = {
  nodes: [],
  supportNodes: [],
  paths: [],
  latitudeRegions: [],
  longitudeRegions: [],
  summary: {
    materialCount: 0,
    savedQuietCount: 0,
    revisitedCount: 0,
    rediscoveredCount: 0,
  },
};

const DEFAULT_DISCIPLINES = ['general study'];
const DEFAULT_PRACTICES = ['collecting'];
const EMOTION_COLORS: Record<string, string> = {
  calm: '#35e9ff',
  curiosity: '#21f58a',
  focus: '#f0d36a',
  grief: '#76579b',
  joy: '#f4a261',
  tension: '#d05c4f',
  wonder: '#9fd86b',
};

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededUnit(seed: string, salt: string) {
  return hashString(`${seed}:${salt}`) / 4294967295;
}

function normalizeList(values?: Array<string | undefined>) {
  return Array.from(new Set(normalizeValues(values)));
}

function normalizeValues(values?: Array<string | undefined>) {
  return (values ?? [])
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeMaterialType(type?: SphereMaterial['materialType']): SphereCartographyMaterialType {
  const normalized = (type ?? 'other').toLowerCase();

  if (normalized === 'article') {
    return 'essay';
  }

  if (normalized === 'recording') {
    return 'album';
  }

  if (normalized === 'image') {
    return 'artwork';
  }

  if (normalized === 'observation') {
    return 'note';
  }

  return ([
    'book',
    'essay',
    'album',
    'artwork',
    'film',
    'video',
    'note',
    'website',
    'research',
    'other',
  ] as SphereCartographyMaterialType[]).includes(normalized as SphereCartographyMaterialType)
    ? normalized as SphereCartographyMaterialType
    : 'other';
}

function getMaterialGlyph(type: SphereCartographyMaterialType) {
  const glyphs: Record<SphereCartographyMaterialType, string> = {
    album: 'o',
    artwork: '◌',
    book: '≡',
    essay: '=',
    film: '○',
    note: '+',
    other: '.',
    research: '●',
    video: '○',
    website: ':',
  };

  return glyphs[type];
}

function daysBetween(now: Date, iso?: string) {
  if (!iso) {
    return Number.POSITIVE_INFINITY;
  }

  const time = Date.parse(iso);

  if (!Number.isFinite(time)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (now.getTime() - time) / 86400000);
}

function createEngagement(material: SphereMaterial, now: Date): ArchiveEngagement {
  const relationship = material.studentRelationship;
  const visitHistory = [
    relationship?.dateAdded,
    relationship?.lastReadingSession,
    relationship?.lastOpened,
    material.archivedAt,
  ].filter((value): value is string => Boolean(value));
  const noteSignals = (relationship?.readingNotes.length ?? 0) +
    (relationship?.highlights.length ?? 0) +
    (relationship?.citations.length ?? 0);
  const visitCount = Math.max(relationship?.lastOpened ? 1 : 0, visitHistory.length + noteSignals);
  const lastVisitedAt = visitHistory
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort((first, second) => Date.parse(second) - Date.parse(first))[0];
  const firstVisitedAt = visitHistory
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort((first, second) => Date.parse(first) - Date.parse(second))[0];
  const recencyDays = daysBetween(now, lastVisitedAt);
  const firstDays = daysBetween(now, firstVisitedAt);
  const recencyScore = Number.isFinite(recencyDays) ? Math.max(0.12, 1 - recencyDays / 180) : 0.1;
  const revisitScore = Math.min(1, visitCount / 8);
  const rediscovered = visitCount > 1 && recencyDays <= 14 && firstDays >= 45;

  return {
    firstVisitedAt,
    lastVisitedAt,
    visitCount,
    visitHistory,
    recencyScore,
    revisitScore,
    rediscovered,
  };
}

function getColorAssociation(material: SphereMaterial, keywords: string[], engagement: ArchiveEngagement): ColorAssociation {
  const studentAssociations = normalizeList((material as SphereMaterial & { studentEmotionAssociations?: string[] }).studentEmotionAssociations);
  const proposedAssociations = normalizeList((material as SphereMaterial & { proposedEmotionAssociations?: string[] }).proposedEmotionAssociations);
  const declined = studentAssociations.includes('declined') || proposedAssociations.includes('declined');
  const label = declined ? 'declined' : studentAssociations[0] ?? proposedAssociations[0] ?? keywords.find((keyword) => EMOTION_COLORS[keyword]) ?? 'curiosity';
  const source = declined ? 'declined' : studentAssociations.length > 0 ? 'student-confirmed' : 'proposed';
  const confidence = source === 'student-confirmed' ? 0.92 : Math.max(0.32, Math.min(0.62, 0.38 + engagement.revisitScore * 0.18));

  return {
    id: label,
    label,
    hue: declined ? '#c7beb0' : EMOTION_COLORS[label] ?? '#21f58a',
    source,
    confidence,
  };
}

function createPosition(seed: string, disciplineIndex: number, disciplineCount: number, practiceIndex: number, practiceCount: number) {
  const latitudeStep = disciplineCount <= 1 ? 0 : disciplineIndex / (disciplineCount - 1);
  const latitude = -0.72 + latitudeStep * 1.44 + (seededUnit(seed, 'lat-jitter') - 0.5) * 0.12;
  const longitude = ((practiceIndex + seededUnit(seed, 'long-jitter') * 0.82) / Math.max(1, practiceCount)) * Math.PI * 2;
  const radius = 0.76 + seededUnit(seed, 'depth') * 0.22;
  const y = Math.sin(latitude) * radius;
  const ring = Math.cos(latitude) * radius;

  return [
    Math.cos(longitude) * ring,
    y,
    Math.sin(longitude) * ring,
  ] as [number, number, number];
}

function createControlPoint(first: [number, number, number], second: [number, number, number], seed: string) {
  const middle = [
    (first[0] + second[0]) / 2,
    (first[1] + second[1]) / 2,
    (first[2] + second[2]) / 2,
  ] as [number, number, number];
  const lift = 0.1 + seededUnit(seed, 'curve') * 0.22;

  return [
    middle[0] * (1 + lift),
    middle[1] * (1 + lift) + (seededUnit(seed, 'curve-y') - 0.5) * 0.18,
    middle[2] * (1 + lift),
  ] as [number, number, number];
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function createRegions(kind: CartographyRegion['kind'], values: string[]) {
  const counts = countBy(values);

  return Object.entries(counts)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([value, strength], index) => ({
      id: `${kind}-${value}`,
      label: value,
      kind,
      value,
      index,
      strength,
    }));
}

export function createSphereCartography(
  materials: SphereMaterial[],
  relationships: MaterialRelationship[] = [],
  options: { now?: Date } = {},
): SphereCartography {
  const libraryMaterials = materials.filter((material) => (
    material.currentPathways.includes('library') ||
    material.currentPathways.includes('archive') ||
    material.pathwayState?.librarySection === 'active-materials/current-studies/books'
  ));

  if (libraryMaterials.length === 0) {
    return EMPTY_SPHERE_CARTOGRAPHY;
  }

  const now = options.now ?? new Date();
  const disciplineValues = libraryMaterials.flatMap((material) => normalizeList(material.subjects).slice(0, 2));
  const practiceValues = libraryMaterials.flatMap((material) => normalizeList([
    material.studentRelationship?.relationshipStatus,
    material.studentRelationship?.accessType,
    material.lifecycleStage,
  ]));
  const latitudeRegions = createRegions('latitude', disciplineValues.length > 0 ? disciplineValues : DEFAULT_DISCIPLINES);
  const longitudeRegions = createRegions('longitude', practiceValues.length > 0 ? practiceValues : DEFAULT_PRACTICES);
  const creatorCounts = countBy(normalizeValues(libraryMaterials.map((material) => material.creator ?? material.source ?? '')));
  const keywordCounts = countBy(libraryMaterials.flatMap((material) => normalizeValues(material.subjects)));

  const nodes = libraryMaterials.map((material) => {
    const disciplines = normalizeList(material.subjects).slice(0, 3);
    const practices = normalizeList([
      material.studentRelationship?.relationshipStatus,
      material.studentRelationship?.accessType,
      material.lifecycleStage,
    ]).slice(0, 3);
    const keywords = normalizeList([
      ...(material.subjects ?? []),
      ...(material.relatedMaterialTitles ?? []),
      material.parentSection,
      material.source,
    ]).slice(0, 8);
    const primaryDiscipline = disciplines[0] ?? 'general study';
    const primaryPractice = practices[0] ?? 'collecting';
    const disciplineIndex = Math.max(0, latitudeRegions.findIndex((region) => region.value === primaryDiscipline));
    const practiceIndex = Math.max(0, longitudeRegions.findIndex((region) => region.value === primaryPractice));
    const engagement = createEngagement(material, now);
    const color = getColorAssociation(material, keywords, engagement);
    const creatorStrength = material.creator ? creatorCounts[material.creator.trim().toLowerCase()] ?? 0 : 0;
    const recurringKeyword = keywords.some((keyword) => (keywordCounts[keyword] ?? 0) > 1);

    return {
      id: `node-${material.id}`,
      materialId: material.id,
      title: material.title,
      creator: material.creator,
      materialType: normalizeMaterialType(material.materialType),
      disciplines,
      practices,
      keywords,
      position: createPosition(material.id, disciplineIndex, latitudeRegions.length, practiceIndex, longitudeRegions.length),
      glyph: getMaterialGlyph(normalizeMaterialType(material.materialType)),
      xMark: disciplines.length > 1 || material.currentPathways.length > 1,
      oMark: creatorStrength > 1 || recurringKeyword || engagement.visitCount >= 4,
      density: 0.32 + engagement.revisitScore * 0.68,
      luminosity: 0.18 + engagement.recencyScore * 0.82,
      saturation: color.source === 'declined' ? 0.18 : 0.34 + color.confidence * 0.38 + engagement.revisitScore * 0.24,
      pulse: engagement.rediscovered ? 1 : Math.min(0.72, engagement.revisitScore),
      color,
      engagement,
    } satisfies CartographyNode;
  });

  const nodeByMaterialId = new Map(nodes.map((node) => [node.materialId, node]));
  const supportEntries = [
    ...Object.entries(creatorCounts).map(([label, strength]) => ({ label, strength, kind: 'creator' as const })),
    ...Object.entries(keywordCounts).filter(([, strength]) => strength > 1).map(([label, strength]) => ({ label, strength, kind: 'keyword' as const })),
  ].filter((entry) => entry.label && entry.strength > 1);
  const supportNodes = supportEntries.slice(0, 14).map((entry, index) => {
    const materialIds = nodes
      .filter((node) => (
        entry.kind === 'creator'
          ? node.creator?.trim().toLowerCase() === entry.label
          : node.keywords.includes(entry.label)
      ))
      .map((node) => node.materialId);

    return {
      id: `support-${entry.kind}-${entry.label}`,
      label: entry.label,
      kind: entry.kind,
      strength: entry.strength,
      materialIds,
      position: createPosition(`support-${entry.label}`, index, Math.max(2, supportEntries.length), index * 2 + 1, Math.max(3, supportEntries.length + 2)),
    };
  });

  const semanticPaths: CartographyPath[] = [];

  for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
      const first = nodes[firstIndex];
      const second = nodes[secondIndex];

      if (!first || !second) {
        continue;
      }
      const sharedKeywords = first.keywords.filter((keyword) => second.keywords.includes(keyword));
      const creatorMatch = first.creator && second.creator && first.creator === second.creator;
      const related = materials.find((material) => material.id === first.materialId)?.linkedMaterialIds.includes(second.materialId) ||
        materials.find((material) => material.id === second.materialId)?.linkedMaterialIds.includes(first.materialId);

      if (!creatorMatch && !related && sharedKeywords.length === 0) {
        continue;
      }

      const coVisitCount = Math.min(first.engagement.visitCount, second.engagement.visitCount);
      const strength = Math.min(1, 0.22 + sharedKeywords.length * 0.16 + (creatorMatch ? 0.24 : 0) + (related ? 0.18 : 0) + coVisitCount * 0.04);

      semanticPaths.push({
        id: `path-${first.materialId}-${second.materialId}`,
        sourceId: first.id,
        targetId: second.id,
        keywords: sharedKeywords,
        strength,
        coVisitCount,
        control: createControlPoint(first.position, second.position, `${first.id}-${second.id}`),
      });
    }
  }

  const relationshipPaths = relationships.reduce<CartographyPath[]>((paths, relationship) => {
      const source = nodeByMaterialId.get(relationship.fromMaterialId);
      const target = nodeByMaterialId.get(relationship.toMaterialId);

      if (!source || !target) {
        return paths;
      }

      paths.push({
        id: `relationship-${relationship.id}`,
        sourceId: source.id,
        targetId: target.id,
        keywords: [relationship.action],
        strength: 0.68,
        coVisitCount: Math.min(source.engagement.visitCount, target.engagement.visitCount),
        control: createControlPoint(source.position, target.position, relationship.id),
      });

      return paths;
    }, []);

  return {
    nodes,
    supportNodes,
    paths: [...relationshipPaths, ...semanticPaths].slice(0, 42),
    latitudeRegions,
    longitudeRegions,
    summary: {
      materialCount: nodes.length,
      savedQuietCount: nodes.filter((node) => node.engagement.visitCount <= 1).length,
      revisitedCount: nodes.filter((node) => node.engagement.visitCount > 1).length,
      rediscoveredCount: nodes.filter((node) => node.engagement.rediscovered).length,
    },
  };
}
