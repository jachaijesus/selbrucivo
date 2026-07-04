export type InternalMenuTab = 'materials' | 'actions' | 'connections' | 'doctrine';

export const INTERNAL_MENU_TABS: Array<{ id: InternalMenuTab; label: string }> = [
  { id: 'materials', label: 'Materials' },
  { id: 'actions', label: 'Actions' },
  { id: 'connections', label: 'Connections' },
  { id: 'doctrine', label: 'Doctrine' },
];

export type SignupProtocolSurface = {
  status: 'placeholder';
};

export type SearchSystemSurface = {
  status: 'placeholder';
};

export type ExternalImportSurface = {
  status: 'placeholder';
};

export type WritingEngineSurface = {
  status: 'placeholder';
};

export type AiAssistanceSurface = {
  status: 'placeholder';
};

export type FutureSystemSurfaces = {
  signupProtocol: SignupProtocolSurface;
  search: SearchSystemSurface;
  externalImport: ExternalImportSurface;
  writingEngine: WritingEngineSurface;
  aiAssistance: AiAssistanceSurface;
};

export const FUTURE_SYSTEM_SURFACES: FutureSystemSurfaces = {
  signupProtocol: { status: 'placeholder' },
  search: { status: 'placeholder' },
  externalImport: { status: 'placeholder' },
  writingEngine: { status: 'placeholder' },
  aiAssistance: { status: 'placeholder' },
};
