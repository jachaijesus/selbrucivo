import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { SphereCanvas } from './SphereCanvas';
import { SphereControls } from './SphereControls';

const MIN_SCALE = 0.58;
const MAX_SCALE = 1.72;

type Position = {
  x: number;
  y: number;
};

type Rotation = {
  x: number;
  y: number;
};

export type SphereVariant = 'constellation' | 'typographic' | 'catalog' | 'organic';

export function SelbrucivoSphere() {
  const [isLocked, setIsLocked] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [variant, setVariant] = useState<SphereVariant>('constellation');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<Rotation>({ x: -0.22, y: 0.28 });
  const velocityRef = useRef<Rotation>({ x: 0, y: 0 });
  const dragRef = useRef({
    pointerId: -1,
    mode: 'none' as 'none' | 'move' | 'rotate',
    lastX: 0,
    lastY: 0,
  });

  const clampScale = useCallback((nextScale: number) => {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
  }, []);

  const updateScale = useCallback(
    (delta: number) => {
      setScale((currentScale) => clampScale(currentScale + delta));
    },
    [clampScale],
  );

  const backgroundSaturation = useMemo(() => {
    const rotationEnergy = Math.abs(Math.sin(rotation.x * 0.55)) + Math.abs(Math.cos(rotation.y * 0.38));
    return 12 + rotationEnergy * 5;
  }, [rotation.x, rotation.y]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;

      if (target.closest('button')) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      setIsMoving(true);
      dragRef.current = {
        pointerId: event.pointerId,
        mode: !isLocked && !event.altKey ? 'move' : 'rotate',
        lastX: event.clientX,
        lastY: event.clientY,
      };
    },
    [isLocked],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;

      if (drag.pointerId !== event.pointerId || drag.mode === 'none') {
        return;
      }

      const deltaX = event.clientX - drag.lastX;
      const deltaY = event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;

      // Fixed-position logic: unlocking turns drag into desktop placement; locking returns drag to inspection rotation.
      if (drag.mode === 'move' && !isLocked) {
        setPosition((current) => ({
          x: current.x + deltaX,
          y: current.y + deltaY,
        }));
        return;
      }

      // Rotation logic: pointer deltas are translated into slow orbital motion on both axes.
      const nextVelocity = {
        x: deltaY * 0.004,
        y: deltaX * 0.004,
      };
      velocityRef.current = nextVelocity;
      setRotation((current) => ({
        x: current.x + nextVelocity.x,
        y: current.y + nextVelocity.y,
      }));
    },
    [isLocked],
  );

  const endPointerGesture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId === event.pointerId) {
      dragRef.current.mode = 'none';
      dragRef.current.pointerId = -1;
      setIsMoving(false);
    }
  }, []);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();

      // Zoom logic: trackpad scroll and mouse wheel share a restrained scale range.
      updateScale(-event.deltaY * 0.0014);
    },
    [updateScale],
  );

  useEffect(() => {
    const handleGesture = (event: Event) => {
      const gesture = event as Event & { scale?: number };
      const nextScale = gesture.scale ?? 1;

      event.preventDefault();
      setScale((currentScale) => clampScale(currentScale * (1 + (nextScale - 1) * 0.085)));
    };

    window.addEventListener('gesturechange', handleGesture, { passive: false });

    return () => {
      window.removeEventListener('gesturechange', handleGesture);
    };
  }, [clampScale]);

  return (
    <main
      className="selbrucivo-shell"
      style={{ '--bg-saturation': `${backgroundSaturation.toFixed(2)}%` } as CSSProperties}
      aria-label="Selbrucivo ambient archive sphere prototype"
    >
      <section
        className={[
          'sphere-desktop',
          isMoving ? 'is-moving' : '',
          isLocked ? 'is-locked' : '',
        ].join(' ')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerGesture}
        onPointerCancel={endPointerGesture}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        onWheel={handleWheel}
      >
        <SphereCanvas
          isHovered={isHovered}
          isInteracting={isMoving}
          position={position}
          rotation={rotation}
          scale={scale}
          variant={variant}
          velocityRef={velocityRef}
        />
      </section>

      <SphereControls
        isLocked={isLocked}
        variant={variant}
        onToggleLock={() => setIsLocked((locked) => !locked)}
        onVariantChange={setVariant}
      />
    </main>
  );
}
