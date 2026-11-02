// El "planeta": mar, aura de atmósfera, el destello inicial y las estrellas.
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending, BufferGeometry, CylinderGeometry, Float32BufferAttribute, MeshBasicMaterial, MeshStandardMaterial,
  PlaneGeometry, PointsMaterial, RingGeometry, SpriteMaterial, type Group, type Mesh, type Points, type Sprite,
} from 'three';
import { useClock } from './clock';
import { SEA_R } from './coords';
import { auraTexture, dotTexture, glowTexture } from './textures';
import { SEQ, ease, lerp, progress } from './timeline';

// ---------- Mar ----------

const SEA_DEPTH = 0.55;
const SEA_GEO = new CylinderGeometry(SEA_R, SEA_R * 0.96, SEA_DEPTH, 72).translate(0, -SEA_DEPTH / 2, 0);
const SEA_SIDE = new MeshStandardMaterial({ color: '#15364e', roughness: 0.5 });
const SEA_TOP = new MeshStandardMaterial({ color: '#2b6c93', roughness: 0.28, metalness: 0.15, emissive: '#0d2a40', emissiveIntensity: 0.6 });
const SEA_MATS = [SEA_SIDE, SEA_TOP, SEA_SIDE];
const FOAM_GEO = new RingGeometry(SEA_R - 0.22, SEA_R, 72).rotateX(-Math.PI / 2);
const FOAM = new MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.22, depthWrite: false });

export function Sea({ shadows }: { shadows: boolean }) {
  const clock = useClock();
  const ref = useRef<Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const p = progress(clock.current.t, SEQ.sea);
    g.visible = p > 0;
    g.scale.setScalar(Math.max(0.001, ease.outBack(p)));
  });
  return (
    <group ref={ref} visible={false}>
      <mesh geometry={SEA_GEO} material={SEA_MATS} receiveShadow={shadows} />
      <mesh geometry={FOAM_GEO} material={FOAM} position={[0, 0.003, 0]} />
    </group>
  );
}

// ---------- Aura (la atmósfera alrededor del mar) ----------

const AURA_SIZE = SEA_R * 1.75;
const AURA_GEO = new PlaneGeometry(AURA_SIZE * 2, AURA_SIZE * 2).rotateX(-Math.PI / 2);

export function Aura() {
  const clock = useClock();
  const ref = useRef<Mesh>(null);
  const material = useMemo(
    () => new MeshBasicMaterial({ map: auraTexture(SEA_R / AURA_SIZE), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock: real }) => {
    const m = ref.current;
    if (!m) return;
    const p = ease.outCubic(progress(clock.current.t, SEQ.sea));
    m.visible = p > 0;
    m.scale.setScalar(lerp(0.6, 1, p));
    material.opacity = p * (0.8 + 0.12 * Math.sin(real.elapsedTime * 0.8));
  });
  return <mesh ref={ref} geometry={AURA_GEO} material={material} position={[0, -0.3, 0]} visible={false} />;
}

// ---------- Destello inicial: un punto de luz que crece ----------

export function Burst() {
  const clock = useClock();
  const ref = useRef<Sprite>(null);
  const material = useMemo(
    () => new SpriteMaterial({ map: glowTexture(), color: '#fff1d6', transparent: true, blending: AdditiveBlending, depthWrite: false, depthTest: false }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    const s = ref.current;
    if (!s) return;
    const t = clock.current.t;
    const grow = ease.outCubic(progress(t, { start: SEQ.light.start, dur: SEQ.light.dur * 0.6 }));
    // Se apaga mientras el mar ya está creciendo, para que no quede ningún momento vacío.
    const fade = 1 - ease.inOutCubic(progress(t, { start: SEQ.light.start + SEQ.light.dur * 0.7, dur: SEQ.light.dur * 0.6 }));
    s.visible = fade > 0;
    s.scale.setScalar(lerp(0.5, 18, grow));
    material.opacity = fade;
  });
  return <sprite ref={ref} material={material} position={[0, 0.5, 0]} renderOrder={10} />;
}

// ---------- Estrellas (con profundidad: se mueven distinto que el fondo al acercarse la cámara) ----------

function starGeometry(count: number, seed: number) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const pos: number[] = [];
  const col: number[] = [];
  const palette = [
    [1, 0.96, 0.88],
    [0.85, 0.9, 1],
    [1, 0.85, 0.7],
  ];
  for (let i = 0; i < count; i++) {
    // Repartidas en una cáscara alrededor de la escena.
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const r = 140 + rand() * 120;
    const k = Math.sqrt(1 - u * u);
    pos.push(r * k * Math.cos(th), r * u, r * k * Math.sin(th));
    const c = palette[Math.floor(rand() * palette.length)];
    const b = 0.55 + rand() * 0.45;
    col.push(c[0] * b, c[1] * b, c[2] * b);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  return g;
}

export function Stars({ count }: { count: number }) {
  const ref = useRef<Points>(null);
  const big = useRef<Points>(null);
  const [small, large] = useMemo(() => [starGeometry(count, 7), starGeometry(Math.round(count / 8), 99)], [count]);
  const [smallMat, largeMat] = useMemo(() => {
    const make = (size: number) =>
      new PointsMaterial({ size, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true });
    return [make(1.1), make(2.2)];
  }, []);
  useEffect(
    () => () => {
      small.dispose();
      large.dispose();
    },
    [small, large],
  );
  useEffect(
    () => () => {
      smallMat.dispose();
      largeMat.dispose();
    },
    [smallMat, largeMat],
  );
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.006;
    if (big.current) big.current.rotation.y += dt * 0.004;
  });
  return (
    <>
      <points ref={ref} geometry={small} material={smallMat} />
      <points ref={big} geometry={large} material={largeMat} />
    </>
  );
}
