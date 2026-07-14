import {
  CONTACT_PREFERENCE_OPTIONS,
  ORIENTATION_DISCIPLINE_GROUPS,
  ORIENTATION_PRACTICES,
  SCHOOL_STATUS_OPTIONS,
  canAccessAfterOrientation,
  getDisciplineLabel,
  getPracticeLabel,
  isOrientationIdentityReady,
  type OrientationDisciplineId,
  type OrientationPracticeId,
  type OrientationWorkspaceComponent,
  type SignupProtocolField,
  type SignupProtocolState,
  type SignupProtocolStep,
} from '../domain/signupProtocol';
import './LoginUI.css';

type LoginUIProps = {
  isTransitioning: boolean;
  signupProtocol: SignupProtocolState;
  transitionDirection?: 'enter' | 'exit';
  onAccess: () => void;
  onAccessAfterOrientation: () => void;
  onSetSignupStep: (step: SignupProtocolStep) => void;
  onToggleOrientationDiscipline: (discipline: OrientationDisciplineId) => void;
  onToggleOrientationPractice: (practice: OrientationPracticeId) => void;
  onToggleOrientationWorkspaceComponent: (component: OrientationWorkspaceComponent) => void;
  onUpdateSignupField: (field: SignupProtocolField, value: string) => void;
};

type IdentityFieldConfig = {
  field: SignupProtocolField;
  label: string;
  purpose: string;
  autoComplete?: string;
  options?: string[];
  type?: string;
};

const IDENTITY_FIELDS: IdentityFieldConfig[] = [
  {
    field: 'preferredName',
    label: 'Preferred name',
    purpose: 'Used in greetings and personal archive references.',
    autoComplete: 'given-name',
  },
  {
    field: 'addressName',
    label: 'How Selbrucivo should address you',
    purpose: 'Sets the form of address used by institutional notes.',
  },
  {
    field: 'schoolStatus',
    label: 'School status',
    purpose: 'Helps tune study language without assuming enrollment.',
    options: SCHOOL_STATUS_OPTIONS,
  },
  {
    field: 'schoolName',
    label: 'School name, if applicable',
    purpose: 'Available for future institutional context.',
    autoComplete: 'organization',
  },
  {
    field: 'programOfStudy',
    label: 'Program of study, if applicable',
    purpose: 'Gives coursework and project material a clearer frame.',
  },
  {
    field: 'preferredEmail',
    label: 'Preferred email',
    purpose: 'Reserved for essential account and archive notices.',
    autoComplete: 'email',
    type: 'email',
  },
  {
    field: 'nationality',
    label: 'Nationality',
    purpose: 'Supports future language, residency, and school-context care.',
    autoComplete: 'country-name',
  },
  {
    field: 'preferredLanguage',
    label: 'Preferred language',
    purpose: 'Sets the first language Selbrucivo should assume.',
    autoComplete: 'language',
  },
  {
    field: 'timeZone',
    label: 'Time zone',
    purpose: 'Keeps dated notes and study rhythms locally legible.',
  },
  {
    field: 'contactPreference',
    label: 'Contact preference',
    purpose: 'Controls the expected quietness of future communication.',
    options: CONTACT_PREFERENCE_OPTIONS,
  },
];

const STEP_LABELS: Array<{ step: Exclude<SignupProtocolStep, 'threshold'>; label: string }> = [
  { step: 'identity', label: 'Identity' },
  { step: 'intent', label: 'Intent' },
  { step: 'discipline', label: 'Discipline' },
  { step: 'environment', label: 'Environment' },
  { step: 'confirmation', label: 'Confirmation' },
];

const PREVIOUS_ORIENTATION_STEP: Partial<Record<SignupProtocolStep, SignupProtocolStep>> = {
  intent: 'identity',
  discipline: 'intent',
  environment: 'discipline',
  confirmation: 'environment',
};

export function LoginUI({
  isTransitioning,
  signupProtocol,
  transitionDirection = 'enter',
  onAccess,
  onAccessAfterOrientation,
  onSetSignupStep,
  onToggleOrientationDiscipline,
  onToggleOrientationPractice,
  onToggleOrientationWorkspaceComponent,
  onUpdateSignupField,
}: LoginUIProps) {
  const isEntering = isTransitioning && transitionDirection === 'enter';
  const isExiting = isTransitioning && transitionDirection === 'exit';
  const isProtocolOpen = signupProtocol.step !== 'threshold';
  const identityReady = isOrientationIdentityReady(signupProtocol.profile.identity);
  const canAccess = canAccessAfterOrientation(signupProtocol);
  const { identity, practices, disciplines, environment } = signupProtocol.profile;

  return (
    <main
      className={[
        'login-entry',
        isEntering ? 'is-deconstructing' : '',
        isExiting ? 'is-reconstructing' : '',
      ].join(' ')}
      id="entry"
    >
      <section className="login-composition" aria-labelledby="selbrucivo-title">
        <header className="login-masthead transition-source source-masthead">
          <div className="system-strip" aria-hidden="true">THRESHOLD :: INSTITUTIONAL</div>
          <h1 id="selbrucivo-title">SELBRUCIVO</h1>
        </header>

        <section className="study transition-source source-study" aria-label="Academia introduction">
          <p className="subtitle">The Academia of Self</p>
          <p className="axiom">ARCHIVE FOR THE STUDY OF INTERIOR BEHAVIOR</p>
          <div className="mark-field" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>

        <section
          className={[
            'access-panel transition-source source-access',
            isProtocolOpen ? 'is-orienting' : '',
          ].join(' ')}
          aria-label="Enter the system"
        >
          <header aria-hidden="true">
            <span>Members and fellows</span>
            <span>Reading room</span>
          </header>

          <form
            id="access-form"
            onSubmit={(event) => {
              event.preventDefault();
              onAccess();
            }}
          >
            <p className="access-title">Enter archive</p>
            <p className="access-context">A quiet passage into the Academy's living collection.</p>

            <div className="field-row">
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" defaultValue="lorem@selbrucivo.edu" />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" defaultValue="password" />
              </div>
            </div>

            <div className="access-line">
              <p className="microcopy">FOR STUDY OF SELF</p>
              <button type="submit" disabled={isTransitioning}>ACCESS</button>
            </div>
          </form>

          <div className={`signup-protocol ${isProtocolOpen ? 'is-open' : ''}`} aria-label="Threshold Orientation">
            {!isProtocolOpen ? (
              <button
                className="signup-protocol-trigger"
                type="button"
                disabled={isTransitioning}
                onClick={() => onSetSignupStep('identity')}
              >
                Begin Orientation
              </button>
            ) : (
              <div className="signup-protocol-surface">
                <div className="signup-protocol-heading">
                  <span>Threshold Orientation</span>
                  <span>{signupProtocol.status}</span>
                </div>

                <div className="signup-protocol-steps" aria-hidden="true">
                  {STEP_LABELS.map((item) => (
                    <span key={item.step} className={signupProtocol.step === item.step ? 'is-active' : ''}>
                      {item.label}
                    </span>
                  ))}
                </div>

                {signupProtocol.step === 'identity' && (
                  <div className="orientation-panel" aria-labelledby="orientation-identity-title">
                    <div className="orientation-copy">
                      <h2 id="orientation-identity-title">Identity Framework</h2>
                      <p>Selbrucivo asks only for details that can shape address, context, language, and future care.</p>
                    </div>

                    <div className="orientation-field-grid">
                      {IDENTITY_FIELDS.map((item) => (
                        <div className="field orientation-field" key={item.field}>
                          <label htmlFor={`orientation-${item.field}`}>{item.label}</label>
                          {item.options ? (
                            <select
                              id={`orientation-${item.field}`}
                              value={identity[item.field]}
                              onChange={(event) => onUpdateSignupField(item.field, event.target.value)}
                            >
                              <option value="">Select quietly</option>
                              {item.options.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              id={`orientation-${item.field}`}
                              name={item.field}
                              type={item.type ?? 'text'}
                              autoComplete={item.autoComplete}
                              value={identity[item.field]}
                              onChange={(event) => onUpdateSignupField(item.field, event.target.value)}
                            />
                          )}
                          <p>{item.purpose}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {signupProtocol.step === 'intent' && (
                  <div className="orientation-panel" aria-labelledby="orientation-intent-title">
                    <div className="orientation-copy">
                      <h2 id="orientation-intent-title">Intent Framework</h2>
                      <p>Choose ongoing practices. These are ways of returning to study, not targets or obligations.</p>
                    </div>

                    <div className="orientation-choice-grid">
                      {ORIENTATION_PRACTICES.map((practice) => {
                        const isSelected = practices.includes(practice.id);

                        return (
                          <button
                            key={practice.id}
                            className={`orientation-choice ${isSelected ? 'is-selected' : ''}`}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => onToggleOrientationPractice(practice.id)}
                          >
                            <span>{practice.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {signupProtocol.step === 'discipline' && (
                  <div className="orientation-panel" aria-labelledby="orientation-discipline-title">
                    <div className="orientation-copy">
                      <h2 id="orientation-discipline-title">Discipline Taxonomy</h2>
                      <p>Select one or more contexts. They provide language for the workspace; every pathway remains accessible.</p>
                    </div>

                    <div className="orientation-discipline-groups">
                      {ORIENTATION_DISCIPLINE_GROUPS.map((group) => (
                        <section className="orientation-discipline-group" key={group.label} aria-label={group.label}>
                          <h3>{group.label}</h3>
                          <div className="orientation-choice-grid is-compact">
                            {group.disciplines.map((discipline) => {
                              const isSelected = disciplines.includes(discipline.id);

                              return (
                                <button
                                  key={discipline.id}
                                  className={`orientation-choice ${isSelected ? 'is-selected' : ''}`}
                                  type="button"
                                  aria-pressed={isSelected}
                                  onClick={() => onToggleOrientationDiscipline(discipline.id)}
                                >
                                  <span>{discipline.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                )}

                {signupProtocol.step === 'environment' && (
                  <div className="orientation-panel" aria-labelledby="orientation-environment-title">
                    <div className="orientation-copy">
                      <h2 id="orientation-environment-title">Environment Construction</h2>
                      <p>The first view is reduced according to your Orientation. Capability is unchanged, and the workspace can be rearranged later.</p>
                    </div>

                    <div className="orientation-environment-grid">
                      {environment.allComponents.map((component) => {
                        const isSelected = environment.initialVisible.includes(component);

                        return (
                          <button
                            key={component}
                            className={`orientation-choice ${isSelected ? 'is-selected' : ''}`}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => onToggleOrientationWorkspaceComponent(component)}
                          >
                            <span>{component}</span>
                            <small>{isSelected ? 'Visible first' : 'Available later'}</small>
                          </button>
                        );
                      })}
                    </div>

                    <div className="orientation-rationale">
                      {environment.rationale.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </div>
                  </div>
                )}

                {signupProtocol.step === 'confirmation' && (
                  <div className="orientation-panel" aria-labelledby="orientation-confirmation-title">
                    <div className="orientation-copy">
                      <h2 id="orientation-confirmation-title">Confirmation</h2>
                      <p>Your environment has been prepared according to your Orientation. It will continue to evolve through your practice. When you are ready, ACCESS becomes available.</p>
                    </div>

                    <div className="orientation-summary" aria-live="polite">
                      <span>Address: {identity.addressName || identity.preferredName || 'Unrecorded'}</span>
                      <span>School: {identity.schoolStatus || 'Unrecorded'}{identity.schoolName ? ` / ${identity.schoolName}` : ''}</span>
                      <span>Program: {identity.programOfStudy || 'Unrecorded'}</span>
                      <span>Practices: {practices.map(getPracticeLabel).join(' / ') || 'Unselected'}</span>
                      <span>Disciplines: {disciplines.map(getDisciplineLabel).join(' / ') || 'Unselected'}</span>
                      <span>Visible first: {environment.initialVisible.join(' / ') || 'Unselected'}</span>
                    </div>

                    <div className="orientation-rationale">
                      <span>Selected pathways are visible first because they correspond to declared practices and the common archive ground.</span>
                      <span>Nothing is permanent. Orientation prepares the first threshold; it does not close the rest of the Sphere.</span>
                    </div>
                  </div>
                )}

                <div className="signup-protocol-actions">
                  {signupProtocol.step !== 'identity' && (
                    <button
                      className="signup-inline-control"
                      type="button"
                      disabled={isTransitioning}
                      onClick={() => onSetSignupStep(PREVIOUS_ORIENTATION_STEP[signupProtocol.step] ?? 'identity')}
                    >
                      Return
                    </button>
                  )}

                  {signupProtocol.step === 'identity' && (
                    <button
                      className="signup-inline-control"
                      type="button"
                      disabled={isTransitioning || !identityReady}
                      onClick={() => onSetSignupStep('intent')}
                    >
                      Continue
                    </button>
                  )}

                  {signupProtocol.step === 'intent' && (
                    <button
                      className="signup-inline-control"
                      type="button"
                      disabled={isTransitioning || practices.length === 0}
                      onClick={() => onSetSignupStep('discipline')}
                    >
                      Continue
                    </button>
                  )}

                  {signupProtocol.step === 'discipline' && (
                    <button
                      className="signup-inline-control"
                      type="button"
                      disabled={isTransitioning || disciplines.length === 0}
                      onClick={() => onSetSignupStep('environment')}
                    >
                      Prepare Workspace
                    </button>
                  )}

                  {signupProtocol.step === 'environment' && (
                    <button
                      className="signup-inline-control"
                      type="button"
                      disabled={isTransitioning || environment.initialVisible.length === 0}
                      onClick={() => onSetSignupStep('confirmation')}
                    >
                      Review
                    </button>
                  )}

                  {signupProtocol.step === 'confirmation' && (
                    <button
                      className="signup-inline-control is-primary-access"
                      type="button"
                      disabled={isTransitioning || !canAccess}
                      onClick={onAccessAfterOrientation}
                    >
                      ACCESS
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="artifact-meta transition-source source-meta" aria-hidden="true">
          <span>SEL/ARC-00</span>
          <span>STABLE +</span>
          <span>X:031 Y:144</span>
        </div>

        <div className="ascii-field transition-source source-ascii" aria-hidden="true">
          <span>[CAT 01.314]</span>
          <span>SIGNAL QUIET</span>
          <span>LAT 00 / NODE DORMANT</span>
          <span>:: ARCHIVE INDEX</span>
          <span>+ + +</span>
        </div>

        <footer className="module-footer" aria-hidden="true">
          <div>Enter the system</div>
          <div>Discover the sphere</div>
        </footer>

        <div className="discovery" aria-hidden="true">
          <span className="orbital-mark" />
        </div>
      </section>
    </main>
  );
}
