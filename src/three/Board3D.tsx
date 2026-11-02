// Escena 3D del tablero: la isla aparece en el espacio con la secuencia "épica" (timeline.ts).
// Se carga aparte (lazy) para que la app arranque rápido; si falla, Tablero muestra el 2D.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { MathUtils, Vector2, Vector3, type Group, type PerspectiveCamera } from 'three';
import type { Board } from '../game';
import { playSequence, playSound } from '../lib/sound';
import type { Quality } from '../store';
import { ClockContext, useClock, type Clock } from './clock';
import { SEA_R } from './coords';
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

function Scene({ board, speed, skip, showPips, highlight, quality, stars, sound, captureRef, onDone, fontsVersion }: Board3DProps & { fontsVersion: number }) {
  const q = QUALITY[quality];
  const clock = useRef<Clock>({ t: speed > 0 ? 0 : SEQ.end, doneAt: null });
  const done = useRef(speed <= 0);
  const skipping = useRef(skip);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    skipping.current = skip;
    onDoneRef.current = onDone;
  });

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
      <DragTilt>
        <Aura />
        <Sea shadows={q.shadows} />
        <Island board={board} showPips={showPips} highlight={highlight} decor={q.decor} shadows={q.shadows} fontsVersion={fontsVersion} />
        <Ports ports={board.ports} fontsVersion={fontsVersion} shadows={q.shadows} />
        {board.robber !== null && <Robber hex={board.robber} shadows={q.shadows} />}
      </DragTilt>
    </ClockContext.Provider>
  );
}

/**
 * Cámara: empieza muy lejos y casi desde arriba (la isla parece un planeta),
 * se acerca girando y al final se inclina para ver el relieve. Se ajusta al tamaño de la pantalla.
 */
function CameraRig() {
  const clock = useClock();
  useFrame(({ camera, size, clock: real }) => {
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

    const dist = lerp(fit * 4.5, fit, approach);
    const elev = MathUtils.degToRad(lerp(84, 54, tilt));
    const azim = lerp(-1.1, 0, swing) + idle;

    cam.position.set(dist * Math.cos(elev) * Math.sin(azim), dist * Math.sin(elev), dist * Math.cos(elev) * Math.cos(azim));
    cam.lookAt(0, 0, 0.25);
  });
  return null;
}

/**
 * Al terminar la animación se puede girar un poco la isla con el dedo;
 * al soltar vuelve suavemente a su sitio (como en las fichas de producto de Apple).
 */
function DragTilt({ children }: { children: ReactNode }) {
  const clock = useClock();
  const ref = useRef<Group>(null);
  const gl = useThree((s) => s.gl);
  const target = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (clock.current.doneAt === null) return;
      drag.current = { x: e.clientX, y: e.clientY };
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      target.current.y = MathUtils.clamp((e.clientX - drag.current.x) * 0.006, -0.7, 0.7);
      target.current.x = MathUtils.clamp((e.clientY - drag.current.y) * 0.004, -0.25, 0.35);
    };
    const up = () => {
      drag.current = null;
      target.current = { x: 0, y: 0 };
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
  }, [gl, clock]);

  useFrame(({ clock: real }, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = 1 - Math.exp(-dt * (drag.current ? 14 : 5));
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
