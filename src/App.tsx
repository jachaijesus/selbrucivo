import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { LoginUI } from './components/LoginUI';
import { SphereUI } from './components/SphereUI';
import { TransitionLayer, type TransitionDirection, type TransitionPhase } from './components/TransitionLayer';
import {
  canAccessAfterOrientation,
  createInitialSignupProtocolState,
  getSignupProtocolStatus,
  prepareOrientationEnvironment,
  type OrientationDisciplineId,
  type OrientationPracticeId,
  type OrientationWorkspaceComponent,
  type SignupProtocolField,
  type SignupProtocolStep,
} from './domain/signupProtocol';
import './App.css';

type AppState = 'login' | 'entering' | 'sphere_active' | 'exiting';

const ENTER_PHASE_SCHEDULE: Array<{ phase: TransitionPhase; at: number }> = [
  { phase: 'access-pressed', at: 0 },
  { phase: 'signal-received', at: 900 },
  { phase: 'archive-link', at: 2100 },
  { phase: 'login-deconstruct', at: 3300 },
  { phase: 'network-activates', at: 5000 },
  { phase: 'sphere-resolving', at: 6500 },
  { phase: 'sphere-interactive', at: 9000 },
  { phase: 'complete', at: 10400 },
];

const EXIT_PHASE_SCHEDULE: Array<{ phase: TransitionPhase; at: number }> = [
  { phase: 'sphere-interactive', at: 0 },
  { phase: 'sphere-resolving', at: 1200 },
  { phase: 'network-activates', at: 2600 },
  { phase: 'login-deconstruct', at: 4300 },
  { phase: 'archive-link', at: 5900 },
  { phase: 'signal-received', at: 7400 },
  { phase: 'complete', at: 9200 },
];

const TRANSITION_END_MS: Record<TransitionDirection, number> = {
  enter: 11400,
  exit: 10200,
};

export function App() {
  const [appState, setAppState] = useState<AppState>('login');
  const [phase, setPhase] = useState<TransitionPhase>('idle');
  const [signupProtocol, setSignupProtocol] = useState(createInitialSignupProtocolState);

  const isEntering = appState === 'entering';
  const isExiting = appState === 'exiting';
  const isTransitioning = isEntering || isExiting;
  const transitionDirection: TransitionDirection = isExiting ? 'exit' : 'enter';
  const phaseSchedule = isExiting ? EXIT_PHASE_SCHEDULE : ENTER_PHASE_SCHEDULE;
  const showSphere = appState !== 'login';
  const showLogin = appState !== 'sphere_active' || isExiting;

  const phaseIndex = useMemo(
    () => phaseSchedule.findIndex((item) => item.phase === phase),
    [phase, phaseSchedule],
  );

  useEffect(() => {
    if (!isTransitioning) {
      return undefined;
    }

    const timers = phaseSchedule.map(({ phase: nextPhase, at }) => (
      window.setTimeout(() => setPhase(nextPhase), at)
    ));

    const finishTimer = window.setTimeout(() => {
      setAppState(isExiting ? 'login' : 'sphere_active');
      setPhase('complete');
      if (isExiting) {
        setSignupProtocol(createInitialSignupProtocolState());
      }
    }, TRANSITION_END_MS[transitionDirection]);

    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(finishTimer);
    };
  }, [isExiting, isTransitioning, phaseSchedule, transitionDirection]);

  const beginEntryTransition = () => {
    if (appState !== 'login') {
      return;
    }

    setAppState('entering');
    setPhase('access-pressed');
  };

  const setSignupStep = (step: SignupProtocolStep) => {
    setSignupProtocol((current) => ({
      ...current,
      step,
      status: getSignupProtocolStatus({ ...current, step }),
    }));
  };

  const updateSignupField = (field: SignupProtocolField, value: string) => {
    setSignupProtocol((current) => {
      const identity = {
        ...current.profile.identity,
        [field]: value,
      };
      const next = {
        ...current,
        profile: {
          ...current.profile,
          identity,
          environment: prepareOrientationEnvironment({
            identity,
            practices: current.profile.practices,
            disciplines: current.profile.disciplines,
          }),
        },
      };

      return {
        ...next,
        status: getSignupProtocolStatus(next),
      };
    });
  };

  const toggleOrientationPractice = (practice: OrientationPracticeId) => {
    setSignupProtocol((current) => {
      const hasPractice = current.profile.practices.includes(practice);
      const practices = hasPractice
        ? current.profile.practices.filter((item) => item !== practice)
        : [...current.profile.practices, practice];
      const next = {
        ...current,
        profile: {
          ...current.profile,
          practices,
          environment: prepareOrientationEnvironment({
            identity: current.profile.identity,
            practices,
            disciplines: current.profile.disciplines,
          }),
        },
      };

      return {
        ...next,
        status: getSignupProtocolStatus(next),
      };
    });
  };

  const toggleOrientationDiscipline = (discipline: OrientationDisciplineId) => {
    setSignupProtocol((current) => {
      const hasDiscipline = current.profile.disciplines.includes(discipline);
      const disciplines = hasDiscipline
        ? current.profile.disciplines.filter((item) => item !== discipline)
        : [...current.profile.disciplines, discipline];
      const next = {
        ...current,
        profile: {
          ...current.profile,
          disciplines,
          environment: prepareOrientationEnvironment({
            identity: current.profile.identity,
            practices: current.profile.practices,
            disciplines,
          }),
        },
      };

      return {
        ...next,
        status: getSignupProtocolStatus(next),
      };
    });
  };

  const toggleOrientationWorkspaceComponent = (component: OrientationWorkspaceComponent) => {
    setSignupProtocol((current) => {
      const hasComponent = current.profile.environment.initialVisible.includes(component);
      const initialVisible = hasComponent
        ? current.profile.environment.initialVisible.filter((item) => item !== component)
        : [...current.profile.environment.initialVisible, component];
      const next = {
        ...current,
        profile: {
          ...current.profile,
          environment: {
            ...current.profile.environment,
            initialVisible,
          },
        },
      };

      return {
        ...next,
        status: getSignupProtocolStatus(next),
      };
    });
  };

  const accessAfterOrientation = () => {
    if (!canAccessAfterOrientation(signupProtocol)) {
      return;
    }

    beginEntryTransition();
  };

  const beginExitTransition = () => {
    if (appState !== 'sphere_active') {
      return;
    }

    setAppState('exiting');
    setPhase('sphere-interactive');
  };

  return (
    <div
      className={[
        'selbrucivo-app',
        showSphere ? 'has-sphere' : '',
        isTransitioning ? `is-transitioning is-${transitionDirection}ing phase-${phase}` : '',
      ].join(' ')}
      style={{ '--phase-index': phaseIndex } as CSSProperties}
    >
      {showSphere && (
        <div
          className={[
            'sphere-reveal-stage',
            isEntering ? 'is-revealing' : '',
            isExiting ? 'is-releasing' : '',
            appState === 'sphere_active' ? 'is-ready' : '',
          ].join(' ')}
          aria-hidden={appState !== 'sphere_active'}
        >
          <SphereUI
            isInteractionDisabled={isTransitioning}
            orientationIdentity={signupProtocol.profile.identity}
            onReturnToThreshold={appState === 'sphere_active' ? beginExitTransition : undefined}
          />
        </div>
      )}

      {showLogin && (
        <LoginUI
          isTransitioning={isTransitioning}
          signupProtocol={signupProtocol}
          transitionDirection={transitionDirection}
          onAccess={beginEntryTransition}
          onAccessAfterOrientation={accessAfterOrientation}
          onSetSignupStep={setSignupStep}
          onToggleOrientationDiscipline={toggleOrientationDiscipline}
          onToggleOrientationPractice={toggleOrientationPractice}
          onToggleOrientationWorkspaceComponent={toggleOrientationWorkspaceComponent}
          onUpdateSignupField={updateSignupField}
        />
      )}

      {isTransitioning && <TransitionLayer direction={transitionDirection} phase={phase} />}

    </div>
  );
}
