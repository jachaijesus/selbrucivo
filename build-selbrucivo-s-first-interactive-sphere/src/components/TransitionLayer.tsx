import type { CSSProperties } from 'react';
import './TransitionLayer.css';

export type TransitionPhase =
  | 'idle'
  | 'access-pressed'
  | 'signal-received'
  | 'archive-link'
  | 'login-deconstruct'
  | 'network-activates'
  | 'sphere-resolving'
  | 'sphere-interactive'
  | 'complete';

export type TransitionDirection = 'enter' | 'exit';

type TransitionLayerProps = {
  direction: TransitionDirection;
  phase: TransitionPhase;
};

const phaseMessages: Record<TransitionDirection, Record<TransitionPhase, string>> = {
  enter: {
    idle: 'NODE DORMANT',
    'access-pressed': 'ACCESS PRESSED',
    'signal-received': 'SIGNAL RECEIVED',
    'archive-link': 'ARCHIVE LINK ESTABLISHING',
    'login-deconstruct': 'LOGIN INDEX RELEASING',
    'network-activates': 'ENVIRONMENTAL NETWORK ACTIVE',
    'sphere-resolving': 'SPHERE RESOLVING FROM ORIGIN',
    'sphere-interactive': 'SUPPORT NETWORK ACTIVE',
    complete: 'SUPPORT NETWORK ACTIVE',
  },
  exit: {
    idle: 'SUPPORT NETWORK ACTIVE',
    'access-pressed': 'RETURN REQUESTED',
    'signal-received': 'SIGNAL RELEASED',
    'archive-link': 'ARCHIVE LINK CLOSING',
    'login-deconstruct': 'THRESHOLD RECONSTRUCTING',
    'network-activates': 'SUPPORT NODES DISCONNECTING',
    'sphere-resolving': 'SPHERE RETURNING TO SIGNAL',
    'sphere-interactive': 'RETURN TO THRESHOLD',
    complete: 'THRESHOLD AVAILABLE',
  },
};

const fragments = [
  '[SEL]', 'ARC', '00', 'LAT', 'NODE', '::', '+', 'SIGNAL', '031', '144', 'SELF', 'INDEX',
  'AID', 'MEM', 'REF', 'ALT', 'SYS', 'OBS', 'RX', 'MAP', 'COM', 'TRACE', 'FOLIO', 'ENTRY',
  'STABLE', 'QUIET', 'PATH', 'LINK', 'SUPPORT', 'FIELD', 'CAT', '01.314',
];

function fragmentStyle(index: number): CSSProperties {
  const angle = (index / fragments.length) * Math.PI * 2;
  const ring = index % 4;
  const radiusX = 34 + ring * 9;
  const radiusY = 27 + ring * 7;
  const x = 50 + Math.cos(angle) * radiusX + Math.sin(index * 1.9) * 4;
  const y = 50 + Math.sin(angle) * radiusY + Math.cos(index * 1.3) * 5;
  const delay = 2.2 + (index % 11) * 0.13 + Math.floor(index / 11) * 0.28;

  return {
    '--fragment-x': `${x.toFixed(2)}vw`,
    '--fragment-y': `${y.toFixed(2)}vh`,
    '--fragment-delay': `${delay.toFixed(2)}s`,
    '--fragment-drift-x': `${(50 - x).toFixed(2)}vw`,
    '--fragment-drift-y': `${(50 - y).toFixed(2)}vh`,
  } as CSSProperties;
}

export function TransitionLayer({ direction, phase }: TransitionLayerProps) {
  return (
    <div className={`transition-layer direction-${direction} transition-phase-${phase}`} aria-live="polite">
      <div className="transition-field" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="signal-origin" aria-hidden="true">
        <span className="origin-glow" />
        <span className="origin-ring ring-outer" />
        <span className="origin-ring ring-middle" />
        <span className="origin-ring ring-inner" />
        <span className="origin-node node-a" />
        <span className="origin-node node-b" />
        <span className="origin-node node-c" />
        <span className="origin-node node-d" />
      </div>

      <div className="fragment-field" aria-hidden="true">
        {fragments.map((fragment, index) => (
          <span
            className="transition-fragment"
            key={`${fragment}-${index}`}
            style={fragmentStyle(index)}
          >
            {fragment}
          </span>
        ))}
      </div>

      <div className="transition-status">
        <span className="status-kicker">
          SELBRUCIVO / {direction === 'enter' ? 'ACCESS-SEQUENCE' : 'RELEASE-SEQUENCE'}
        </span>
        <span className="status-message">{phaseMessages[direction][phase]}</span>
      </div>

      <div className="final-message" aria-hidden={phase !== 'sphere-interactive' && phase !== 'complete'}>
        {direction === 'enter' ? (
          <>
            <span>SUPPORT NETWORK ACTIVE</span>
            <span>WELCOME TO SELBRUCIVO</span>
            <span>SELECT A PATHWAY</span>
          </>
        ) : (
          <>
            <span>SUPPORT NETWORK RELEASED</span>
            <span>RETURNING TO THRESHOLD</span>
            <span>ARCHIVE CLOSED</span>
          </>
        )}
      </div>
    </div>
  );
}
