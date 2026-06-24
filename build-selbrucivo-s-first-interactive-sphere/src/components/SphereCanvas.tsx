import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SphereVariant } from './SelbrucivoSphere';

type Position = {
  x: number;
  y: number;
};

type Rotation = {
  x: number;
  y: number;
};

type SphereCanvasProps = {
  isHovered: boolean;
  isInteracting: boolean;
  position: Position;
  rotation: Rotation;
  scale: number;
  variant: SphereVariant;
  velocityRef: React.MutableRefObject<Rotation>;
};

const POINT_COUNT = 6500;
const RADIUS = 2.35;
const TYPOGRAPHIC_TERMS = [
  'field note',
  'index',
  'archive',
  'margin',
  'source',
  'folio',
  'signal',
  'citation',
  'ledger',
  'trace',
  'record',
  'catalog',
  'memo',
  'fragment',
  'appendix',
  'observation',
  'entry',
  'atlas',
];
const CATALOG_CODES = [
  'A-014',
  'F-208',
  'R-031',
  'N-117',
  'K-062',
  'M-440',
  'Q-019',
  'S-204',
  'L-086',
  'T-303',
  'V-052',
  'C-128',
];
const ORGANIC_TERMS = [
  'archive',
  'catalog',
  'field note',
  'index',
  'margin',
  'record',
  'trace',
  'observation',
  'fragment',
  'folio',
  'citation',
  'entry',
  'memory',
  'study',
  'artifact',
  'register',
  'specimen',
  'annotation',
  'casework',
  'finding',
];
const ORGANIC_CODES = [
  'ARC-019',
  'IDX-204',
  'REC-077',
  'FOL-312',
  'OBS-041',
  'CAT-118',
  'MEM-056',
  'CIT-290',
  'TRC-033',
  'ART-166',
  'STU-084',
  'FLD-227',
  'M-014',
  'R-308',
];

function createArchivePoints() {
  const positions = new Float32Array(POINT_COUNT * 3);

  for (let index = 0; index < POINT_COUNT; index += 1) {
    const offset = 2 / POINT_COUNT;
    const y = index * offset - 1 + offset / 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = index * Math.PI * (3 - Math.sqrt(5));
    const shellPoint = Math.random() > 0.38;
    const pointRadius = shellPoint
      ? RADIUS * (0.82 + Math.random() * 0.18)
      : Math.cbrt(Math.random()) * RADIUS * 0.82;

    positions[index * 3] = Math.cos(theta) * radiusAtY * pointRadius;
    positions[index * 3 + 1] = y * pointRadius;
    positions[index * 3 + 2] = Math.sin(theta) * radiusAtY * pointRadius;
  }

  return positions;
}

function createLatitudeRing(y: number, radius: number) {
  const points: THREE.Vector3[] = [];

  for (let index = 0; index <= 144; index += 1) {
    const angle = (index / 144) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
  }

  return points;
}

function spherePoint(index: number, total: number, radius = RADIUS) {
  const offset = 2 / total;
  const y = index * offset - 1 + offset / 2;
  const radiusAtY = Math.sqrt(1 - y * y);
  const theta = index * Math.PI * (3 - Math.sqrt(5));

  return new THREE.Vector3(
    Math.cos(theta) * radiusAtY * radius,
    y * radius,
    Math.sin(theta) * radiusAtY * radius,
  );
}

function createConstellationLines() {
  return Array.from({ length: 42 }, (_, index) => {
    const first = spherePoint(index * 7, 312, RADIUS * 1.015);
    const second = spherePoint(index * 7 + 4, 312, RADIUS * 1.015);
    return [first, second];
  });
}

function createTextTexture(label: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 72;

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = '500 22px ui-serif, Georgia, serif';
    context.fillStyle = 'rgba(28, 54, 45, 0.76)';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createCardTexture(label: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 180;
  canvas.height = 116;

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(246, 242, 234, 0.72)';
    context.strokeStyle = 'rgba(46, 111, 87, 0.48)';
    context.lineWidth = 2;
    context.fillRect(8, 8, 164, 100);
    context.strokeRect(8, 8, 164, 100);
    context.fillStyle = 'rgba(42, 42, 42, 0.58)';
    context.font = '600 18px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillText(label, 24, 42);
    context.fillStyle = 'rgba(46, 111, 87, 0.44)';
    context.fillRect(24, 62, 88, 2);
    context.fillRect(24, 76, 124, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createOrganicTextTexture(label: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 280;
  canvas.height = 76;

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = '600 23px ui-serif, Georgia, serif';
    context.fillStyle = 'rgba(24, 44, 37, 0.88)';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createOrganicSlipTexture(label: string, variantIndex: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 220;
  canvas.height = 142;

  if (context) {
    const skew = (variantIndex % 5) - 2;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((skew * Math.PI) / 180);
    context.translate(-canvas.width / 2, -canvas.height / 2);
    context.fillStyle = variantIndex % 3 === 0 ? 'rgba(244, 239, 228, 0.86)' : 'rgba(238, 234, 224, 0.78)';
    context.strokeStyle = 'rgba(42, 42, 42, 0.38)';
    context.lineWidth = 2;
    context.fillRect(17, 18, 182 + (variantIndex % 4) * 4, 92 + (variantIndex % 3) * 6);
    context.strokeRect(17, 18, 182 + (variantIndex % 4) * 4, 92 + (variantIndex % 3) * 6);
    context.fillStyle = 'rgba(15, 80, 58, 0.76)';
    context.font = '700 18px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillText(label, 34, 52);
    context.fillStyle = 'rgba(42, 42, 42, 0.38)';
    context.fillRect(34, 70, 96 + (variantIndex % 3) * 18, 2);
    context.fillRect(34, 86, 62 + (variantIndex % 5) * 14, 2);
    context.fillRect(34, 102, 118, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function orientationForPosition(position: THREE.Vector3) {
  return new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    position.clone().normalize(),
  );
}

function ConstellationLayer() {
  const lines = useMemo(() => createConstellationLines(), []);

  return (
    <>
      {lines.map((points, index) => (
        <Line
          key={`${points[0].x}-${index}`}
          points={points}
          color="#2e6f57"
          transparent
          opacity={0.13}
          lineWidth={1}
        />
      ))}
    </>
  );
}

function TypographicLayer() {
  const entries = useMemo(
    () =>
      TYPOGRAPHIC_TERMS.map((term, index) => ({
        term,
        position: spherePoint(index * 5 + 2, TYPOGRAPHIC_TERMS.length * 6, RADIUS * 1.04),
        texture: createTextTexture(term),
      })),
    [],
  );

  return (
    <>
      {entries.map((entry) => (
        <sprite key={entry.term} position={entry.position} scale={[0.92, 0.26, 1]}>
          <spriteMaterial
            map={entry.texture}
            transparent
            opacity={0.72}
            depthTest
            depthWrite={false}
          />
        </sprite>
      ))}
    </>
  );
}

function CatalogLayer() {
  const cards = useMemo(
    () =>
      CATALOG_CODES.map((code, index) => {
        const position = spherePoint(index * 6 + 1, CATALOG_CODES.length * 7, RADIUS * 1.03);
        return {
          code,
          position,
          quaternion: orientationForPosition(position),
          texture: createCardTexture(code),
        };
      }),
    [],
  );
  const markers = useMemo(
    () => Array.from({ length: 34 }, (_, index) => spherePoint(index * 4 + 3, 160, RADIUS * 1.08)),
    [],
  );

  return (
    <>
      {cards.map((card) => (
        <mesh key={card.code} position={card.position} quaternion={card.quaternion} scale={[0.56, 0.36, 1]}>
          <planeGeometry args={[1, 0.66]} />
          <meshBasicMaterial
            map={card.texture}
            transparent
            opacity={0.72}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      {markers.map((marker, index) => (
        <mesh key={`${marker.x}-${index}`} position={marker}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshBasicMaterial color="#2e6f57" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function OrganicBrutalistLayer() {
  const groupRef = useRef<THREE.Group>(null);
  const entries = useMemo(() => {
    const textEntries = ORGANIC_TERMS.map((term, index) => {
      const radius = RADIUS * (0.64 + ((index * 13) % 33) / 100);
      const position = spherePoint(index * 8 + 3, ORGANIC_TERMS.length * 10, radius);
      return {
        id: `text-${term}`,
        kind: 'text' as const,
        position,
        quaternion: orientationForPosition(position),
        texture: createOrganicTextTexture(term),
        scale: new THREE.Vector3(0.82 + (index % 4) * 0.08, 0.23, 1),
        rotationZ: ((index % 7) - 3) * 0.055,
        baseOpacity: 0.68 + (index % 4) * 0.04,
      };
    });

    const slipEntries = ORGANIC_CODES.map((code, index) => {
      const surfaceBias = index % 3 === 0 ? 0.94 : 0.68 + (index % 5) * 0.052;
      const position = spherePoint(index * 9 + 6, ORGANIC_CODES.length * 11, RADIUS * surfaceBias);
      return {
        id: `slip-${code}`,
        kind: 'slip' as const,
        position,
        quaternion: orientationForPosition(position),
        texture: createOrganicSlipTexture(code, index),
        scale: new THREE.Vector3(0.58 + (index % 4) * 0.05, 0.38 + (index % 3) * 0.04, 1),
        rotationZ: ((index % 9) - 4) * 0.075,
        baseOpacity: 0.62 + (index % 5) * 0.045,
      };
    });

    return [...textEntries, ...slipEntries];
  }, []);
  const structuralLines = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => [
        spherePoint(index * 7 + 1, 260, RADIUS * (0.72 + (index % 4) * 0.06)),
        spherePoint(index * 7 + 2, 260, RADIUS * (0.72 + (index % 4) * 0.06)),
      ]),
    [],
  );

  useFrame(({ camera }) => {
    if (!groupRef.current) {
      return;
    }

    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);

    groupRef.current.children.forEach((child) => {
      const material = child instanceof THREE.Mesh ? child.material : null;

      if (!material || Array.isArray(material) || !('opacity' in material)) {
        return;
      }

      const worldPosition = new THREE.Vector3();
      child.getWorldPosition(worldPosition);
      const depth = worldPosition.distanceTo(cameraPosition);
      const clarity = THREE.MathUtils.clamp(1 - (depth - 5.8) / 5.4, 0.34, 1);
      material.opacity = (child.userData.baseOpacity ?? 0.52) * clarity;
    });
  });

  return (
    <group ref={groupRef}>
      {structuralLines.map((points, index) => (
        <Line
          key={`organic-line-${index}`}
          points={points}
          color="#2a2a2a"
          transparent
          opacity={0.055}
          lineWidth={1}
        />
      ))}
      {entries.map((entry) => (
        <mesh
          key={entry.id}
          position={entry.position}
          quaternion={entry.quaternion}
          scale={entry.scale}
          rotation-z={entry.rotationZ}
          userData={{ baseOpacity: entry.baseOpacity }}
        >
          <planeGeometry args={[1, entry.kind === 'text' ? 0.28 : 0.66]} />
          <meshBasicMaterial
            map={entry.texture}
            transparent
            opacity={entry.baseOpacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function ArchiveSphere({
  isHovered,
  isInteracting,
  position,
  rotation,
  scale,
  variant,
  velocityRef,
}: SphereCanvasProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pointPositions = useMemo(() => createArchivePoints(), []);
  const pointGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
    return geometry;
  }, [pointPositions]);
  const pointMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        uniforms: {
          color: { value: new THREE.Color('#0f6b4f') },
          hoverBoost: { value: 0 },
        },
        vertexShader: `
          varying float vDepth;

          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vDepth = 1.0 - smoothstep(3.0, 9.5, -mvPosition.z);
            gl_PointSize = mix(1.4, 4.0, vDepth);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float hoverBoost;
          varying float vDepth;

          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float falloff = 1.0 - smoothstep(0.18, 0.5, length(center));
            float alpha = mix(0.12, 0.74, vDepth) + hoverBoost;
            gl_FragColor = vec4(color, alpha * falloff);
          }
        `,
      }),
    [],
  );
  const northernRing = useMemo(() => createLatitudeRing(1.48, 1.82), []);
  const southernRing = useMemo(() => createLatitudeRing(-1.48, 1.82), []);

  useFrame((_, delta) => {
    if (!groupRef.current) {
      return;
    }

    // Inertia logic: drag velocity eases down after release, while idle rotation keeps the archive alive.
    velocityRef.current.x *= 0.935;
    velocityRef.current.y *= 0.935;
    const idle = isInteracting ? 0 : delta * 0.045;

    groupRef.current.rotation.x += (rotation.x - groupRef.current.rotation.x) * 0.055;
    groupRef.current.rotation.y += (rotation.y - groupRef.current.rotation.y) * 0.055 + idle;
    groupRef.current.rotation.x += velocityRef.current.x * 0.28;
    groupRef.current.rotation.y += velocityRef.current.y * 0.28;
    groupRef.current.position.x += (position.x / 120 - groupRef.current.position.x) * 0.08;
    groupRef.current.position.y += (-position.y / 120 - groupRef.current.position.y) * 0.08;
    groupRef.current.scale.setScalar(scale * 1.18 + Math.sin(performance.now() * 0.0008) * 0.01);
    pointMaterial.uniforms.hoverBoost.value += ((isHovered ? 0.08 : 0) - pointMaterial.uniforms.hoverBoost.value) * 0.08;
  });

  return (
    <group ref={groupRef}>
      <points geometry={pointGeometry} material={pointMaterial} frustumCulled={false} />
      {variant === 'constellation' ? <ConstellationLayer /> : null}
      {variant === 'typographic' ? <TypographicLayer /> : null}
      {variant === 'catalog' ? <CatalogLayer /> : null}
      {variant === 'organic' ? <OrganicBrutalistLayer /> : null}

      <Line
        points={northernRing}
        color="#2e6f57"
        transparent
        opacity={0.34}
        lineWidth={1}
      />
      <Line
        points={southernRing}
        color="#2e6f57"
        transparent
        opacity={0.28}
        lineWidth={1}
      />
    </group>
  );
}

export function SphereCanvas(props: SphereCanvasProps) {
  return (
    <Canvas
      className="sphere-canvas"
      camera={{ position: [0, 0, 8.9], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      <ambientLight intensity={0.54} />
      <pointLight position={[3, 2, 4]} intensity={0.75} color="#f6f2ea" />
      <ArchiveSphere {...props} />
    </Canvas>
  );
}
