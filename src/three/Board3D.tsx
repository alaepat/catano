// Escena 3D del tablero: la isla aparece en el espacio con la secuencia "épica" (timeline.ts).
// Se carga aparte (lazy) para que la app arranque rápido; si falla, Tablero muestra el 2D.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { MathUtils, Plane, Raycaster, Vector2, Vector3, type Group, type PerspectiveCamera } from 'three';
import { HEXES } from '../game';
import type { Board } from '../game';
import { playSequence, playSound } from '../lib/sound';
import type { Quality } from '../store';
import { ClockContext, useClock, type Clock } from './clock';
import { SEA_R, TOP } from './coords';
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
  /** Distancia real de la cámara (para convertir píxeles en distancia al arrastrar). */
  dist: number;
}

const ViewContext = createContext<RefObject<View> | null>(null);
const useView = () => useContext(ViewContext)!;

function flyTo(v: View, hex: number | null) {
  if (hex === null) {
    v.tx = v.tz = 0;
    v.tzoom = 1;
  } else {
    v.tx = HEXES[hex].x;
    // Un poco por debajo del hexágono: así queda más arriba en pantalla, lejos de la tarjeta.
    v.tz = HEXES[hex].y + 0.5;
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
  /** Aquí la escena deja una función que hace una foto del tablero tal como se ve. */
  captureRef?: RefObject<(() => HTMLCanvasElement) | null>;
  onDone: () => void;
  onFail: () => void;
}

/** Espera a que estén las tipografías para dibujar bien los números de las fichas. */
function useFontsVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    const fonts = document.fonts;
    if (!fonts) return;
    Promise.all([fonts.load('700 100px Fraunces'), fonts.load('800 50px Nunito')])
      .then(() => alive && setVersion(1))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return version;
}

export default function Board3D(props: Board3DProps) {
  const q = QUALITY[props.quality];
  const fontsVersion = useFontsVersion();
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

function Scene({ board, speed, skip, showPips, highlight, quality, stars, sound, captureRef, onDone, focus, onPick, fontsVersion }: Board3DProps & { fontsVersion: number }) {
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
  const view = useRef<View>({ x: 0, z: 0, zoom: 1, tx: 0, tz: 0, tzoom: 1, dist: 0 });
  useEffect(() => flyTo(view.current, focus), [focus]);

  // Sonidos: se programan todos al empezar; si se salta la animación, se cortan y suena el acorde final.
  const stopSound = useRef<() => void>(() => {});
  useEffect(() => {
    if (!sound) return;
    if (speed <= 0) {
      playSound('chord');
      return;
    }
    const numbered = board.numbers.flatMap((n, id) => (n == null ? [] : [id]));
    stopSound.current = playSequence(soundTimeline(numbered, board.ports.length, board.robber !== null, speed));
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
      shot.aspect = 1;
      const reach = SEA_R * 1.45;
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
  }, [captureRef, gl, scene, camera]);

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
      <ViewContext.Provider value={view}>
      <CameraRig />
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
        <Aura />
        <Sea shadows={q.shadows} />
        <Island board={board} showPips={showPips} highlight={highlight} decor={q.decor} shadows={q.shadows} fontsVersion={fontsVersion} />
        <Ports ports={board.ports} fontsVersion={fontsVersion} shadows={q.shadows} />
        {board.robber !== null && <Robber hex={board.robber} shadows={q.shadows} />}
      </Controls>
      </ViewContext.Provider>
    </ClockContext.Provider>
  );
}

/**
 * Cámara: empieza muy lejos y casi desde arriba (la isla parece un planeta),
 * se acerca girando y al final se inclina para ver el relieve. Se ajusta al tamaño de la pantalla.
 */
function CameraRig() {
  const clock = useClock();
  const view = useView();
  useFrame(({ camera, size, clock: real }, dt) => {
    const { t, doneAt } = clock.current;
    const cam = camera as PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    const vHalf = MathUtils.degToRad(FOV / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const R = SEA_R + 0.15;
    // Distancia para que quepa todo el mar a lo ancho y a lo alto.
    const fit = Math.max(R / Math.sin(hHalf), (R * 0.8) / Math.sin(vHalf));

    const approach = ease.outQuart(progress(t, SEQ.approach));
    const tilt = ease.inOutCubic(progress(t, SEQ.tilt));
    const swing = ease.outCubic(progress(t, SEQ.swing));
    // Ya quieta, la cámara se balancea muy poco para que la escena no parezca una foto.
    const idle = doneAt === null ? 0 : 0.035 * Math.sin((real.elapsedTime - doneAt) * 0.25);

    // Zoom y desplazamiento, suaves (como un vuelo corto).
    const v = view.current;
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 4.5);
    v.x += (v.tx - v.x) * k;
    v.z += (v.tz - v.z) * k;
    v.zoom += (v.tzoom - v.zoom) * k;

    const dist = lerp(fit * 4.5, fit, approach) * v.zoom;
    v.dist = dist;
    const elev = MathUtils.degToRad(lerp(84, 54, tilt));
    const azim = lerp(-1.1, 0, swing) + idle;
    // De cerca se mira a la cara de arriba de las fichas, no a la base.
    const lookY = TOP * (1 - v.zoom);
    const lx = v.x;
    const lz = v.z + 0.25 * v.zoom;

    cam.position.set(lx + dist * Math.cos(elev) * Math.sin(azim), lookY + dist * Math.sin(elev), lz + dist * Math.cos(elev) * Math.cos(azim));
    cam.lookAt(lx, lookY, lz);
  });
  return null;
}

/**
 * Gestos, cuando ya ha terminado la animación:
 * - Tocar un hexágono: la cámara vuela hasta él. Tocar el mar: vuelve a la vista completa.
 * - Pellizcar con dos dedos: zoom libre.
 * - Arrastrar: con zoom, mueve el mapa; sin zoom, gira un poco la isla y al soltar vuelve a su sitio.
 */
function Controls({ children, onPick }: { children: ReactNode; onPick: (hex: number | null) => void }) {
  const clock = useClock();
  const view = useView();
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
    // Gesto de un dedo: dónde empezó, si se ha movido y desde dónde se arrastra el mapa.
    let one: { x: number; y: number; time: number; moved: boolean; tx: number; tz: number } | null = null;
    let pinch: { d: number; zoom: number } | null = null;
    const ray = new Raycaster();
    const ground = new Plane(new Vector3(0, 1, 0), -TOP);
    const hit = new Vector3();

    const spread = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const pick = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      let hex: number | null = null;
      if (ray.ray.intersectPlane(ground, hit)) {
        let best = 0.95;
        HEXES.forEach((h, id) => {
          const d = Math.hypot(h.x - hit.x, h.y - hit.z);
          if (d < best) {
            best = d;
            hex = id;
          }
        });
      }
      flyTo(view.current, hex);
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
        one = { x: e.clientX, y: e.clientY, time: performance.now(), moved: false, tx: view.current.tx, tz: view.current.tz };
      } else if (pointers.size === 2) {
        one = null;
        target.current = { x: 0, y: 0 };
        pinch = { d: spread(), zoom: view.current.tzoom };
      }
    };

    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const v = view.current;
      if (pinch && pointers.size >= 2) {
        v.tzoom = MathUtils.clamp((pinch.zoom * pinch.d) / Math.max(spread(), 1), ZOOM_MIN, 1);
        return;
      }
      if (!one) return;
      const dx = e.clientX - one.x;
      const dy = e.clientY - one.y;
      if (!one.moved && Math.hypot(dx, dy) < 8) return;
      one.moved = true;
      if (v.tzoom < 0.95) {
        // Con zoom: el mapa sigue al dedo.
        const perPx = (2 * v.dist * Math.tan(MathUtils.degToRad(FOV / 2))) / Math.max(el.clientHeight, 1);
        const nx = one.tx - dx * perPx;
        const nz = one.tz - (dy * perPx) / Math.sin(MathUtils.degToRad(54));
        const len = Math.hypot(nx, nz);
        const k = len > PAN_MAX ? PAN_MAX / len : 1;
        v.tx = nx * k;
        v.tz = nz * k;
      } else {
        target.current.y = MathUtils.clamp(dx * 0.006, -0.7, 0.7);
        target.current.x = MathUtils.clamp(dy * 0.004, -0.25, 0.35);
      }
    };

    const up = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (one && !one.moved && performance.now() - one.time < 400 && e.type === 'pointerup') pick(e);
      if (pinch && pointers.size < 2) {
        pinch = null;
        // Si se aleja del todo, vuelve a la vista completa (y se cierra la tarjeta del hexágono).
        if (view.current.tzoom > 0.92) {
          flyTo(view.current, null);
          onPickRef.current(null);
        }
      }
      one = null;
      if (pointers.size === 0) target.current = { x: 0, y: 0 };
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
  }, [gl, camera, clock, view]);

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
