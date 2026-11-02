// Barcos de los puertos y el ladrón (con su nube de humo).
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, IcosahedronGeometry, LatheGeometry, MeshStandardMaterial,
  Shape, ShapeGeometry, SphereGeometry, SpriteMaterial, Vector2, type Group, type Sprite,
} from 'three';
import type { Port as PortData } from '../game';
import { useClock } from './clock';
import { TOP, hexWorld, portPlacement, yawTowards } from './coords';
import { portTexture } from './textures';
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

function Port({ port, order, fontsVersion, shadows }: { port: PortData; order: number; fontsVersion: number; shadows: boolean }) {
  const clock = useClock();
  const boat = useRef<Group>(null);
  const label = useRef<Sprite>(null);
  const piers = useRef<Group>(null);
  const place = useMemo(() => portPlacement(port.coast), [port.coast]);
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

export function Ports({ ports, fontsVersion, shadows }: { ports: PortData[]; fontsVersion: number; shadows: boolean }) {
  // Aparecen en orden alrededor de la isla.
  const sorted = ports.slice().sort((a, b) => a.coast - b.coast);
  return (
    <group>
      {sorted.map((p, i) => (
        <Port key={p.coast} port={p} order={i} fontsVersion={fontsVersion} shadows={shadows} />
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
  const [x, z] = hexWorld(hex);

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
