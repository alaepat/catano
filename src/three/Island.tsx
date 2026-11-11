// La isla: hexágonos con relieve y decoración, fichas de número y cruces resaltados.
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending, BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, IcosahedronGeometry,
  MeshStandardMaterial, MeshBasicMaterial, PlaneGeometry, RingGeometry, Shape, SphereGeometry, type Group, type Mesh,
} from 'three';
import { isRed, type Board, type Terrain } from '../game';
import { useClock } from './clock';
import { BASE_H, BEVEL, TERRAIN_COLOR, TILE_H, TILE_R, TOP, hexWorld, jitter, useGeo, vertexWorld } from './coords';
import type { NumberStyle } from '../lib/numberStyle';
import { glowTexture, tokenTexture } from './textures';
import { ease, hexWindow, landingFlash, lerp, progress, tokenWindow } from './timeline';

function hexShape(r: number) {
  const s = new Shape();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i + 30);
    if (i === 0) s.moveTo(r * Math.cos(a), r * Math.sin(a));
    else s.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  s.closePath();
  return s;
}

// Geometrías compartidas (se crean una vez).
const TILE_GEO = new ExtrudeGeometry(hexShape(TILE_R - BEVEL), {
  depth: TILE_H, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 2, steps: 1,
}).rotateX(-Math.PI / 2);
const BASE_GEO = new ExtrudeGeometry(hexShape(1), { depth: BASE_H, bevelEnabled: false }).rotateX(-Math.PI / 2);
const SAND = new MeshStandardMaterial({ color: '#d9c08f', roughness: 0.95 });

// ---------- Decoración low-poly ----------

const mat = (color: string, extra: Partial<MeshStandardMaterial> = {}) =>
  Object.assign(new MeshStandardMaterial({ color, roughness: 0.8, flatShading: true }), extra);

const M = {
  tree: mat('#24502d'),
  tree2: mat('#356b3a'),
  trunk: mat('#6b4a2b'),
  wool: mat('#f4efe6'),
  face: mat('#3a332d'),
  bush: mat('#6fa548'),
  wheat: mat('#d6a536'),
  wheat2: mat('#e9c25a'),
  brick: mat('#a5472a'),
  brick2: mat('#c25c36'),
  rock: mat('#767a82'),
  rock2: mat('#8e9299'),
  snow: mat('#f5f3ee'),
  dune: mat('#e4cf9f'),
  cactus: mat('#5d8c4b'),
  gold: (() => {
    const m = mat('#f2c230', { metalness: 0.75, roughness: 0.28 });
    m.emissive.set('#5a3d00');
    return m;
  })(),
  goldRock: mat('#8a6a3c'),
  river: mat('#4aa3c9', { roughness: 0.2 }),
  fog: mat('#ffffff', { roughness: 1, flatShading: false, transparent: true, opacity: 0.85 }),
};

const G = {
  cone: new ConeGeometry(0.13, 0.32, 6),
  trunk: new CylinderGeometry(0.03, 0.035, 0.09, 5),
  wool: new IcosahedronGeometry(0.085, 0),
  head: new BoxGeometry(0.06, 0.06, 0.06),
  bush: new IcosahedronGeometry(0.06, 0),
  sheaf: new ConeGeometry(0.055, 0.24, 6),
  brick: new BoxGeometry(0.15, 0.065, 0.075),
  peak: new ConeGeometry(0.24, 0.48, 5),
  cap: new ConeGeometry(0.088, 0.172, 5),
  dune: new SphereGeometry(0.28, 10, 6),
  cactus: new CylinderGeometry(0.035, 0.04, 0.22, 6),
  arm: new CylinderGeometry(0.022, 0.022, 0.09, 5),
};

/** Posición en un anillo alrededor del centro del hexágono (grados, radio). */
const at = (deg: number, r: number, y = 0): [number, number, number] => {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a) * r, y, Math.sin(a) * r];
};

function Decor({ terrain, id, shadows }: { terrain: Terrain; id: number; shadows: boolean }) {
  const j = (k: number) => jitter(id, k);
  const cast = shadows;
  const base = j(0) * 60; // cada hexágono gira un poco su decoración

  switch (terrain) {
    case 'bosque':
      return (
        <group>
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <group key={i} position={at(base + deg + j(i) * 20, i % 2 ? 0.62 : 0.56)} scale={0.8 + j(i + 7) * 0.35}>
              <mesh geometry={G.trunk} material={M.trunk} position={[0, 0.045, 0]} castShadow={cast} />
              <mesh geometry={G.cone} material={i % 2 ? M.tree : M.tree2} position={[0, 0.24, 0]} castShadow={cast} />
            </group>
          ))}
        </group>
      );
    case 'pasto':
      return (
        <group>
          {[30, 150, 270].map((deg, i) => (
            <group key={i} position={at(base + deg, 0.58)} rotation={[0, j(i) * Math.PI * 2, 0]}>
              <mesh geometry={G.wool} material={M.wool} position={[0, 0.09, 0]} scale={[1.35, 1, 1]} castShadow={cast} />
              <mesh geometry={G.head} material={M.face} position={[0.12, 0.12, 0]} castShadow={cast} />
            </group>
          ))}
          {[90, 210, 330].map((deg, i) => (
            <mesh key={i} geometry={G.bush} material={M.bush} position={at(base + deg, 0.6)} scale={0.8 + j(i + 3) * 0.5} castShadow={cast} />
          ))}
        </group>
      );
    case 'cereal':
      return (
        <group>
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <mesh
              key={i}
              geometry={G.sheaf}
              material={i % 2 ? M.wheat : M.wheat2}
              position={at(base + deg + 30, 0.6, 0.12)}
              scale={0.85 + j(i) * 0.3}
              castShadow={cast}
            />
          ))}
        </group>
      );
    case 'colinas':
      return (
        <group>
          {[30, 150, 270].map((deg, i) => (
            <group key={i} position={at(base + deg, 0.58)} rotation={[0, j(i) * Math.PI, 0]}>
              <mesh geometry={G.brick} material={M.brick} position={[-0.04, 0.033, 0]} castShadow={cast} />
              <mesh geometry={G.brick} material={M.brick2} position={[0.09, 0.033, 0.03]} rotation={[0, 0.5, 0]} castShadow={cast} />
              <mesh geometry={G.brick} material={M.brick2} position={[0.02, 0.098, 0.01]} rotation={[0, 0.2, 0]} castShadow={cast} />
            </group>
          ))}
          {[90, 210, 330].map((deg, i) => (
            <mesh key={i} geometry={G.brick} material={M.brick} position={at(base + deg, 0.62, 0.033)} rotation={[0, j(i + 5) * 3, 0]} castShadow={cast} />
          ))}
        </group>
      );
    case 'montanas':
      return (
        <group>
          {[90, 210, 330].map((deg, i) => {
            const s = [1, 0.85, 0.95][i];
            return (
              <group key={i} position={at(base + deg, 0.55)} scale={s} rotation={[0, j(i) * 2, 0]}>
                <mesh geometry={G.peak} material={i % 2 ? M.rock : M.rock2} position={[0, 0.24, 0]} castShadow={cast} />
                <mesh geometry={G.cap} material={M.snow} position={[0, 0.395, 0]} scale={1.04} />
              </group>
            );
          })}
          {[30, 150, 270].map((deg, i) => (
            <mesh key={i} geometry={G.peak} material={M.rock} position={at(base + deg, 0.62, 0.13)} scale={0.55} castShadow={cast} />
          ))}
        </group>
      );
    case 'mar':
      return null;
    case 'niebla':
      // Niebla: nubecitas blancas que tapan la casilla.
      return (
        <group>
          {[0, 72, 144, 216, 288].map((deg, i) => (
            <mesh key={i} geometry={G.bush} material={M.fog} position={at(base + deg, 0.4 + j(i) * 0.15, 0.08 + j(i + 2) * 0.06)} scale={2.2 + j(i + 4)} />
          ))}
          <mesh geometry={G.bush} material={M.fog} position={[0, 0.14, 0]} scale={3} />
        </group>
      );
    case 'oro':
      // Río de oro: un arroyo, rocas y pepitas brillantes.
      return (
        <group>
          <mesh geometry={G.brick} material={M.river} position={at(base, 0.05, 0.005)} scale={[7, 0.12, 1.4]} rotation={[0, (-base * Math.PI) / 180, 0]} />
          {[60, 180, 300].map((deg, i) => (
            <mesh key={i} geometry={G.peak} material={M.goldRock} position={at(base + deg, 0.6)} scale={0.5 + j(i) * 0.15} castShadow={cast} />
          ))}
          {[100, 140, 220, 260, 20].map((deg, i) => (
            <mesh key={`n${i}`} geometry={G.bush} material={M.gold} position={at(base + deg, 0.35 + j(i + 3) * 0.2, 0.03)} scale={0.8 + j(i + 5) * 0.5} castShadow={cast} />
          ))}
        </group>
      );
    case 'desierto':
      return (
        <group>
          {[20, 200].map((deg, i) => (
            <mesh key={i} geometry={G.dune} material={M.dune} position={at(base + deg, 0.5)} scale={[1, 0.22, 0.6]} rotation={[0, (deg * Math.PI) / 180, 0]} />
          ))}
          {[110, 290].map((deg, i) => (
            <group key={i} position={at(base + deg, 0.58)}>
              <mesh geometry={G.cactus} material={M.cactus} position={[0, 0.11, 0]} castShadow={cast} />
              <mesh geometry={G.arm} material={M.cactus} position={[0.045, 0.14, 0]} rotation={[0, 0, -0.9]} castShadow={cast} />
            </group>
          ))}
        </group>
      );
  }
}

// ---------- Hexágono ----------

function Tile({ id, terrain, decor, shadows }: { id: number; terrain: Terrain; decor: boolean; shadows: boolean }) {
  const clock = useClock();
  const group = useRef<Group>(null);
  const material = useMemo(() => {
    const color = TERRAIN_COLOR[terrain];
    return new MeshStandardMaterial({ color, roughness: 0.85, emissive: color, emissiveIntensity: 0 });
  }, [terrain]);
  useEffect(() => () => material.dispose(), [material]);

  const geo = useGeo();
  const w = hexWindow(id, geo);
  const [tx, tz] = hexWorld(geo, id);
  // Los hexágonos de Navegantes tienen un lado plano arriba: la pieza (hecha "de punta") gira 30°.
  const yaw = geo.flat ? Math.PI / 6 : 0;
  const r1 = Math.hypot(tx, tz);
  const a1 = r1 > 0 ? Math.atan2(tz, tx) : 0;

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = clock.current.t;
    const p = progress(t, w);
    g.visible = p > 0;
    if (!g.visible) return;
    // Llega en espiral desde lejos y desde arriba, girando, y "hace pop" al posarse.
    const e = ease.outCubic(p);
    const a = lerp(a1 + 1.8, a1, e);
    const r = lerp(9, r1, e);
    g.position.set(r * Math.cos(a), 5 * (1 - e), r * Math.sin(a));
    g.rotation.set((1 - e) * 0.9, (1 - e) * Math.PI * 1.5 + yaw, 0);
    g.scale.setScalar(lerp(0.35, 1, ease.outBack(p)));
    material.emissiveIntensity = landingFlash(t, w) * 0.9;
  });

  return (
    <group ref={group} visible={false}>
      <mesh geometry={BASE_GEO} material={SAND} receiveShadow={shadows} />
      <mesh geometry={TILE_GEO} material={material} position={[0, BASE_H + BEVEL, 0]} castShadow={shadows} receiveShadow={shadows} />
      {decor && (
        // Algo más grande y alta que "a escala", para que se lea bien en el móvil.
        <group position={[0, TOP, 0]} scale={[1.1, 1.35, 1.1]}>
          <Decor terrain={terrain} id={id} shadows={shadows} />
        </group>
      )}
    </group>
  );
}

// ---------- Hexágono de mar (Navegantes) ----------

// Un hexágono plano y algo más claro que el mar, con su borde: se ve el marco sin tapar los barcos.
const SEA_HEX_GEO = new CircleGeometry(0.97, 6).rotateX(-Math.PI / 2);
const SEA_EDGE_GEO = new RingGeometry(0.93, 0.99, 6, 1).rotateX(-Math.PI / 2);
const SEA_EDGE_MAT = new MeshBasicMaterial({ color: '#d6ecf7', transparent: true, opacity: 0.28, depthWrite: false });

function SeaTile({ id }: { id: number }) {
  const clock = useClock();
  const geo = useGeo();
  const group = useRef<Group>(null);
  const material = useMemo(
    () => new MeshStandardMaterial({ color: TERRAIN_COLOR.mar, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const w = hexWindow(id, geo);
  const [x, z] = hexWorld(geo, id);

  useFrame(({ clock: real }) => {
    const g = group.current;
    if (!g) return;
    const p = progress(clock.current.t, w);
    g.visible = p > 0;
    if (!g.visible) return;
    // Se extiende desde el centro del hexágono, como una ola; luego brilla muy poco.
    g.scale.setScalar(Math.max(0.001, ease.outCubic(p)));
    material.opacity = (0.42 + 0.06 * Math.sin(real.elapsedTime * 0.9 + id)) * p;
  });

  return (
    <group ref={group} position={[x, 0.008, z]} visible={false}>
      <mesh geometry={SEA_HEX_GEO} material={material} />
      <mesh geometry={SEA_EDGE_GEO} material={SEA_EDGE_MAT} position={[0, 0.002, 0]} />
    </group>
  );
}

// ---------- Fichas ----------

const TOKEN_R = 0.36;
const TOKEN_H = 0.05;
const RIM_GEO = new CylinderGeometry(TOKEN_R, TOKEN_R, TOKEN_H, 40);
const FACE_GEO = new CircleGeometry(TOKEN_R * 0.98, 40).rotateX(-Math.PI / 2);
const RIM_MAT = new MeshStandardMaterial({ color: '#eadcbc', roughness: 0.55 });
const GLOW_GEO = new PlaneGeometry(1.8, 1.8).rotateX(-Math.PI / 2);

function Token({ id, n, showPips, numberStyle, fontsVersion, shadows }: { id: number; n: number; showPips: boolean; numberStyle: NumberStyle; fontsVersion: number; shadows: boolean }) {
  const clock = useClock();
  const group = useRef<Group>(null);
  const glow = useRef<Mesh>(null);
  const red = isRed(n);
  const face = useMemo(
    () => new MeshStandardMaterial({ map: tokenTexture(n, showPips, numberStyle, fontsVersion), roughness: 0.6 }),
    [n, showPips, numberStyle, fontsVersion],
  );
  const glowMat = useMemo(
    () => new MeshBasicMaterial({ map: glowTexture(), color: '#ff5a3c', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
    [],
  );
  useEffect(() => () => face.dispose(), [face]);
  useEffect(() => () => glowMat.dispose(), [glowMat]);

  const geo = useGeo();
  const w = tokenWindow(id, geo);
  const [x, z] = hexWorld(geo, id);

  useFrame(({ clock: real }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.current.t;
    const p = progress(t, w);
    g.visible = p > 0;
    // Cae desde arriba girando como una moneda y rebota al llegar.
    g.position.y = TOP + 2.4 * (1 - ease.outBounce(p));
    g.rotation.x = (1 - ease.outCubic(p)) * Math.PI * 4;
    // El 6 y el 8 brillan en rojo, latiendo suave.
    if (red && glow.current) {
      const on = progress(t, { start: w.start + w.dur * 0.6, dur: 0.4 });
      glowMat.opacity = on * (0.8 + 0.2 * Math.sin(real.elapsedTime * 2.4 + id));
      glow.current.visible = on > 0;
    }
  });

  return (
    <>
      {red && <mesh ref={glow} geometry={GLOW_GEO} material={glowMat} position={[x, TOP + 0.004, z]} visible={false} />}
      <group ref={group} position={[x, TOP, z]} scale={[numberStyle.disc, 1, numberStyle.disc]} visible={false}>
        <mesh geometry={RIM_GEO} material={RIM_MAT} position={[0, TOKEN_H / 2, 0]} castShadow={shadows} />
        <mesh geometry={FACE_GEO} material={face} position={[0, TOKEN_H + 0.001, 0]} />
      </group>
    </>
  );
}

// ---------- Cruces resaltados (análisis) ----------

const DOT_GEO = new SphereGeometry(0.15, 20, 14);
const DOT_MAT = new MeshStandardMaterial({ color: '#e0a458', emissive: '#e0a458', emissiveIntensity: 0.6, roughness: 0.4 });
const HALO_MAT = new MeshBasicMaterial({ map: glowTexture(), color: '#ffc46b', transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false });
const HALO_GEO = new PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2);

function Highlight({ vertex, index }: { vertex: number; index: number }) {
  const ref = useRef<Group>(null);
  const [x, z] = vertexWorld(useGeo(), vertex);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + 0.12 * Math.sin(clock.elapsedTime * 3 + index));
  });
  return (
    <group ref={ref} position={[x, TOP + 0.12, z]}>
      <mesh geometry={DOT_GEO} material={DOT_MAT} />
      <mesh geometry={HALO_GEO} material={HALO_MAT} position={[0, -0.1, 0]} />
    </group>
  );
}

// ---------- Todo junto ----------

export function Island({
  board, showPips, numberStyle, highlight, decor, shadows, fontsVersion,
}: { board: Board; showPips: boolean; numberStyle: NumberStyle; highlight: number[]; decor: boolean; shadows: boolean; fontsVersion: number }) {
  const geo = useGeo();
  return (
    <group>
      {geo.hexes.map((h) =>
        board.terrains[h.id] === 'mar' ? (
          <SeaTile key={h.id} id={h.id} />
        ) : (
          <Tile key={h.id} id={h.id} terrain={board.terrains[h.id]} decor={decor} shadows={shadows} />
        ),
      )}
      {geo.hexes.map((h) => {
        const n = board.numbers[h.id];
        return n == null ? null : <Token key={h.id} id={h.id} n={n} showPips={showPips} numberStyle={numberStyle} fontsVersion={fontsVersion} shadows={shadows} />;
      })}
      {highlight.map((v, i) => (
        <Highlight key={v} vertex={v} index={i} />
      ))}
    </group>
  );
}
