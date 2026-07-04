import { useEffect, useMemo, useRef, useState } from 'react';

export type PanelLevel =
  | 'sphere'
  | 'pathway-overview'
  | 'pathway-environment'
  | 'section-view'
  | 'material-view';

export type PanelState =
  | 'inactive'
  | 'hover'
  | 'focused'
  | 'selected'
  | 'expanded'
  | 'nested'
  | 'linking'
  | 'returning'
  | 'unavailable'
  | 'empty'
  | 'holding';

export type PanelInteractionState =
  | 'routing'
  | 'holding'
  | 'composing'
  | 'revising'
  | 'linking'
  | 'completing';

export type PanelDisplayState = PanelState | PanelInteractionState;

export type RelationshipVisibilityMode = 'hidden' | 'contextual' | 'transfer' | 'linking' | 'routing';

export type PanelPathwayDefinition<PathwayId extends string> = {
  id: PathwayId;
  enabled: boolean;
  direction: string;
};

export type PanelNode<PathwayId extends string = string> = {
  id: string;
  level: PanelLevel;
  state: PanelState;
  pathwayId?: PathwayId;
  parentId?: string;
  sectionId?: string;
  materialId?: string;
};

export type OrientationSnapshot<PathwayId extends string = string> = {
  activePathwayId?: PathwayId;
  activeLevel: PanelLevel;
  activeState: PanelDisplayState;
  activeSectionId?: string;
  activeMaterialId?: string;
  returnTarget: PanelLevel | 'threshold';
  trail: PanelNode<PathwayId>[];
};

type PathwayStateMap<PathwayId extends string> = Record<PathwayId, PanelDisplayState>;

function createSphereNode<PathwayId extends string>(): PanelNode<PathwayId> {
  return {
    id: 'sphere',
    level: 'sphere',
    state: 'expanded',
  };
}

function createPathwayPanelId(pathwayId: string, level: PanelLevel, suffix?: string) {
  return [pathwayId, level, suffix].filter(Boolean).join(':');
}

function getInitialPathwayStates<PathwayId extends string>(
  pathways: Array<PanelPathwayDefinition<PathwayId>>,
): PathwayStateMap<PathwayId> {
  return pathways.reduce((states, pathway) => {
    states[pathway.id] = pathway.enabled ? 'inactive' : 'unavailable';
    return states;
  }, {} as PathwayStateMap<PathwayId>);
}

function getReturnTarget<PathwayId extends string>(trail: Array<PanelNode<PathwayId>>) {
  if (trail.length <= 1) {
    return 'threshold';
  }

  return trail[trail.length - 2]?.level ?? 'sphere';
}

function getLast<T>(items: T[]) {
  return items[items.length - 1];
}

function getPathwayStateForPanel(panel?: PanelNode): PanelDisplayState {
  if (!panel) {
    return 'inactive';
  }

  if (panel.level === 'pathway-overview') {
    return 'selected';
  }

  if (panel.level === 'pathway-environment') {
    return panel.state === 'empty' ? 'empty' : 'expanded';
  }

  if (panel.level === 'section-view' || panel.level === 'material-view') {
    return 'nested';
  }

  return 'inactive';
}

export function isPanelActive(state: PanelDisplayState) {
  return (
    state === 'selected' ||
    state === 'expanded' ||
    state === 'nested' ||
    state === 'routing' ||
    state === 'holding' ||
    state === 'composing' ||
    state === 'revising' ||
    state === 'linking' ||
    state === 'completing' ||
    state === 'returning'
  );
}

export function isEnvironmentPanelState(state: PanelDisplayState) {
  return (
    state === 'expanded' ||
    state === 'nested' ||
    state === 'routing' ||
    state === 'holding' ||
    state === 'composing' ||
    state === 'revising' ||
    state === 'linking' ||
    state === 'completing' ||
    state === 'returning' ||
    state === 'empty'
  );
}

export function getRelationshipVisibilityMode(
  state: PanelDisplayState,
  hasContextualRelationship: boolean,
): RelationshipVisibilityMode {
  if (state === 'linking') {
    return 'linking';
  }

  if (state === 'routing') {
    return 'routing';
  }

  if (state === 'holding') {
    return 'transfer';
  }

  return hasContextualRelationship ? 'contextual' : 'hidden';
}

export function usePanelArchitecture<PathwayId extends string>(
  pathways: Array<PanelPathwayDefinition<PathwayId>>,
) {
  const [pathwayStates, setPathwayStates] = useState<PathwayStateMap<PathwayId>>(() => getInitialPathwayStates(pathways));
  const [trail, setTrail] = useState<Array<PanelNode<PathwayId>>>(() => [createSphereNode()]);
  const focusedTimerRefs = useRef<Partial<Record<PathwayId, number>>>({});
  const returningTimerRefs = useRef<Partial<Record<PathwayId, number>>>({});
  const stateRef = useRef(pathwayStates);
  const trailRef = useRef(trail);
  const pathwayMap = useMemo(() => new Map(pathways.map((pathway) => [pathway.id, pathway])), [pathways]);

  useEffect(() => {
    stateRef.current = pathwayStates;
  }, [pathwayStates]);

  useEffect(() => {
    trailRef.current = trail;
  }, [trail]);

  useEffect(() => {
    return () => {
      const focusedTimers = Object.values(focusedTimerRefs.current) as Array<number | undefined>;
      const returningTimers = Object.values(returningTimerRefs.current) as Array<number | undefined>;

      focusedTimers.forEach((timer) => {
        if (timer !== undefined) {
          window.clearTimeout(timer);
        }
      });
      returningTimers.forEach((timer) => {
        if (timer !== undefined) {
          window.clearTimeout(timer);
        }
      });
    };
  }, []);

  const setPathwayState = (pathwayId: PathwayId, state: PanelDisplayState) => {
    setPathwayStates((current) => ({
      ...current,
      [pathwayId]: state,
    }));
  };

  const clearFocusedTimer = (pathwayId: PathwayId) => {
    const timer = focusedTimerRefs.current[pathwayId];

    if (timer !== undefined) {
      window.clearTimeout(timer);
      delete focusedTimerRefs.current[pathwayId];
    }
  };

  const resetPassivePathways = (activePathwayId: PathwayId) => {
    pathways.forEach((pathway) => {
      if (pathway.id !== activePathwayId) {
        clearFocusedTimer(pathway.id);
      }
    });

    setPathwayStates((current) => {
      const next = { ...current };

      pathways.forEach((pathway) => {
        if (pathway.id === activePathwayId || next[pathway.id] === 'returning') {
          return;
        }

        next[pathway.id] = pathway.enabled ? 'inactive' : 'unavailable';
      });

      return next;
    });
  };

  const replaceTrailForPathway = (pathwayId: PathwayId, level: PanelLevel, state: PanelState) => {
    const overviewId = createPathwayPanelId(pathwayId, 'pathway-overview');
    const nextTrail: Array<PanelNode<PathwayId>> = [
      createSphereNode(),
      {
        id: overviewId,
        level: 'pathway-overview',
        state: level === 'pathway-overview' ? state : 'selected',
        pathwayId,
        parentId: 'sphere',
      },
    ];

    if (level === 'pathway-environment') {
      nextTrail.push({
        id: createPathwayPanelId(pathwayId, 'pathway-environment'),
        level: 'pathway-environment',
        state,
        pathwayId,
        parentId: overviewId,
      });
    }

    setTrail(nextTrail);
  };

  const moveToInactive = (pathwayId: PathwayId) => {
    clearFocusedTimer(pathwayId);
    const currentState = stateRef.current[pathwayId];

    if (isPanelActive(currentState) || currentState === 'unavailable') {
      return;
    }

    setPathwayState(pathwayId, 'inactive');
    const currentPanel = getLast(trailRef.current);

    if (currentPanel?.pathwayId === pathwayId) {
      setTrail([createSphereNode()]);
    }
  };

  const getHandlers = (pathway: PanelPathwayDefinition<PathwayId>) => ({
    onMouseEnter: () => {
      const currentState = stateRef.current[pathway.id];

      if (!pathway.enabled || isPanelActive(currentState)) {
        return;
      }

      resetPassivePathways(pathway.id);
      setPathwayState(pathway.id, 'hover');
      replaceTrailForPathway(pathway.id, 'pathway-overview', 'hover');
      clearFocusedTimer(pathway.id);
      focusedTimerRefs.current[pathway.id] = window.setTimeout(() => {
        if (stateRef.current[pathway.id] === 'hover') {
          setPathwayState(pathway.id, 'focused');
          replaceTrailForPathway(pathway.id, 'pathway-overview', 'focused');
        }
      }, 680);
    },
    onMouseLeave: () => moveToInactive(pathway.id),
    onFocus: () => {
      const currentState = stateRef.current[pathway.id];

      if (!pathway.enabled || isPanelActive(currentState)) {
        return;
      }

      resetPassivePathways(pathway.id);
      clearFocusedTimer(pathway.id);
      setPathwayState(pathway.id, 'focused');
      replaceTrailForPathway(pathway.id, 'pathway-overview', 'focused');
    },
    onBlur: () => moveToInactive(pathway.id),
    onClick: () => {
      if (!pathway.enabled) {
        setPathwayState(pathway.id, 'unavailable');
        return;
      }

      resetPassivePathways(pathway.id);
      clearFocusedTimer(pathway.id);
      setPathwayState(pathway.id, 'selected');
      replaceTrailForPathway(pathway.id, 'pathway-overview', 'selected');
    },
  });

  const orientation = useMemo<OrientationSnapshot<PathwayId>>(() => {
    const activePanel = trail[trail.length - 1] ?? createSphereNode<PathwayId>();
    const activePathwayId = activePanel.pathwayId;
    const activeState = activePathwayId ? pathwayStates[activePathwayId] : activePanel.state;

    return {
      activePathwayId,
      activeLevel: activePanel.level,
      activeState,
      activeSectionId: activePanel.sectionId,
      activeMaterialId: activePanel.materialId,
      returnTarget: getReturnTarget(trail),
      trail,
    };
  }, [pathwayStates, trail]);

  return {
    getHandlers,
    orientation,
    panelTrail: trail,
    pathwayStates,
    collapseForSphereReorientation: () => {
      const activePathwayId = orientation.activePathwayId;

      if (!activePathwayId) {
        return;
      }

      setPathwayState(activePathwayId, 'returning');
      setTrail((current) => current.slice(0, 2));
    },
    expandPathway: (pathwayId: PathwayId, isEmpty = false) => {
      if (!pathwayMap.get(pathwayId)?.enabled) {
        setPathwayState(pathwayId, 'unavailable');
        return;
      }

      clearFocusedTimer(pathwayId);
      setPathwayState(pathwayId, isEmpty ? 'empty' : 'expanded');
      replaceTrailForPathway(pathwayId, 'pathway-environment', isEmpty ? 'empty' : 'expanded');
    },
    enterSection: (pathwayId: PathwayId, sectionId: string) => {
      clearFocusedTimer(pathwayId);
      setPathwayState(pathwayId, 'nested');
      setTrail((current) => {
        const base = current.filter((panel) => panel.level !== 'section-view' && panel.level !== 'material-view');
        const parentId = getLast(base)?.id ?? createPathwayPanelId(pathwayId, 'pathway-environment');

        return [
          ...base,
          {
            id: createPathwayPanelId(pathwayId, 'section-view', sectionId),
            level: 'section-view',
            state: 'nested',
            pathwayId,
            parentId,
            sectionId,
          },
        ];
      });
    },
    enterMaterial: (pathwayId: PathwayId, materialId: string, sectionId?: string) => {
      clearFocusedTimer(pathwayId);
      setPathwayState(pathwayId, 'nested');
      setTrail((current) => {
        const withoutMaterial = current.filter((panel) => panel.level !== 'material-view');
        const hasSection = withoutMaterial.some((panel) => panel.level === 'section-view' && panel.sectionId === sectionId);
        const sectionTrail = sectionId && !hasSection
          ? [
              ...withoutMaterial,
              {
                id: createPathwayPanelId(pathwayId, 'section-view', sectionId),
                level: 'section-view' as const,
                state: 'nested' as const,
                pathwayId,
                parentId: getLast(withoutMaterial)?.id,
                sectionId,
              },
            ]
          : withoutMaterial;
        const parentId = getLast(sectionTrail)?.id ?? createPathwayPanelId(pathwayId, 'pathway-environment');

        return [
          ...sectionTrail,
          {
            id: createPathwayPanelId(pathwayId, 'material-view', materialId),
            level: 'material-view',
            state: 'nested',
            pathwayId,
            parentId,
            sectionId,
            materialId,
          },
        ];
      });
    },
    setPathwayInteractionState: (pathwayId: PathwayId, state: PanelInteractionState) => {
      clearFocusedTimer(pathwayId);
      setPathwayState(pathwayId, state);
    },
    returnOneDepth: () => {
      const currentTrail = trailRef.current;
      const activePanel = getLast(currentTrail);
      const activePathwayId = activePanel?.pathwayId;

      if (!activePathwayId) {
        return;
      }

      clearFocusedTimer(activePathwayId);
      const nextTrail = currentTrail.length > 1 ? currentTrail.slice(0, -1) : [createSphereNode<PathwayId>()];
      const nextPanel = getLast(nextTrail);

      setPathwayState(activePathwayId, getPathwayStateForPanel(nextPanel));
      setTrail(nextTrail);
    },
    returnFromPathway: (pathwayId: PathwayId) => {
      clearFocusedTimer(pathwayId);
      setPathwayState(pathwayId, 'returning');
      setTrail((current) => {
        const activeIndex = current.findIndex((panel) => panel.pathwayId === pathwayId);
        return activeIndex >= 0 ? current.slice(0, activeIndex + 1) : [createSphereNode()];
      });

      const timer = returningTimerRefs.current[pathwayId];

      if (timer !== undefined) {
        window.clearTimeout(timer);
      }

      returningTimerRefs.current[pathwayId] = window.setTimeout(() => {
        setPathwayState(pathwayId, pathwayMap.get(pathwayId)?.enabled ? 'inactive' : 'unavailable');
        setTrail([createSphereNode()]);
        delete returningTimerRefs.current[pathwayId];
      }, 760);
    },
  };
}
