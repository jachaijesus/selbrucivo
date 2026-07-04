import { useEffect, useMemo, useRef, useState } from 'react';
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

function isActivePathwayState(state: PathwayState) {
  return isPanelActive(state);
}

function useMaterialRelationshipLayer() {
  const [materials, setMaterials] = useState<SphereMaterial[]>(() => createSeedMaterials());
  const [relationships, setRelationships] = useState<MaterialRelationship[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState<string | undefined>(() => createSeedMaterials()[0]?.id);
  const materialCounterRef = useRef(0);
  const relationshipCounterRef = useRef(0);

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
    setActiveMaterialId(id);
    return material;
  };

  const ensureMaterial = (pathwayId: PathwayId, title: string) => {
    const existing = materials.find((material) => material.title === compactTitle(title) && material.currentPathways.includes(pathwayId));

    if (existing) {
      setActiveMaterialId(existing.id);
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
    setActiveMaterialId(source.id);
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
    setActiveMaterialId(source.id);
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
    setActiveMaterialId(material.id);
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

  return {
    activeMaterialId,
    materials,
    relationships,
    captureMaterial,
    completeMaterial,
    composeFromMaterial,
    linkMaterial,
    openMaterial,
    removeMaterial,
    routeMaterial,
    setActiveMaterialId,
  };
}

function PathwayLabel({
  pathway,
  handlers,
}: {
  pathway: PathwayModel;
  handlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
    onClick: () => void;
  };
}) {
  if (pathway.enabled) {
    return (
      <button
        className={`pathway-label pathway-label-${pathway.position} pathway-trigger ${pathway.id}-pathway-trigger`}
        type="button"
        aria-label={`Select ${pathway.label} pathway`}
        aria-pressed={isActivePathwayState(pathway.state)}
        data-pathway-id={pathway.id}
        data-pathway-direction={pathway.direction}
        data-pathway-state={pathway.state}
        {...handlers}
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
  onOpenPathway,
  onReturnFromOverview,
}: {
  pathway: PathwayModel;
  onOpenPathway: () => void;
  onReturnFromOverview: () => void;
}) {
  if (pathway.state !== 'selected') {
    return null;
  }

  return (
    <aside className={`pathway-entry-panel ${pathway.id}-entry-panel`} aria-label={`${pathway.label} entry metadata`}>
      <span>{pathway.label} SELECTED</span>
      <span>SPHERE ROTATION: {pathway.direction}</span>
      <span>ENVIRONMENT: PREPARING</span>
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

function PathwayEnvironment({
  pathway,
  activeMaterial,
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
  onSelectMaterial,
  onSetPathwayInteractionState,
  onReturnFromPathway,
}: {
  pathway: PathwayModel;
  activeMaterial?: SphereMaterial;
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
  onSelectMaterial: (materialId: string) => void;
  onSetPathwayInteractionState: (state: PanelInteractionState | 'expanded') => void;
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
  const primaryAction = pathway.primaryAction;
  const visibleSectionTitles = pathway.materialAreas;
  const actionGroups = pathway.actionGroups.map((groupName) => ({
    groupName,
    actions: pathway.actions.filter((action) => getActionGroup(pathway.id, action) === groupName),
  })).filter((group) => group.actions.length > 0);
  const shouldShowRelationships = relationshipVisibilityMode !== 'hidden';
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
      className={`pathway-environment ${pathway.id}-environment ${pathway.state === 'returning' ? 'is-returning' : ''}`}
      aria-label={`${pathway.label} environment`}
    >
      <div className="pathway-environment-header">
        <div>
          <span className="pathway-environment-title">{pathway.label}</span>
          <span>{pathway.purpose}</span>
          <span>Current state: {pathway.state === 'expanded' ? 'Active Material' : pathway.state}</span>
          <span>Panel depth: {orientation.activeLevel}</span>
          <span>Return target: {orientation.returnTarget}</span>
          <span>Primary action: {primaryAction}</span>
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
                    className={`pathway-material-control ${sectionIndex === selectedSectionIndex ? 'is-active' : ''}`}
                    type="button"
                    aria-pressed={sectionIndex === selectedSectionIndex}
                    onClick={() => {
                      const nextSection = pathway.sections[sectionIndex] ?? pathway.sections[0];
                      setSelectedSectionIndex(Math.min(sectionIndex, Math.max(0, pathway.sections.length - 1)));
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
          onReturnOneDepth={onReturnFromPathway}
          orientation={orientation}
          pathway={pathway}
          relationships={relationships}
          relationshipVisibilityMode={relationshipVisibilityMode}
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
          <span>{pathway.label} / {sectionTitle}</span>
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
  onReturnOneDepth,
  orientation,
  pathway,
  relationships,
  relationshipVisibilityMode,
}: {
  activeMaterial?: SphereMaterial;
  onReturnOneDepth: () => void;
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

  return (
    <section className="nested-panel material-view-panel" aria-label={`${pathway.label} material view`}>
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
    </section>
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

type SphereUIProps = {
  isInteractionDisabled?: boolean;
  onReturnToThreshold?: () => void;
};

export function SphereUI({ isInteractionDisabled = false, onReturnToThreshold }: SphereUIProps) {
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
    setPathwayInteractionState,
    returnFromPathway,
  } = usePanelArchitecture<PathwayId>(PATHWAY_REGISTRY);
  const materialLayer = useMaterialRelationshipLayer();
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
  const isPathwayControllingSphere = activePathway !== undefined;
  const visiblePathwayState = visiblePathway?.state ?? 'inactive';
  const visiblePathwayClass = visiblePathway ? `${visiblePathway.id}-state-${visiblePathway.state}` : '';
  const activeMaterial = materialLayer.materials.find((material) => material.id === materialLayer.activeMaterialId);
  const relationshipVisibilityMode = getRelationshipVisibilityMode(
    visiblePathwayState,
    panelTrail.some((panel) => panel.level === 'material-view' || panel.level === 'section-view'),
  );

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

    const drawSignalNodes = (rotation: Rotation, size: number, center: number, radius: number) => {
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

        if (index % 3 === 0) {
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

    const render = () => {
      const size = SPHERE_SIZE_PRESETS[sizeKey];
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

      if (activePathway) {
        const target = activePathway.state === 'returning' ? NEUTRAL_ROTATION : PATHWAY_ROTATIONS[activePathway.direction];
        velocityRef.current = { x: 0, y: 0 };
        rotation.x += (target.x - rotation.x) * 0.055;
        rotation.y += (target.y - rotation.y) * 0.055;
      } else if (!dragRef.current.isDragging) {
        velocityRef.current.x *= 0.985;
        velocityRef.current.y *= 0.985;
        rotation.x += velocityRef.current.x;
        rotation.y += velocityRef.current.y + 0.0011;
      }

      context.save();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      drawWireframe(rotation, size, center, radius);
      drawSelectionBand(rotation, size, center, radius);
      drawSignalNodes(rotation, size, center, radius);

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

        if (point.label && point.depth > 0.48) {
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

      drawGlyph(context, 'SELECT SUPPORT NODE', center, size * 0.075, '#35e9ff', 0.78, Math.max(10, size * 0.027));
      drawGlyph(context, 'SYS SUPPORT // ASCII NAV HUB', center, size * 0.115, '#21f58a', 0.66, Math.max(8, size * 0.018));
      drawGlyph(context, 'SIGNAL STABLE  ALT 047  NODE ACTIVE', center, size * 0.93, '#f0d36a', 0.64, Math.max(8, size * 0.018));
      context.restore();

      animationRef.current = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activePathway, points, sizeKey]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isInteractionDisabled || isPathwayControllingSphere) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current.isDragging = true;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isInteractionDisabled || isPathwayControllingSphere || !dragRef.current.isDragging) {
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

  return (
    <main
      className={[
        'ascii-shell',
        activePathway ? 'pathway-active' : '',
        visiblePathway ? `pathway-state-${visiblePathwayState}` : '',
        visiblePathwayClass,
      ].join(' ')}
      data-active-pathway={activePathway?.id ?? 'none'}
      data-visible-pathway={visiblePathway?.id ?? 'none'}
      data-visible-pathway-state={visiblePathwayState}
    >
      <div className="pathway-orientation-layer">
        {pathwayModels.map((pathway) => (
          <PathwayLabel
            key={pathway.id}
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
          aria-label="Rotatable ASCII wireframe support sphere with coordinates, system labels, and data nodes"
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
          onOpenPathway={() => expandPathway(pathway.id, pathway.sections.length === 0)}
          onReturnFromOverview={returnOneDepth}
        />
      ))}
      {pathwayModels.map((pathway) => (
        <PathwayEnvironment
          key={`${pathway.id}-environment`}
          pathway={pathway}
          activeMaterial={activeMaterial}
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
          onSelectMaterial={materialLayer.setActiveMaterialId}
          onSetPathwayInteractionState={(state) => {
            if (state === 'expanded') {
              expandPathway(pathway.id, pathway.sections.length === 0);
              return;
            }

            setPathwayInteractionState(pathway.id, state);
          }}
          onReturnFromPathway={returnOneDepth}
        />
      ))}

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
    </main>
  );
}
