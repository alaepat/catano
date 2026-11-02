// Estructura de la app: fondo elegido detrás y la pantalla actual delante, con transiciones suaves.
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Ajustes } from './app/Ajustes';
import { Inicio } from './app/Inicio';
import { MisTableros } from './app/MisTableros';
import { Personalizar } from './app/Personalizar';
import { Tablero } from './app/Tablero';
import { Background } from './components/Background';
import { backgroundFor } from './lib/background';
import { useApp, type Screen } from './store';
import './styles/app.css';

const SCREENS: Record<Screen, () => React.JSX.Element | null> = {
  inicio: Inicio,
  personalizar: Personalizar,
  tablero: Tablero,
  ajustes: Ajustes,
  tableros: MisTableros,
};

/** Profundidad de cada pantalla: al ir "hacia dentro" se desliza desde la derecha, al volver, desde la izquierda. */
const DEPTH: Record<Screen, number> = { inicio: 0, ajustes: 1, personalizar: 1, tableros: 1, tablero: 2 };

export default function App() {
  const screen = useApp((s) => s.screen);
  const previous = useRef<Screen>(screen);
  useEffect(() => {
    previous.current = screen;
  }, [screen]);
  const background = useApp((s) => backgroundFor(s.screen, s.settings));
  const setScreenFromHistory = useApp((s) => s.setScreenFromHistory);

  // El botón "atrás" del móvil vuelve a la pantalla anterior en vez de salir de la app.
  useEffect(() => {
    try {
      window.history.replaceState({ screen: 'inicio' }, '');
    } catch {
      /* sin historial */
    }
    const onPop = (e: PopStateEvent) => setScreenFromHistory((e.state?.screen as Screen) ?? 'inicio');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setScreenFromHistory]);

  const direction = DEPTH[screen] >= DEPTH[previous.current] ? 1 : -1;
  const Current = SCREENS[screen];

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false}>
        <Background key={background} id={background} />
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.main
          key={screen}
          className="screen-host"
          custom={direction}
          variants={{
            enter: (dir: number) => ({ opacity: 0, x: screen === 'inicio' ? 0 : 28 * dir }),
            center: { opacity: 1, x: 0 },
            exit: (dir: number) => ({ opacity: 0, x: -20 * dir }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        >
          <Current />
        </motion.main>
      </AnimatePresence>
    </MotionConfig>
  );
}
