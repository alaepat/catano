// Aviso cuando se consigue un logro (en cualquier pantalla): vibración corta y, con sonido, un acorde.
import { useEffect, useRef } from 'react';
import { haptic } from '../lib/haptics';
import { playSound } from '../lib/sound';
import { useLogros } from '../logrosStore';
import { useApp } from '../store';
import { Toast } from './ui';

export function LogroToast() {
  const queue = useLogros((s) => s.queue);
  const clearQueue = useLogros((s) => s.clearQueue);
  const sound = useApp((s) => s.settings.sound);
  const seen = useRef(0);

  useEffect(() => {
    if (queue.length > seen.current) {
      haptic(15);
      if (sound) playSound('chord');
    }
    seen.current = queue.length;
  }, [queue.length, sound]);

  return <Toast messages={queue.map((t) => `Logro conseguido: ${t}`)} onDone={clearQueue} />;
}
