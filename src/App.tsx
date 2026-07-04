import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { LoginUI } from './components/LoginUI';
import { SphereUI } from './components/SphereUI';
import { TransitionLayer, type TransitionDirection, type TransitionPhase } from './components/TransitionLayer';
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
            onReturnToThreshold={appState === 'sphere_active' ? beginExitTransition : undefined}
          />
        </div>
      )}

      {showLogin && (
        <LoginUI
          isTransitioning={isTransitioning}
          transitionDirection={transitionDirection}
          onAccess={beginEntryTransition}
        />
      )}

      {isTransitioning && <TransitionLayer direction={transitionDirection} phase={phase} />}

      {appState === 'sphere_active' && (
        <div className="sphere-final-message" aria-live="polite">
          <span>SUPPORT NETWORK ACTIVE</span>
          <span>WELCOME TO SELBRUCIVO</span>
          <span>SELECT A PATHWAY</span>
        </div>
      )}
    </div>
  );
}
