export type OrientationStep = 'threshold' | 'identity' | 'intent' | 'discipline' | 'environment' | 'confirmation';

export type OrientationStatus = 'idle' | 'orienting' | 'prepared';

export type OrientationIdentityField =
  | 'preferredName'
  | 'addressName'
  | 'schoolStatus'
  | 'schoolName'
  | 'programOfStudy'
  | 'preferredLanguage'
  | 'timeZone';

export type OrientationPracticeId =
  | 'study-intentionally'
  | 'expand-creative-knowledge'
  | 'prepare-for-school'
  | 'ask-better-questions'
  | 'reflect-on-experiences'
  | 'research-myself'
  | 'write-consistently'
  | 'practice-illustration'
  | 'build-design-systems'
  | 'organize-research'
  | 'develop-visual-thinking'
  | 'teach-others'
  | 'curate-curriculums';

export type OrientationDisciplineId =
  | 'illustration'
  | 'animation'
  | 'graphic-design'
  | 'photography'
  | 'film'
  | 'industrial-design'
  | 'architecture'
  | 'interior-design'
  | 'teaching'
  | 'curriculum-design'
  | 'programming'
  | 'engineering'
  | 'data-science'
  | 'writing'
  | 'history'
  | 'philosophy'
  | 'psychology'
  | 'sociology'
  | 'anthropology'
  | 'entrepreneurship'
  | 'marketing'
  | 'finance';

export type OrientationWorkspaceComponent =
  | 'Archive'
  | 'Library'
  | 'Train Station'
  | 'Essays'
  | 'Radio'
  | 'Observatory'
  | 'Workshop'
  | 'Studio';

export type OrientationIdentity = Record<OrientationIdentityField, string>;

export type OrientationEnvironment = {
  allComponents: OrientationWorkspaceComponent[];
  initialVisible: OrientationWorkspaceComponent[];
  rationale: string[];
};

export type OrientationProfile = {
  identity: OrientationIdentity;
  practices: OrientationPracticeId[];
  disciplines: OrientationDisciplineId[];
  environment: OrientationEnvironment;
};

export type OrientationState = {
  status: OrientationStatus;
  step: OrientationStep;
  profile: OrientationProfile;
};

export type OrientationPracticeOption = {
  id: OrientationPracticeId;
  label: string;
  supports: OrientationWorkspaceComponent[];
};

export type OrientationDisciplineGroup = {
  label: string;
  disciplines: Array<{ id: OrientationDisciplineId; label: string }>;
};

export const ORIENTATION_STEPS: OrientationStep[] = [
  'threshold',
  'identity',
  'intent',
  'discipline',
  'environment',
  'confirmation',
];

export const ORIENTATION_WORKSPACE_COMPONENTS: OrientationWorkspaceComponent[] = [
  'Archive',
  'Library',
  'Train Station',
  'Essays',
  'Radio',
  'Observatory',
  'Workshop',
  'Studio',
];

export const ORIENTATION_PRACTICES: OrientationPracticeOption[] = [
  { id: 'study-intentionally', label: 'Study Intentionally', supports: ['Library', 'Archive', 'Train Station'] },
  { id: 'expand-creative-knowledge', label: 'Expand Creative Knowledge', supports: ['Library', 'Studio', 'Observatory'] },
  { id: 'prepare-for-school', label: 'Prepare for School', supports: ['Train Station', 'Library', 'Essays'] },
  { id: 'ask-better-questions', label: 'Ask Better Questions', supports: ['Observatory', 'Library', 'Archive'] },
  { id: 'reflect-on-experiences', label: 'Reflect on Experiences', supports: ['Essays', 'Archive', 'Radio'] },
  { id: 'research-myself', label: 'Research Myself', supports: ['Archive', 'Observatory', 'Essays'] },
  { id: 'write-consistently', label: 'Write Consistently', supports: ['Essays', 'Library', 'Archive'] },
  { id: 'practice-illustration', label: 'Practice Illustration', supports: ['Studio', 'Workshop', 'Library'] },
  { id: 'build-design-systems', label: 'Build Design Systems', supports: ['Workshop', 'Studio', 'Archive'] },
  { id: 'organize-research', label: 'Organize Research', supports: ['Archive', 'Library', 'Train Station'] },
  { id: 'develop-visual-thinking', label: 'Develop Visual Thinking', supports: ['Studio', 'Observatory', 'Workshop'] },
  { id: 'teach-others', label: 'Teach Others', supports: ['Library', 'Radio', 'Train Station'] },
  { id: 'curate-curriculums', label: 'Curate Curriculums', supports: ['Library', 'Archive', 'Train Station'] },
];

export const ORIENTATION_DISCIPLINE_GROUPS: OrientationDisciplineGroup[] = [
  {
    label: 'Creative Arts',
    disciplines: [
      { id: 'illustration', label: 'Illustration' },
      { id: 'animation', label: 'Animation' },
      { id: 'graphic-design', label: 'Graphic Design' },
      { id: 'photography', label: 'Photography' },
      { id: 'film', label: 'Film' },
    ],
  },
  {
    label: 'Design',
    disciplines: [
      { id: 'industrial-design', label: 'Industrial Design' },
      { id: 'architecture', label: 'Architecture' },
      { id: 'interior-design', label: 'Interior Design' },
    ],
  },
  {
    label: 'Education',
    disciplines: [
      { id: 'teaching', label: 'Teaching' },
      { id: 'curriculum-design', label: 'Curriculum Design' },
    ],
  },
  {
    label: 'Technology',
    disciplines: [
      { id: 'programming', label: 'Programming' },
      { id: 'engineering', label: 'Engineering' },
      { id: 'data-science', label: 'Data Science' },
    ],
  },
  {
    label: 'Humanities',
    disciplines: [
      { id: 'writing', label: 'Writing' },
      { id: 'history', label: 'History' },
      { id: 'philosophy', label: 'Philosophy' },
    ],
  },
  {
    label: 'Social Sciences',
    disciplines: [
      { id: 'psychology', label: 'Psychology' },
      { id: 'sociology', label: 'Sociology' },
      { id: 'anthropology', label: 'Anthropology' },
    ],
  },
  {
    label: 'Business',
    disciplines: [
      { id: 'entrepreneurship', label: 'Entrepreneurship' },
      { id: 'marketing', label: 'Marketing' },
      { id: 'finance', label: 'Finance' },
    ],
  },
];

export const SCHOOL_STATUS_OPTIONS = ['In school', 'Between programs', 'Independent study', 'Teaching', 'Prefer not to say'];

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function normalizeOrientationText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function getPracticeLabel(id: OrientationPracticeId) {
  return ORIENTATION_PRACTICES.find((practice) => practice.id === id)?.label ?? id;
}

export function getDisciplineLabel(id: OrientationDisciplineId) {
  return ORIENTATION_DISCIPLINE_GROUPS.flatMap((group) => group.disciplines).find((discipline) => discipline.id === id)?.label ?? id;
}

export function createInitialOrientationIdentity(): OrientationIdentity {
  return {
    preferredName: '',
    addressName: '',
    schoolStatus: '',
    schoolName: '',
    programOfStudy: '',
    preferredLanguage: '',
    timeZone: getBrowserTimeZone(),
  };
}

function uniqueComponents(components: OrientationWorkspaceComponent[]) {
  return components.filter((component, index) => components.indexOf(component) === index);
}

export function prepareOrientationEnvironment(profile: Pick<OrientationProfile, 'identity' | 'practices' | 'disciplines'>): OrientationEnvironment {
  const practiceComponents = profile.practices.flatMap((practiceId) => (
    ORIENTATION_PRACTICES.find((practice) => practice.id === practiceId)?.supports ?? []
  ));
  const visible = uniqueComponents(['Archive', 'Library', ...practiceComponents]).slice(0, 5);
  const disciplineContext = profile.disciplines.length > 0
    ? `${profile.disciplines.map(getDisciplineLabel).slice(0, 3).join(' / ')} context`
    : 'general study context';

  return {
    allComponents: ORIENTATION_WORKSPACE_COMPONENTS,
    initialVisible: visible,
    rationale: [
      'Archive and Library remain visible as common reference ground.',
      profile.practices.length > 0
        ? 'Declared practices bring forward a smaller first set of pathways.'
        : 'No practice has been declared yet; the environment remains broadly open.',
      `Discipline selections provide ${disciplineContext}; they do not restrict movement.`,
    ],
  };
}

export function createInitialSignupProtocolState(): OrientationState {
  const identity = createInitialOrientationIdentity();
  const practices: OrientationPracticeId[] = [];
  const disciplines: OrientationDisciplineId[] = [];

  return {
    status: 'idle',
    step: 'threshold',
    profile: {
      identity,
      practices,
      disciplines,
      environment: prepareOrientationEnvironment({ identity, practices, disciplines }),
    },
  };
}

export function createInvestorDemoSignupProtocolState(): OrientationState {
  const identity: OrientationIdentity = {
    ...createInitialOrientationIdentity(),
    preferredName: 'Mira',
    addressName: 'Mira',
    schoolStatus: 'Independent study',
    preferredLanguage: 'English',
    timeZone: getBrowserTimeZone(),
  };
  const practices: OrientationPracticeId[] = ['study-intentionally', 'organize-research'];
  const disciplines: OrientationDisciplineId[] = ['writing', 'interior-design'];
  const environment: OrientationEnvironment = {
    ...prepareOrientationEnvironment({ identity, practices, disciplines }),
    initialVisible: ['Archive', 'Library', 'Train Station', 'Essays'],
  };

  return {
    status: 'prepared',
    step: 'confirmation',
    profile: {
      identity,
      practices,
      disciplines,
      environment,
    },
  };
}

export function isOrientationIdentityReady(identity: OrientationIdentity) {
  return (
    normalizeOrientationText(identity.preferredName).length > 0 &&
    normalizeOrientationText(identity.addressName).length > 0 &&
    normalizeOrientationText(identity.schoolStatus).length > 0 &&
    normalizeOrientationText(identity.preferredLanguage).length > 0 &&
    normalizeOrientationText(identity.timeZone).length > 0
  );
}

export function canAccessAfterOrientation(state: OrientationState) {
  return (
    isOrientationIdentityReady(state.profile.identity) &&
    state.profile.practices.length > 0 &&
    state.profile.disciplines.length > 0 &&
    state.profile.environment.initialVisible.length > 0
  );
}

export function getSignupProtocolStatus(state: OrientationState): OrientationStatus {
  if (state.step === 'confirmation' && canAccessAfterOrientation(state)) {
    return 'prepared';
  }

  if (state.step !== 'threshold') {
    return 'orienting';
  }

  return 'idle';
}

export type SignupProtocolField = OrientationIdentityField;
export type SignupProtocolStep = OrientationStep;
export type SignupProtocolState = OrientationState;
