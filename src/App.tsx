import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { LoginUI } from './components/LoginUI';
import { SphereUI } from './components/SphereUI';
import { TransitionLayer, type TransitionDirection, type TransitionPhase } from './components/TransitionLayer';
import {
  canAccessAfterOrientation,
  createInitialSignupProtocolState,
  createInvestorDemoSignupProtocolState,
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
type AppRoute = 'threshold' | 'demo';

const ENABLE_LOCAL_ACCESS_BYPASS = (
  import.meta.env.DEV &&
  window.localStorage.getItem('selbrucivo.localAccessBypass') === 'true'
);

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

function getRouteFromLocation(): AppRoute {
  return window.location.pathname === '/demo' ? 'demo' : 'threshold';
}

function getRoutePath(route: AppRoute) {
  return route === 'demo' ? '/demo' : '/';
}

function InvestorDemoEntry({
  onEnterDemo,
  onReturnToThreshold,
}: {
  onEnterDemo: () => void;
  onReturnToThreshold: () => void;
}) {
  return (
    <section className="demo-entry" aria-labelledby="investor-demo-title">
      <div className="demo-entry-panel">
        <p className="demo-entry-kicker">public preview route</p>
        <h1 id="investor-demo-title">Investor Demonstration</h1>
        <p>
          This public demonstration uses a fictional, non-sensitive profile to provide direct access
          to the current Selbrucivo interface. It is a convenience preview&mdash;not a private account,
          authenticated session, or completed product.
        </p>
        <div className="demo-entry-actions">
          <button className="demo-entry-primary" type="button" onClick={onEnterDemo}>
            Enter Demo
          </button>
          <button className="demo-entry-secondary" type="button" onClick={onReturnToThreshold}>
            Return to Threshold
          </button>
        </div>
      </div>
    </section>
  );
}

export function App() {
  const [appState, setAppState] = useState<AppState>('login');
  const [phase, setPhase] = useState<TransitionPhase>('idle');
  const [signupProtocol, setSignupProtocol] = useState(createInitialSignupProtocolState);
  const [route, setRoute] = useState<AppRoute>(getRouteFromLocation);
  const [isDemoSession, setIsDemoSession] = useState(false);

  const isEntering = appState === 'entering';
  const isExiting = appState === 'exiting';
  const isTransitioning = isEntering || isExiting;
  const transitionDirection: TransitionDirection = isExiting ? 'exit' : 'enter';
  const phaseSchedule = isExiting ? EXIT_PHASE_SCHEDULE : ENTER_PHASE_SCHEDULE;
  const showSphere = appState !== 'login';
  const showDemoEntry = route === 'demo' && appState === 'login' && !isDemoSession;
  const showLogin = !showDemoEntry && (appState !== 'sphere_active' || isExiting);

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
        setIsDemoSession(false);
        setSignupProtocol(createInitialSignupProtocolState());
      }
    }, TRANSITION_END_MS[transitionDirection]);

    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(finishTimer);
    };
  }, [isExiting, isTransitioning, phaseSchedule, transitionDirection]);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = getRouteFromLocation();

      setRoute(nextRoute);
      setIsDemoSession(false);
      setAppState('login');
      setPhase('idle');
      setSignupProtocol(createInitialSignupProtocolState());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToRoute = (nextRoute: AppRoute) => {
    setRoute(nextRoute);
    const nextPath = getRoutePath(nextRoute);

    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
  };

  const beginEntryTransition = () => {
    if (appState !== 'login') {
      return;
    }

    setAppState('entering');
    setPhase('access-pressed');
  };

  const beginInvestorDemo = () => {
    if (appState !== 'login') {
      return;
    }

    setSignupProtocol(createInvestorDemoSignupProtocolState());
    setIsDemoSession(true);
    beginEntryTransition();
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

  const resetInvestorDemo = () => {
    navigateToRoute('demo');
    setIsDemoSession(false);
    setAppState('login');
    setPhase('idle');
    setSignupProtocol(createInitialSignupProtocolState());
  };

  const returnToThreshold = () => {
    navigateToRoute('threshold');
    setIsDemoSession(false);

    if (appState === 'sphere_active') {
      beginExitTransition();
      return;
    }

    setAppState('login');
    setPhase('idle');
    setSignupProtocol(createInitialSignupProtocolState());
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
            isDemoMode={isDemoSession}
            orientationIdentity={signupProtocol.profile.identity}
            onResetDemo={isDemoSession && appState === 'sphere_active' ? resetInvestorDemo : undefined}
            onReturnToThreshold={appState === 'sphere_active' ? (isDemoSession ? returnToThreshold : beginExitTransition) : undefined}
          />
        </div>
      )}

      {showDemoEntry && (
        <InvestorDemoEntry
          onEnterDemo={beginInvestorDemo}
          onReturnToThreshold={returnToThreshold}
        />
      )}

      {showLogin && (
        <LoginUI
          isTransitioning={isTransitioning}
          isLocalAccessBypassEnabled={ENABLE_LOCAL_ACCESS_BYPASS}
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
