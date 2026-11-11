// Barcos de los puertos y el ladrón (con su nube de humo).
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry, CircleGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, IcosahedronGeometry, LatheGeometry, MeshStandardMaterial,
  Shape, ShapeGeometry, SphereGeometry, SpriteMaterial, Vector2, type Group, type Sprite,
} from 'three';
import type { Board, Port as PortData } from '../game';
import { useClock } from './clock';
import { TOP, hexWorld, portPlacement, useGeo, yawTowards } from './coords';
import type { NumberStyle } from '../lib/numberStyle';
import { portTexture, tokenTexture } from './textures';
import { SEQ, clamp01, ease, lerp, portWindow, progress } from './timeline';

// ---------- Barco ----------

function hullGeometry() {
  // Perfil de lado del casco (x = largo, y = alto), extruido a lo ancho.
  const s = new Shape();
  s.moveTo(-0.24, 0.1);
  s.lineTo(0.26, 0.1);
  s.lineTo(0.16, -0.02);
  s.lineTo(-0.17, -0.02);
  s.closePath();
  return new ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false }).translate(0, 0, -0.08);
}

function sailGeometry() {
  const s = new Shape();
  s.moveTo(0, 0.14);
  s.lineTo(0, 0.48);
  s.lineTo(0.2, 0.16);
  s.closePath();
  return new ShapeGeometry(s);
}

const HULL_GEO = hullGeometry();
const SAIL_GEO = sailGeometry();
const MAST_GEO = new CylinderGeometry(0.012, 0.014, 0.42, 5);
const PIER_GEO = new BoxGeometry(1, 0.03, 0.07).translate(0.5, 0, 0);
const WOOD = new MeshStandardMaterial({ color: '#7b5534', roughness: 0.8, flatShading: true });
const PIER = new MeshStandardMaterial({ color: '#9a7650', roughness: 0.9 });
const SAIL = new MeshStandardMaterial({ color: '#fff3dd', roughness: 0.7, side: DoubleSide });

function Port({ board, port, order, fontsVersion, shadows }: { board: Board; port: PortData; order: number; fontsVersion: number; shadows: boolean }) {
  const geo = useGeo();
  const clock = useClock();
  const boat = useRef<Group>(null);
  const label = useRef<Sprite>(null);
  const piers = useRef<Group>(null);
  const place = useMemo(() => portPlacement(geo, board, port.coast), [geo, board, port.coast]);
  const labelMat = useMemo(() => new SpriteMaterial({ map: portTexture(port.type, fontsVersion), depthWrite: false }), [port.type, fontsVersion]);
  useEffect(() => () => labelMat.dispose(), [labelMat]);

  // Dos pasarelas de madera, desde cada cruce del puerto hacia el barco.
  const planks = [place.a, place.b].map(([vx, vz]) => {
    const dx = place.boat[0] - vx;
    const dz = place.boat[1] - vz;
    return { x: vx, z: vz, yaw: yawTowards(dx, dz), len: Math.hypot(dx, dz) - 0.2 };
  });
  const w = portWindow(order);

  useFrame(({ clock: real }) => {
    const t = clock.current.t;
    const p = progress(t, w);
    const time = real.elapsedTime;
    if (boat.current) {
      const g = boat.current;
      g.visible = p > 0;
      // Llega navegando desde mar abierto y luego se mece en el agua.
      const slide = 2.2 * (1 - ease.outCubic(p));
      g.position.set(place.boat[0] + place.out[0] * slide, 0.02 + 0.022 * Math.sin(time * 2 + order), place.boat[1] + place.out[1] * slide);
      g.rotation.set(0.06 * Math.sin(time * 1.6 + order), place.yaw, 0);
      g.scale.setScalar(lerp(0.2, 1, ease.outBack(p)));
    }
    if (label.current) {
      label.current.visible = p > 0.3;
      label.current.scale.setScalar(0.78 * ease.outBack(clamp01((p - 0.3) / 0.7)));
    }
    if (piers.current) {
      const k = clamp01((p - 0.4) / 0.6);
      piers.current.visible = k > 0;
      piers.current.children.forEach((c, i) => (c.scale.x = planks[i].len * ease.outCubic(k)));
    }
  });

  return (
    <group>
      <group ref={piers} visible={false}>
        {planks.map((pl, i) => (
          <mesh key={i} geometry={PIER_GEO} material={PIER} position={[pl.x, 0.06, pl.z]} rotation={[0, pl.yaw, 0]} receiveShadow={shadows} />
        ))}
      </group>
      <group ref={boat} visible={false}>
        <mesh geometry={HULL_GEO} material={WOOD} castShadow={shadows} />
        <mesh geometry={MAST_GEO} material={WOOD} position={[0, 0.3, 0]} />
        <mesh geometry={SAIL_GEO} material={SAIL} position={[0.015, 0, 0]} castShadow={shadows} />
        <sprite ref={label} material={labelMat} position={[0, 0.95, 0]} visible={false} />
      </group>
    </group>
  );
}

export function Ports({ board, fontsVersion, shadows }: { board: Board; fontsVersion: number; shadows: boolean }) {
  const geo = useGeo();
  // Aparecen en orden alrededor de la isla (en Navegantes, girando alrededor del centro).
  const angle = (p: PortData) => {
    const [x, z] = portPlacement(geo, board, p.coast).boat;
    return Math.atan2(-z, x);
  };
  const sorted = geo.kind === 'isla' ? board.ports.slice().sort((a, b) => a.coast - b.coast) : board.ports.slice().sort((a, b) => angle(a) - angle(b));
  return (
    <group>
      {sorted.map((p, i) => (
        <Port key={p.coast} board={board} port={p} order={i} fontsVersion={fontsVersion} shadows={shadows} />
      ))}
    </group>
  );
}

// ---------- Ladrón ----------

const ROBBER_GEO = new LatheGeometry(
  [
    [0, 0], [0.17, 0], [0.17, 0.035], [0.12, 0.07], [0.1, 0.14], [0.13, 0.27], [0.11, 0.36], [0.07, 0.41], [0, 0.42],
  ].map(([x, y]) => new Vector2(x, y)),
  20,
);
const HEAD_GEO = new SphereGeometry(0.095, 18, 14);
const ROBBER = new MeshStandardMaterial({ color: '#3b3631', roughness: 0.5, metalness: 0.1 });
const PUFF_GEO = new IcosahedronGeometry(0.12, 1);
const PUFFS = 8;

export function Robber({ hex, shadows }: { hex: number; shadows: boolean }) {
  const clock = useClock();
  const body = useRef<Group>(null);
  const smoke = useRef<Group>(null);
  const smokeMat = useMemo(
    () => new MeshStandardMaterial({ color: '#d9d1c5', roughness: 1, transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  useEffect(() => () => smokeMat.dispose(), [smokeMat]);
  const [x, z] = hexWorld(useGeo(), hex);

  useFrame(() => {
    const t = clock.current.t;
    const p = progress(t, SEQ.robber);
    if (body.current) {
      body.current.visible = p > 0;
      body.current.position.y = TOP + 0.7 * (1 - ease.outCubic(p));
      body.current.scale.setScalar(Math.max(0.001, ease.outBack(p)));
    }
    // Nube de humo que se abre y se desvanece.
    const q = progress(t, SEQ.smoke);
    if (smoke.current) {
      smoke.current.visible = q > 0 && q < 1;
      smokeMat.opacity = (1 - q) ** 1.5 * 0.8;
      smoke.current.children.forEach((c, i) => {
        const a = (i / PUFFS) * Math.PI * 2;
        const r = 0.12 + 0.5 * ease.outCubic(q);
        c.position.set(Math.cos(a) * r, 0.15 + 0.35 * q + (i % 2) * 0.08, Math.sin(a) * r);
        c.scale.setScalar(0.5 + 1.1 * q);
      });
    }
  });

  return (
    <group position={[x, 0, z]}>
      <group ref={body} visible={false}>
        <mesh geometry={ROBBER_GEO} material={ROBBER} castShadow={shadows} />
        <mesh geometry={HEAD_GEO} material={ROBBER} position={[0, 0.5, 0]} castShadow={shadows} />
      </group>
      <group ref={smoke} position={[0, TOP, 0]} visible={false}>
        {Array.from({ length: PUFFS }, (_, i) => (
          <mesh key={i} geometry={PUFF_GEO} material={smokeMat} />
        ))}
      </group>
    </group>
  );
}

// ---------- Pirata (Navegantes) ----------

const PIRATE_HULL = new MeshStandardMaterial({ color: '#211c19', roughness: 0.6, flatShading: true });
const PIRATE_SAIL = new MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.9, side: DoubleSide });
const PIRATE_FLAG = new MeshStandardMaterial({ color: '#b3261e', roughness: 0.8, side: DoubleSide });
const SKULL = new MeshStandardMaterial({ color: '#f1ece2', roughness: 0.7 });
const FLAG_GEO = new BoxGeometry(0.11, 0.06, 0.004).translate(0.055, 0, 0);
const SKULL_GEO = new SphereGeometry(0.035, 10, 8);

/**
 * El barco pirata: negro, con vela oscura y bandera roja. Si el escenario lo pone en una casilla de mar, se mece
 * ahí; si empieza fuera del tablero (Nuevo mundo), da vueltas alrededor del marco.
 */
export function Pirate({ hex, shadows }: { hex: number | null; shadows: boolean }) {
  const clock = useClock();
  const geo = useGeo();
  const ship = useRef<Group>(null);
  const flag = useRef<Group>(null);
  const orbit = useMemo(() => {
    const w = Math.max(...geo.vertices.map((v) => Math.abs(v.x))) + 0.45;
    const h = Math.max(...geo.vertices.map((v) => Math.abs(v.y))) + 0.4;
    return { w, h };
  }, [geo]);
  const spot = hex === null ? null : hexWorld(geo, hex);

  useFrame(({ clock: real }) => {
    const g = ship.current;
    if (!g) return;
    const p = progress(clock.current.t, SEQ.robber);
    const time = real.elapsedTime;
    g.visible = p > 0;
    if (!g.visible) return;
    g.scale.setScalar(2.1 * Math.max(0.001, ease.outBack(p)));
    if (spot) {
      // Llega desde fuera navegando y se queda meciéndose en su casilla.
      const slide = 2.5 * (1 - ease.outCubic(p));
      g.position.set(spot[0] + slide, 0.03 + 0.02 * Math.sin(time * 1.8), spot[1] - slide * 0.4);
      g.rotation.set(0.07 * Math.sin(time * 1.4), 0.6 + 0.08 * Math.sin(time * 0.7), 0.04 * Math.sin(time * 1.1));
    } else {
      // Vuelta lenta alrededor del marco, siempre mirando hacia donde va.
      const a = time * 0.09;
      const x = orbit.w * Math.cos(a);
      const z = orbit.h * Math.sin(a);
      g.position.set(x, 0.03 + 0.02 * Math.sin(time * 1.8), z);
      g.rotation.set(0.07 * Math.sin(time * 1.4), yawTowards(-orbit.w * Math.sin(a), orbit.h * Math.cos(a)), 0);
    }
    if (flag.current) flag.current.rotation.y = 0.35 * Math.sin(time * 4);
  });

  return (
    <group ref={ship} visible={false}>
      <mesh geometry={HULL_GEO} material={PIRATE_HULL} castShadow={shadows} />
      <mesh geometry={MAST_GEO} material={PIRATE_HULL} position={[0, 0.3, 0]} />
      <mesh geometry={SAIL_GEO} material={PIRATE_SAIL} position={[0.015, 0, 0]} castShadow={shadows} />
      <mesh geometry={SKULL_GEO} material={SKULL} position={[0.07, 0.3, 0.004]} scale={[1, 1, 0.3]} />
      <group ref={flag} position={[0, 0.52, 0]}>
        <mesh geometry={FLAG_GEO} material={PIRATE_FLAG} />
      </group>
    </group>
  );
}

// ---------- Piezas de los escenarios (regalos, aldeas, fortalezas, maravillas...) ----------

const COIN_GEO = new CylinderGeometry(0.15, 0.15, 0.045, 18);
const CARD_GEO = new BoxGeometry(0.24, 0.02, 0.34);
const HOUSE_GEO = new BoxGeometry(0.2, 0.15, 0.2).translate(0, 0.075, 0);
const ROOF_GEO = new CylinderGeometry(0, 0.17, 0.12, 4, 1).rotateY(Math.PI / 4).translate(0, 0.21, 0);
const VILLAGE_RIM_GEO = new CylinderGeometry(0.27, 0.27, 0.06, 28);
const VILLAGE_FACE_GEO = new CircleGeometry(0.25, 28).rotateX(-Math.PI / 2);
const MARKER_GEO = new CylinderGeometry(0.13, 0.13, 0.04, 20);
const BLOCK_GEO = new BoxGeometry(0.2, 0.12, 0.2).translate(0, 0.06, 0);
const BANG_GEO = new CylinderGeometry(0.035, 0.02, 0.24, 8).translate(0, 0.24, 0);
const DOT_GEO_3D = new SphereGeometry(0.04, 10, 8);
const COIN = new MeshStandardMaterial({ color: '#e9b949', roughness: 0.4, metalness: 0.5 });
const CARD = new MeshStandardMaterial({ color: '#efe2c4', roughness: 0.8 });
const VILLAGE_RIM = new MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.7 });
const DANGER = new MeshStandardMaterial({ color: '#c62828', roughness: 0.5 });
const colorMats = new Map<string, MeshStandardMaterial>();
const colorMat = (c: string) => {
  if (!colorMats.has(c)) colorMats.set(c, new MeshStandardMaterial({ color: c, roughness: 0.6, flatShading: true }));
  return colorMats.get(c)!;
};

function VillageToken({ n, numberStyle, fontsVersion }: { n: number; numberStyle: NumberStyle; fontsVersion: number }) {
  const face = useMemo(() => new MeshStandardMaterial({ map: tokenTexture(n, true, numberStyle, fontsVersion), roughness: 0.6 }), [n, numberStyle, fontsVersion]);
  useEffect(() => () => face.dispose(), [face]);
  return (
    <group>
      <mesh geometry={VILLAGE_RIM_GEO} material={VILLAGE_RIM} position={[0, 0.03, 0]} />
      <mesh geometry={VILLAGE_FACE_GEO} material={face} position={[0, 0.062, 0]} />
    </group>
  );
}

/** Lo que trae cada escenario encima del mapa: aparece con el ladrón, botando un poco. */
export function ScenarioPieces({ board, numberStyle, fontsVersion, shadows }: { board: Board; numberStyle: NumberStyle; fontsVersion: number; shadows: boolean }) {
  const clock = useClock();
  const geo = useGeo();
  const group = useRef<Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const p = progress(clock.current.t, SEQ.robber);
    g.visible = p > 0;
    g.children.forEach((c) => c.scale.setScalar(Math.max(0.001, ease.outBack(p)) * ((c.userData.big as number | undefined) ?? 1)));
  });

  const gifts = (board.gifts ?? []).map((gift, i) => {
    const e = geo.edges[gift.edge];
    const [ax, az] = [geo.vertices[e.a].x, geo.vertices[e.a].y];
    const [bx, bz] = [geo.vertices[e.b].x, geo.vertices[e.b].y];
    const land = e.hexes.find((h) => board.terrains[h] !== 'mar') ?? e.hexes[0];
    const [hx, hz] = hexWorld(geo, land);
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const len = Math.hypot(mx - hx, mz - hz) || 1;
    const x = mx + ((mx - hx) / len) * 0.32;
    const z = mz + ((mz - hz) / len) * 0.32;
    return (
      <group key={`g${i}`} position={[x, 0.03, z]} userData={{ big: 1.4 }}>
        {gift.kind === 'punto' ? (
          [0, 1].map((k) => <mesh key={k} geometry={COIN_GEO} material={COIN} position={[0, 0.025 + k * 0.05, 0]} castShadow={shadows} />)
        ) : (
          <mesh geometry={CARD_GEO} material={CARD} position={[0, 0.03, 0]} rotation={[0, yawTowards(mx - hx, mz - hz), 0.15]} castShadow={shadows} />
        )}
      </group>
    );
  });

  const spots = (board.spots ?? []).map((sp, i) => {
    const v = geo.vertices[sp.vertex];
    const color = sp.color ?? '#333333';
    return (
      <group key={`s${i}`} position={[v.x, TOP, v.y]} userData={{ big: sp.kind === 'aldea' ? 1.15 : 1.8 }}>
        {sp.kind === 'aldea' && sp.n != null && <VillageToken n={sp.n} numberStyle={numberStyle} fontsVersion={fontsVersion} />}
        {sp.kind === 'fortaleza' && (
          <group>
            {[0, 1, 2].map((k) => (
              <mesh key={k} geometry={COIN_GEO} material={COIN} position={[0, 0.025 + k * 0.05, 0]} castShadow={shadows} />
            ))}
            <group position={[0, 0.15, 0]}>
              <mesh geometry={HOUSE_GEO} material={colorMat(color)} castShadow={shadows} />
              <mesh geometry={ROOF_GEO} material={colorMat(color)} castShadow={shadows} />
            </group>
          </group>
        )}
        {sp.kind === 'casa' && (
          <group>
            <mesh geometry={HOUSE_GEO} material={colorMat(color)} castShadow={shadows} />
            <mesh geometry={ROOF_GEO} material={colorMat(color)} castShadow={shadows} />
          </group>
        )}
        {sp.kind === 'objetivo' && <mesh geometry={MARKER_GEO} material={colorMat(color)} position={[0, 0.02, 0]} />}
        {sp.kind === 'maravilla' && <mesh geometry={BLOCK_GEO} material={colorMat(color)} castShadow={shadows} />}
        {sp.kind === 'peligro' && (
          <group>
            <mesh geometry={BANG_GEO} material={DANGER} castShadow={shadows} />
            <mesh geometry={DOT_GEO_3D} material={DANGER} position={[0, 0.05, 0]} />
          </group>
        )}
      </group>
    );
  });

  if (!gifts.length && !spots.length) return null;
  return (
    <group ref={group} visible={false}>
      {gifts}
      {spots}
    </group>
  );
}
