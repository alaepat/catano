// Escena 3D del tablero: la isla aparece en el espacio con la secuencia "épica" (timeline.ts).
// Se carga aparte (lazy) para que la app arranque rápido; si falla, Tablero muestra el 2D.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { MathUtils, Plane, Raycaster, Vector2, Vector3, type Group, type PerspectiveCamera } from 'three';
import { geometryOf, type Board, type Geometry } from '../game';
import { firstFamily, type NumberStyle } from '../lib/numberStyle';
import { playSequence, playSound } from '../lib/sound';
import type { Quality } from '../store';
import { ClockContext, useClock, type Clock } from './clock';
import { GeoContext, TOP, boardHalf, seaRadius, useGeo } from './coords';
import { Island } from './Island';
import { Ports, Robber } from './Pieces';
import { Aura, Burst, Sea, Stars } from './Space';
import { SEQ, ease, lerp, progress, soundTimeline } from './timeline';

type Quality3D = Exclude<Quality, '2d'>;

const QUALITY: Record<Quality3D, { dpr: [number, number]; antialias: boolean; shadows: boolean; decor: boolean; stars: number }> = {
  alta: { dpr: [1, 2], antialias: true, shadows: true, decor: true, stars: 1400 },
  media: { dpr: [1, 1.5], antialias: true, shadows: false, decor: true, stars: 700 },
  baja: { dpr: [1, 1], antialias: false, shadows: false, decor: false, stars: 250 },
};

const FOV = 32;

/** Zoom: 1 = se ve toda la isla; cuanto más pequeño, más cerca. */
const ZOOM_MIN = 0.3;
const ZOOM_HEX = 0.42;
const PAN_MAX = 4;

/** Hacia dónde mira la cámara y lo cerca que está. `t*` es el objetivo; el resto se acerca a él poco a poco. */
interface View {
  x: number;
  z: number;
  zoom: number;
  tx: number;
  tz: number;
  tzoom: number;
  /** Distancia real de la cámara. */
  dist: number;
  /** Distancia con la que cabe toda la isla en el hueco libre (zoom 1). */
  fit: number;
  /** Hay un dedo moviendo el mapa: la cámara le sigue más deprisa. */
  live: boolean;
}

/** Inclinación final de la cámara, en grados. */
const FINAL_ELEV = 54;

/** Coloca la cámara mirando a (x, z) desde `dist`, con la inclinación y el giro dados. */
function placeCamera(cam: PerspectiveCamera, x: number, z: number, zoom: number, dist: number, elevDeg: number, azim: number) {
  const elev = MathUtils.degToRad(elevDeg);
  // De cerca se mira a la cara de arriba de las fichas, no a la base.
  const lookY = TOP * (1 - zoom);
  const lz = z + 0.25 * zoom;
  cam.position.set(x + dist * Math.cos(elev) * Math.sin(azim), lookY + dist * Math.sin(elev), lz + dist * Math.cos(elev) * Math.cos(azim));
  cam.lookAt(x, lookY, lz);
}

const ViewContext = createContext<RefObject<View> | null>(null);
const useView = () => useContext(ViewContext)!;

function flyTo(v: View, hex: number | null, geo: Geometry) {
  if (hex === null) {
    v.tx = v.tz = 0;
    v.tzoom = 1;
  } else {
    v.tx = geo.hexes[hex].x;
    // Un poco por debajo del hexágono: así queda más arriba en pantalla, lejos de la tarjeta.
    v.tz = geo.hexes[hex].y + 0.5;
    v.tzoom = ZOOM_HEX;
  }
}

export interface Board3DProps {
  board: Board;
  /** Cambia en cada generación: reinicia la animación sin crear otro lienzo 3D. */
  animKey: number;
  /** 0 = sin animación; 1 = épica; menos de 1 = más rápida. */
  speed: number;
  /** true = acelerar hasta el final (al tocar la pantalla). */
  skip: boolean;
  showPips: boolean;
  /** Cómo se ven los números de las fichas. */
  numberStyle: NumberStyle;
  highlight: number[];
  quality: Quality3D;
  /** Estrellas 3D (solo con el fondo Espacio). */
  stars: boolean;
  /** Efectos de sonido. */
  sound: boolean;
  /** Hexágono al que se ha acercado la cámara (null = vista completa). */
  focus: number | null;
  /** Se toca un hexágono (su id) o fuera de la isla (null). */
  onPick: (hex: number | null) => void;
  /**
   * Hueco libre de la pantalla (entre los textos de arriba y la barra de abajo). El lienzo 3D ocupa
   * toda la pantalla, pero la isla, sin zoom, se encaja en este hueco.
   */
  slotRef?: RefObject<HTMLElement | null>;
  /** Aquí la escena deja una función que hace una foto del tablero tal como se ve. */
  captureRef?: RefObject<(() => HTMLCanvasElement) | null>;
  onDone: () => void;
  onFail: () => void;
}

/** Espera a que estén las tipografías (también la elegida para los números) para dibujar bien las fichas. */
function useFontsVersion(style: NumberStyle): number {
  const [version, setVersion] = useState(0);
  const numberFont = `${style.weight} 100px ${firstFamily(style.family)}`;
  useEffect(() => {
    let alive = true;
    const fonts = document.fonts;
    if (!fonts) return;
    Promise.all([fonts.load('700 100px Fraunces'), fonts.load('800 50px Nunito'), fonts.load(numberFont)])
      .then(() => alive && setVersion((v) => v + 1))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [numberFont]);
  return version;
}

export default function Board3D(props: Board3DProps) {
  const q = QUALITY[props.quality];
  const fontsVersion = useFontsVersion(props.numberStyle);
  const onFail = useRef(props.onFail);
  useEffect(() => {
    onFail.current = props.onFail;
  });

  return (
    <Canvas
      // El antialias no se puede cambiar en marcha: al cambiar la calidad se crea un lienzo nuevo.
      key={props.quality}
      style={{ position: 'absolute', inset: 0 }}
      dpr={q.dpr}
      shadows={q.shadows}
      gl={{ antialias: q.antialias, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, near: 0.1, far: 500, position: [0, 120, 20] }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          onFail.current();
        });
      }}
    >
      <Scene key={props.animKey} {...props} fontsVersion={fontsVersion} />
    </Canvas>
  );
}

function Scene({ board, speed, skip, showPips, numberStyle, highlight, quality, stars, sound, captureRef, onDone, focus, onPick, slotRef, fontsVersion }: Board3DProps & { fontsVersion: number }) {
  const q = QUALITY[quality];
  const clock = useRef<Clock>({ t: speed > 0 ? 0 : SEQ.end, doneAt: null });
  const done = useRef(speed <= 0);
  const skipping = useRef(skip);
  const onDoneRef = useRef(onDone);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    skipping.current = skip;
    onDoneRef.current = onDone;
    onPickRef.current = onPick;
  });

  // Cámara: se acerca al hexágono elegido o vuelve a la vista completa.
  const view = useRef<View>({ x: 0, z: 0, zoom: 1, tx: 0, tz: 0, tzoom: 1, dist: 0, fit: 1, live: false });
  const geo = geometryOf(board);
  useEffect(() => flyTo(view.current, focus, geo), [focus, geo]);

  // Sonidos: se programan todos al empezar; si se salta la animación, se cortan y suena el acorde final.
  const stopSound = useRef<() => void>(() => {});
  useEffect(() => {
    if (!sound) return;
    if (speed <= 0) {
      playSound('chord');
      return;
    }
    const numbered = board.numbers.flatMap((n, id) => (n == null ? [] : [id]));
    stopSound.current = playSequence(soundTimeline(numbered, board.ports.length, board.robber !== null, speed, geo));
    return () => stopSound.current();
    // Solo al aparecer la escena (cada generación monta una escena nueva).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (skip && sound && speed > 0 && clock.current.t < SEQ.end - 0.4) {
      stopSound.current();
      playSound('chord');
    }
  }, [skip, sound, speed]);

  // Foto: un fotograma cuadrado, más abierto (para que quepa toda el aura) y sin estrellas.
  // Se dibuja, se copia y se deja todo como estaba en el mismo instante, así en pantalla no se nota nada.
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = () => {
      const SIZE = 1200;
      const view = camera as PerspectiveCamera;
      const shot = view.clone();
      shot.clearViewOffset();
      shot.aspect = 1;
      const reach = seaRadius(geo) * 1.45;
      const dir = view.position.clone().normalize();
      shot.position.copy(dir.multiplyScalar(reach / Math.sin(MathUtils.degToRad(FOV / 2))));
      shot.lookAt(new Vector3(0, 0, 0.25));
      shot.updateProjectionMatrix();

      const size = gl.getSize(new Vector2());
      const dpr = gl.getPixelRatio();
      const stars = scene.getObjectsByProperty('name', 'stars');
      stars.forEach((o) => (o.visible = false));
      gl.setPixelRatio(1);
      gl.setSize(SIZE, SIZE, false);
      gl.render(scene, shot);
      const copy = document.createElement('canvas');
      copy.width = copy.height = SIZE;
      copy.getContext('2d')?.drawImage(gl.domElement, 0, 0);
      stars.forEach((o) => (o.visible = true));
      gl.setPixelRatio(dpr);
      gl.setSize(size.x, size.y, false);
      gl.render(scene, camera);
      return copy;
    };
    return () => {
      captureRef.current = null;
    };
  }, [captureRef, gl, scene, camera, geo]);

  useFrame(({ clock: real }, dt) => {
    const c = clock.current;
    if (c.t < SEQ.end) {
      // Si el móvil se atasca un momento (menos de 10 fotogramas por segundo), la animación no da saltos.
      const step = Math.min(dt, 0.1) / Math.max(speed, 0.01);
      c.t = Math.min(SEQ.end, c.t + step * (skipping.current ? 7 : 1));
    }
    if (c.t >= SEQ.end && c.doneAt === null) c.doneAt = real.elapsedTime;
    if (!done.current && c.t >= SEQ.end) {
      done.current = true;
      onDoneRef.current();
    }
  });

  return (
    <ClockContext.Provider value={clock}>
      <GeoContext.Provider value={geo}>
      <ViewContext.Provider value={view}>
      <CameraRig slot={slotRef} />
      <hemisphereLight args={['#dfe9ff', '#2a1f2e', 1.15]} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={2.3}
        color="#fff0d8"
        castShadow={q.shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0006}
      />
      <directionalLight position={[-6, 4, -7]} intensity={0.8} color="#9cc4ff" />

      {stars && <Stars count={q.stars} />}
      <Burst />
      <Controls onPick={(hex) => onPickRef.current(hex)}>
        <Aura radius={seaRadius(geo)} />
        <Sea shadows={q.shadows} radius={seaRadius(geo)} />
        <Island board={board} showPips={showPips} numberStyle={numberStyle} highlight={highlight} decor={q.decor} shadows={q.shadows} fontsVersion={fontsVersion} />
        <Ports board={board} fontsVersion={fontsVersion} shadows={q.shadows} />
        {board.robber !== null && <Robber hex={board.robber} shadows={q.shadows} />}
      </Controls>
      </ViewContext.Provider>
      </GeoContext.Provider>
    </ClockContext.Provider>
  );
}

/**
 * Cámara: empieza muy lejos y casi desde arriba (la isla parece un planeta),
 * se acerca girando y al final se inclina para ver el relieve.
 * El lienzo ocupa toda la pantalla; sin zoom, la isla se encaja en el hueco libre (`slot`).
 */
function CameraRig({ slot }: { slot?: RefObject<HTMLElement | null> }) {
  const clock = useClock();
  const view = useView();
  const half = boardHalf(useGeo());
  const frame = useRef<{ cy: number; w: number; h: number } | null>(null);
  useFrame(({ camera, size, clock: real }, dt) => {
    const { t, doneAt } = clock.current;
    const cam = camera as PerspectiveCamera;
    const W = Math.max(size.width, 1);
    const H = Math.max(size.height, 1);
    const step = Math.min(dt, 0.1);

    // Hueco libre (si cambia, por ejemplo al abrir el análisis, la isla se recoloca poco a poco).
    const r = slot?.current?.getBoundingClientRect();
    const want = r && r.height > 40 ? { cy: r.top + r.height / 2 - size.top, w: Math.min(r.width, W), h: Math.min(r.height, H) } : { cy: H / 2, w: W, h: H };
    const f = frame.current ?? { ...want };
    const kf = frame.current ? 1 - Math.exp(-step * 6) : 1;
    f.cy += (want.cy - f.cy) * kf;
    f.w += (want.w - f.w) * kf;
    f.h += (want.h - f.h) * kf;
    frame.current = f;
    // El centro de la vista baja o sube hasta el centro del hueco.
    cam.setViewOffset(W, H, 0, H / 2 - f.cy, W, H);

    const tanV = Math.tan(MathUtils.degToRad(FOV / 2));
    const vHalf = Math.atan((tanV * f.h) / H);
    const hHalf = Math.atan((tanV * f.w) / H);
    // Distancia para que quepa todo el tablero a lo ancho y a lo alto del hueco.
    const fit = Math.max(half.w / Math.sin(hHalf), half.h / Math.sin(vHalf));

    const approach = ease.outQuart(progress(t, SEQ.approach));
    const tilt = ease.inOutCubic(progress(t, SEQ.tilt));
    const swing = ease.outCubic(progress(t, SEQ.swing));
    // Ya quieta, la cámara se balancea muy poco para que la escena no parezca una foto.
    const idle = doneAt === null ? 0 : 0.035 * Math.sin((real.elapsedTime - doneAt) * 0.25);

    // Zoom y desplazamiento, suaves (como un vuelo corto); con el dedo encima, casi al instante.
    const v = view.current;
    const k = 1 - Math.exp(-step * (v.live ? 18 : 4.5));
    v.x += (v.tx - v.x) * k;
    v.z += (v.tz - v.z) * k;
    v.zoom += (v.tzoom - v.zoom) * k;
    v.fit = fit;

    const dist = lerp(fit * 4.5, fit, approach) * v.zoom;
    v.dist = dist;
    placeCamera(cam, v.x, v.z, v.zoom, dist, lerp(84, FINAL_ELEV, tilt), lerp(-1.1, 0, swing) + idle);
  });
  return null;
}

/**
 * Gestos, cuando ya ha terminado la animación:
 * - Tocar un hexágono: la cámara vuela hasta él. Tocar el mar: vuelve a la vista completa.
 * - Pellizcar con dos dedos: zoom hacia donde están los dedos (y se puede mover a la vez).
 * - Arrastrar: con zoom, el mapa sigue al dedo; sin zoom, gira un poco la isla y al soltar vuelve a su sitio.
 */
function Controls({ children, onPick }: { children: ReactNode; onPick: (hex: number | null) => void }) {
  const clock = useClock();
  const view = useView();
  const geo = useGeo();
  const ref = useRef<Group>(null);
  const { gl, camera } = useThree();
  const target = useRef({ x: 0, y: 0 });
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    // Gesto de un dedo: dónde empezó y si se ha movido (para distinguir un toque de un arrastre).
    let one: { x: number; y: number; time: number; moved: boolean } | null = null;
    let pinch: { d: number; zoom: number } | null = null;
    // Punto de la isla que estaba bajo los dedos al empezar: se mantiene bajo los dedos.
    let anchor: Vector3 | null = null;
    const ray = new Raycaster();
    const ground = new Plane(new Vector3(0, 1, 0), -TOP);

    const spread = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const centroid = () => {
      const all = [...pointers.values()];
      return { x: all.reduce((s, p) => s + p.x, 0) / all.length, y: all.reduce((s, p) => s + p.y, 0) / all.length };
    };

    /** Punto del suelo de la isla bajo un punto de la pantalla, visto con la cámara `cam`. */
    const groundAt = (cam: PerspectiveCamera, x: number, y: number): Vector3 | null => {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), cam);
      return ray.ray.intersectPlane(ground, new Vector3());
    };
    /** Cámara de prueba, ya quieta, mirando a (x, z) con ese zoom. */
    const probe = (x: number, z: number, zoom: number) => {
      const cam = (camera as PerspectiveCamera).clone();
      placeCamera(cam, x, z, zoom, view.current.fit * zoom, FINAL_ELEV, 0);
      cam.updateMatrixWorld();
      return cam;
    };

    const startAnchor = () => {
      const v = view.current;
      const c = centroid();
      anchor = groundAt(probe(v.tx, v.tz, v.tzoom), c.x, c.y);
    };

    /** Coloca el objetivo de la cámara para que el punto ancla quede bajo los dedos con este zoom. */
    const follow = (zoom: number) => {
      const v = view.current;
      v.tzoom = zoom;
      if (!anchor) return;
      const c = centroid();
      const p = groundAt(probe(0, 0, zoom), c.x, c.y);
      if (!p) return;
      let nx = anchor.x - p.x;
      let nz = anchor.z - p.z;
      // Cuanto menos zoom, menos se puede mover (sin zoom, la isla vuelve al centro).
      const max = PAN_MAX * Math.min(1, (1 - zoom) / 0.35);
      const len = Math.hypot(nx, nz);
      if (len > max) {
        nx *= max / len;
        nz *= max / len;
      }
      v.tx = nx;
      v.tz = nz;
    };

    const pick = (e: PointerEvent) => {
      const hit = groundAt(camera as PerspectiveCamera, e.clientX, e.clientY);
      let hex: number | null = null;
      if (hit) {
        let best = 0.95;
        geo.hexes.forEach((h, id) => {
          const d = Math.hypot(h.x - hit.x, h.y - hit.z);
          if (d < best) {
            best = d;
            hex = id;
          }
        });
      }
      flyTo(view.current, hex, geo);
      onPickRef.current(hex);
    };

    const down = (e: PointerEvent) => {
      if (clock.current.doneAt === null) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try {
        el.setPointerCapture?.(e.pointerId);
      } catch {
        // Sin captura, el gesto funciona igual mientras el dedo siga sobre el tablero.
      }
      if (pointers.size === 1) {
        one = { x: e.clientX, y: e.clientY, time: performance.now(), moved: false };
        startAnchor();
      } else if (pointers.size === 2) {
        one = null;
        target.current = { x: 0, y: 0 };
        pinch = { d: spread(), zoom: view.current.tzoom };
        view.current.live = true;
        startAnchor();
      }
    };

    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const v = view.current;
      if (pinch && pointers.size >= 2) {
        follow(MathUtils.clamp((pinch.zoom * pinch.d) / Math.max(spread(), 1), ZOOM_MIN, 1));
        return;
      }
      if (!one) return;
      const dx = e.clientX - one.x;
      const dy = e.clientY - one.y;
      if (!one.moved && Math.hypot(dx, dy) < 8) return;
      one.moved = true;
      if (v.tzoom < 0.95) {
        // Con zoom: el mapa sigue al dedo.
        v.live = true;
        follow(v.tzoom);
      } else {
        target.current.y = MathUtils.clamp(dx * 0.006, -0.7, 0.7);
        target.current.x = MathUtils.clamp(dy * 0.004, -0.25, 0.35);
      }
    };

    const up = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (one && !one.moved && performance.now() - one.time < 400 && e.type === 'pointerup') pick(e);
      one = null;
      if (pinch && pointers.size < 2) {
        pinch = null;
        if (view.current.tzoom > 0.92) {
          // Si se aleja del todo, vuelve a la vista completa (y se cierra la tarjeta del hexágono).
          flyTo(view.current, null, geo);
          onPickRef.current(null);
        } else if (pointers.size === 1) {
          // Queda un dedo: sigue moviendo el mapa desde donde está.
          const [p] = [...pointers.values()];
          one = { x: p.x, y: p.y, time: 0, moved: true };
          startAnchor();
        }
      }
      if (pointers.size === 0) {
        target.current = { x: 0, y: 0 };
        anchor = null;
        view.current.live = false;
      }
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [gl, camera, clock, view, geo]);

  useFrame(({ clock: real }, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = 1 - Math.exp(-dt * 7);
    g.rotation.x += (target.current.x - g.rotation.x) * k;
    g.rotation.y += (target.current.y - g.rotation.y) * k;
    // Ya quieta, flota muy despacio, como si respirase.
    const doneAt = clock.current.doneAt;
    if (doneAt !== null) {
      const since = real.elapsedTime - doneAt;
      g.position.y = 0.05 * Math.min(1, since / 1.5) * Math.sin(since * 0.9);
    }
  });

  return <group ref={ref}>{children}</group>;
}
