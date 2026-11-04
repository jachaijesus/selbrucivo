import type { PanelDisplayState } from '../panelArchitecture';
import type { ActionGroupName, PathwayAction } from './actions';
import type { LifecycleStage, MaterialKind } from './materials';
import { createRelationshipRule, type PathwayRelationshipRule } from './relationships';

export type PathwayId = 'chrysopoeia' | 'golem' | 'fafo' | 'essays';
export type FuturePathwayId = 'radio' | 'observatory';
export type PathwayDirection = 'north' | 'south' | 'east' | 'west';
export type PathwayState = PanelDisplayState;

export type PathwaySection = {
  title: string;
  items: string[];
};

export type PathwayDefinition = {
  id: PathwayId;
  label: string;
  direction: PathwayDirection;
  position: PathwayDirection;
  enabled: boolean;
  behavioralRole: string;
  purpose: string;
  entryAction: string;
  entryEnvironment: string;
  overview: string[];
  counts: string[];
  summary: string;
  preview: string[];
  materialAreas: string[];
  primaryAction: string;
  lifecycleStage: LifecycleStage;
  materialKind: MaterialKind;
  actionGroups: ActionGroupName[];
  sections: PathwaySection[];
  actions: PathwayAction[];
  relationships: PathwayRelationshipRule[];
};

export type PathwayModel = PathwayDefinition & {
  state: PathwayState;
};

const relationship = createRelationshipRule;

export const PATHWAY_REGISTRY: PathwayDefinition[] = [
  {
    id: 'chrysopoeia',
    label: 'CHRYSOPOEIA',
    direction: 'north',
    position: 'north',
    enabled: true,
    behavioralRole: 'preservation',
    purpose: 'Preservation / intentional retention',
    entryAction: 'OPEN CHRYSOPOEIA',
    entryEnvironment: 'CHRYSOPOEIA',
    overview: ['Overview: 13 Collections', '666 Preserved Ref.', 'Currently Open', 'Recent Return', 'OPEN CHRYSOPOEIA'],
    counts: ['13 Collections', '666 Preserved Ref.'],
    summary: 'Preservation / Reference / Intentional Retention',
    preview: ['Recent Return: Available', 'Currently Open: Chrysopoeia Preview'],
    materialAreas: ['Preserved References', 'Collections', 'Recent Return', 'Related Materials'],
    primaryAction: 'Preserve Reference',
    lifecycleStage: 'preservation',
    materialKind: 'archive-record',
    actionGroups: ['Preserve', 'Annotate', 'Link', 'Retrieve'],
    sections: [
      {
        title: 'Sections',
        items: ['Core Texts', 'Auditory Responses', 'Ebb & Flow', 'Aesthetics'],
      },
    ],
    actions: [
      { id: 'preserve-reference', label: 'Preserve Reference', kind: 'standard', group: 'Preserve' },
      { id: 'add-annotation', label: 'Add Annotation', kind: 'capture', group: 'Annotate' },
      { id: 'link-essay', label: 'Link to Essay', kind: 'link', destination: 'Essay', group: 'Link' },
      { id: 'link-library', label: 'Link to Golem', kind: 'link', destination: 'Golem', group: 'Link' },
      { id: 'move-collection', label: 'Move Collection', kind: 'standard', group: 'Retrieve' },
      { id: 'open-original', label: 'Open Original', kind: 'standard', group: 'Retrieve' },
    ],
    relationships: [
      relationship('Golem', 'Chrysopoeia', 'Allowed'),
      relationship('Chrysopoeia', 'Essays', 'Allowed'),
      relationship('Chrysopoeia', 'FaFo', 'Optional / Never Automatic'),
      relationship('Chrysopoeia', 'Golem', 'Allowed'),
    ],
  },
  {
    id: 'golem',
    label: 'GOLEM',
    direction: 'south',
    position: 'south',
    enabled: true,
    behavioralRole: 'engagement',
    purpose: 'Active study / current engagement',
    entryAction: 'OPEN GOLEM',
    entryEnvironment: 'GOLEM',
    overview: ['Overview', 'Current Studies', 'Recently Opened', 'Reading / Listening Queue', 'Reference Shelf', 'Unsorted Materials'],
    counts: ['21 Active Materials', '8 Recent Returns'],
    summary: 'Active Study / Open Materials / Current Engagement',
    preview: ['Recently Opened: Available', 'Current Studies: In Progress'],
    materialAreas: ['Active Materials', 'Recently Opened', 'Current Studies', 'Reference Shelf'],
    primaryAction: 'Open Material',
    lifecycleStage: 'engagement',
    materialKind: 'reference',
    actionGroups: ['Open', 'Study', 'Sort', 'Preserve / Link'],
    sections: [
      {
        title: 'Current Studies',
        items: ['Books', 'Essays', 'Videos', 'Lectures', 'Articles', 'Design References', 'Saved Links'],
      },
      {
        title: 'Recently Opened',
        items: ['Recently Accessed Materials', 'Unpreserved References', 'Open Comparisons'],
      },
      {
        title: 'Reading / Listening Queue',
        items: ['Awaiting Reading', 'Awaiting Listening', 'Return for Review'],
      },
      {
        title: 'Reference Shelf',
        items: ['Essays', 'Observations', 'Visual Research'],
      },
      {
        title: 'Unsorted Materials',
        items: ['Recently Added', 'Needs Category', 'Temporary Holding'],
      },
    ],
    actions: [
      { id: 'open-material', label: 'Open Material', kind: 'standard', group: 'Open' },
      { id: 'continue-study', label: 'Continue Study', kind: 'standard', group: 'Study' },
      { id: 'add-note', label: 'Add Note', kind: 'capture', group: 'Study' },
      { id: 'move-archive', label: 'Move To Chrysopoeia', kind: 'route', destination: 'Chrysopoeia', group: 'Preserve / Link' },
      { id: 'link-essay', label: 'Link To Essay', kind: 'link', destination: 'Essay', group: 'Preserve / Link' },
      { id: 'link-train-station', label: 'Link To FaFo', kind: 'link', destination: 'FaFo', group: 'Preserve / Link' },
      { id: 'sort-material', label: 'Sort Material', kind: 'standard', group: 'Sort' },
      { id: 'remove-shelf', label: 'Remove From Shelf', kind: 'remove', group: 'Sort' },
    ],
    relationships: [
      relationship('Golem', 'Chrysopoeia', 'Allowed'),
      relationship('Chrysopoeia', 'Golem', 'Allowed'),
      relationship('Golem', 'Essays', 'Allowed'),
      relationship('Golem', 'FaFo', 'Optional / Never Automatic'),
      relationship('Golem', 'Radio', 'Optional / Never Automatic'),
    ],
  },
  {
    id: 'fafo',
    label: 'FaFo',
    direction: 'east',
    position: 'east',
    enabled: true,
    behavioralRole: 'observation-routing',
    purpose: 'Observation / field intake / routing',
    entryAction: 'OPEN FaFo',
    entryEnvironment: 'FaFo',
    overview: [
      'Overview: Station Board',
      'Recent Arrivals: 9',
      'Unsorted Signals: 6',
      'Departures Pending: 4',
      'Suggested Routes: 5',
      'OPEN FaFo',
    ],
    counts: ['9 Recent Arrivals', '6 Unsorted Signals'],
    summary: 'Observation / Arrival / Departure / Field Intake / Routing',
    preview: ['Recent Arrival: Night Platform Reflection', 'Suggested Route: Golem / Chrysopoeia / Observatory'],
    materialAreas: ['Recent Arrivals', 'Signals Waiting', 'Departures', 'Platforms'],
    primaryAction: 'Capture Arrival',
    lifecycleStage: 'observation',
    materialKind: 'observation',
    actionGroups: ['Capture', 'Hold', 'Route', 'Return'],
    sections: [
      {
        title: 'Arrivals',
        items: ['Night Platform Reflection', 'Class Margin Note', 'Studio Window Light', 'Commute Audio Fragment'],
      },
      {
        title: 'Departures',
        items: ['Observation Cluster -> Golem', 'Reference Trace -> Chrysopoeia', 'Signal Draft -> Essay'],
      },
      {
        title: 'Platforms',
        items: ['Walk', 'Commute', 'Class', 'Studio', 'City', 'Dream', 'Conversation', 'Research Trip', 'Night Notes'],
      },
      {
        title: 'Field Notes',
        items: ['Incomplete street detail', 'Unresolved question from seminar', 'Half-formed comparison', 'Sound noted without source'],
      },
      {
        title: 'Signals Waiting',
        items: ['Loose phrase', 'Image memory', 'Map pin', 'Name to revisit', 'Material without route'],
      },
    ],
    actions: [
      { id: 'add-field-note', label: 'Add Field Note', kind: 'capture', group: 'Capture' },
      { id: 'capture-arrival', label: 'Capture Arrival', kind: 'capture', group: 'Capture' },
      { id: 'mark-departure', label: 'Mark Departure', kind: 'departure', group: 'Capture' },
      { id: 'route-library', label: 'Route to Golem', kind: 'route', destination: 'Golem', group: 'Route' },
      { id: 'route-archive', label: 'Route to Chrysopoeia', kind: 'route', destination: 'Chrysopoeia', group: 'Route' },
      { id: 'route-essay', label: 'Route to Essay', kind: 'route', destination: 'Essay', group: 'Route' },
      { id: 'route-radio', label: 'Route to Radio', kind: 'route', destination: 'Radio', group: 'Route' },
      { id: 'route-observatory', label: 'Route to Observatory', kind: 'route', destination: 'Observatory', group: 'Route' },
      { id: 'link-material', label: 'Link Material', kind: 'link', group: 'Route' },
      { id: 'hold-station', label: 'Hold in Station', kind: 'hold', group: 'Hold' },
      { id: 'remove-signal', label: 'Remove Signal', kind: 'remove', group: 'Hold' },
    ],
    relationships: [
      relationship('FaFo', 'Golem', 'Intentional Route'),
      relationship('FaFo', 'Chrysopoeia', 'Intentional Route'),
      relationship('FaFo', 'Essays', 'Intentional Route'),
      relationship('FaFo', 'Radio', 'Intentional Route'),
      relationship('FaFo', 'Observatory', 'Intentional Route'),
      relationship('Golem', 'FaFo', 'Optional / Never Automatic'),
      relationship('Chrysopoeia', 'FaFo', 'Optional / Never Automatic'),
    ],
  },
  {
    id: 'essays',
    label: 'ESSAYS',
    direction: 'west',
    position: 'west',
    enabled: true,
    behavioralRole: 'synthesis',
    purpose: 'Synthesis / authorship / reflection',
    entryAction: 'OPEN ESSAYS',
    entryEnvironment: 'ESSAYS',
    overview: ['Active Drafts', 'Open Questions', 'Linked References', 'Recent Revisions', 'OPEN ESSAYS'],
    counts: ['7 Active Drafts', '11 Open Questions'],
    summary: 'Synthesis / Authorship / Reflection / Interpretation / Meaning-Making',
    preview: ['Recent Draft: What am I trying to say?', 'Linked References: Chrysopoeia / Golem / FaFo'],
    materialAreas: ['Active Drafts', 'Seeds', 'Reference Links', 'Recent Revisions'],
    primaryAction: 'Create Draft',
    lifecycleStage: 'synthesis',
    materialKind: 'draft',
    actionGroups: ['Compose', 'Revise', 'Link', 'Preserve'],
    sections: [
      {
        title: 'Active Drafts',
        items: ['Current Essays', 'Reflections', 'Fragments', 'Notes', 'Arguments', 'Letters', 'Unfinished Manuscripts'],
      },
      {
        title: 'Seeds',
        items: ['Question from FaFo', 'Thesis Fragment', 'Field Note', 'Quoted Passage', 'Symbol Noted', 'Observation Cluster'],
      },
      {
        title: 'Reference Links',
        items: ['Books', 'Articles', 'Images', 'Recordings', 'Field Notes', 'Saved References', 'Prior Essays'],
      },
      {
        title: 'Margins',
        items: ['Side Thought', 'Question', 'Contradiction', 'Alternative Direction', 'Annotation'],
      },
      {
        title: 'Revisions',
        items: ['Prior Versions', 'Returned Drafts', 'Alternate Passages', 'Changed Interpretations'],
      },
      {
        title: 'Completed Works',
        items: ['Student-Defined Completed Essays', 'Preserved Reflection', 'Returned Manuscript'],
      },
    ],
    actions: [
      { id: 'create-draft', label: 'Create Draft', kind: 'compose', group: 'Compose' },
      { id: 'continue-draft', label: 'Continue Draft', kind: 'compose', group: 'Compose' },
      { id: 'add-reflection', label: 'Add Reflection', kind: 'capture', group: 'Compose' },
      { id: 'link-reference', label: 'Link Reference', kind: 'link', destination: 'Reference', group: 'Link' },
      { id: 'cite-archive-material', label: 'Cite Chrysopoeia Material', kind: 'link', destination: 'Chrysopoeia', group: 'Link' },
      { id: 'pull-library', label: 'Pull from Golem', kind: 'link', destination: 'Golem', group: 'Link' },
      { id: 'pull-train-station', label: 'Pull from FaFo', kind: 'link', destination: 'FaFo', group: 'Link' },
      { id: 'add-margin-note', label: 'Add Margin Note', kind: 'capture', group: 'Compose' },
      { id: 'revise-passage', label: 'Revise Passage', kind: 'revise', group: 'Revise' },
      { id: 'mark-complete', label: 'Mark as Complete', kind: 'complete', group: 'Revise' },
      { id: 'preserve-archive', label: 'Preserve in Chrysopoeia', kind: 'route', destination: 'Chrysopoeia', group: 'Preserve' },
    ],
    relationships: [
      relationship('FaFo', 'Essays', 'Intentional Route'),
      relationship('Golem', 'Essays', 'Intentional Link'),
      relationship('Chrysopoeia', 'Essays', 'Intentional Citation'),
      relationship('Essays', 'Chrysopoeia', 'Intentional Preserve'),
      relationship('Essays', 'Golem', 'Intentional Reference'),
      relationship('Essays', 'FaFo', 'Intentional Return'),
      relationship('Essays', 'Radio', 'Optional / Never Automatic'),
      relationship('Essays', 'Observatory', 'Optional / Never Automatic'),
    ],
  },
];

export const PATHWAY_LABEL_TO_ID: Record<string, PathwayId | undefined> = {
  Chrysopoeia: 'chrysopoeia',
  Golem: 'golem',
  FaFo: 'fafo',
  Archive: 'chrysopoeia',
  Library: 'golem',
  'Train Station': 'fafo',
  Essay: 'essays',
  Essays: 'essays',
};

export const PATHWAY_ROTATIONS: Record<PathwayDirection, { x: number; y: number }> = {
  north: { x: -0.88, y: 0.08 },
  south: { x: 0.72, y: 0.08 },
  east: { x: -0.18, y: -0.78 },
  west: { x: -0.18, y: 1.16 },
};

export function getDestinationPathway(destination?: string) {
  if (!destination) {
    return undefined;
  }

  return PATHWAY_LABEL_TO_ID[destination];
}

export function getPathwayLabel(pathwayId: PathwayId) {
  return PATHWAY_REGISTRY.find((pathway) => pathway.id === pathwayId)?.label ?? pathwayId;
}

export function getPathwayDefinition(pathwayId: PathwayId) {
  return PATHWAY_REGISTRY.find((pathway) => pathway.id === pathwayId);
}
