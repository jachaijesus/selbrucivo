import { Lock, Unlock } from 'lucide-react';
import type { SphereVariant } from './SelbrucivoSphere';

type SphereControlsProps = {
  isLocked: boolean;
  variant: SphereVariant;
  onToggleLock: () => void;
  onVariantChange: (variant: SphereVariant) => void;
};

const variants: Array<{ id: SphereVariant; label: string; title: string }> = [
  { id: 'constellation', label: 'A', title: 'Constellation sphere' },
  { id: 'typographic', label: 'B', title: 'Typographic sphere' },
  { id: 'catalog', label: 'C', title: 'Catalog sphere' },
  { id: 'organic', label: 'D', title: 'Organic brutalist catalog sphere' },
];

export function SphereControls({
  isLocked,
  variant,
  onToggleLock,
  onVariantChange,
}: SphereControlsProps) {
  const Icon = isLocked ? Lock : Unlock;

  return (
    <aside className="sphere-controls" aria-label="Sphere controls">
      <div className="variant-switch" aria-label="Sphere visual variants">
        {variants.map((item) => (
          <button
            className={['variant-button', variant === item.id ? 'is-active' : ''].join(' ')}
            type="button"
            key={item.id}
            aria-label={item.title}
            aria-pressed={variant === item.id}
            title={item.title}
            onClick={() => onVariantChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="lock-control">
        <span className="sphere-state">{isLocked ? 'Fixed' : 'Place'}</span>
        <button
          className={['lock-button', isLocked ? 'is-locked' : ''].join(' ')}
          type="button"
          aria-label={isLocked ? 'Unlock sphere position' : 'Fix sphere position'}
          title={isLocked ? 'Unlock position' : 'Fix position'}
          onClick={onToggleLock}
        >
          <Icon aria-hidden size={16} strokeWidth={1.6} />
        </button>
      </div>
    </aside>
  );
}
