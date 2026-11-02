import { useEffect, useRef, useState } from 'react';
import { tokens } from '../tokens';

const { ease } = tokens;

/**
 * Drives a scripted card: returns the current step (0..length) and a ref for
 * the card. Plays only while the card is on screen, holds on the last step,
 * then loops. With reduced motion it sits on the final step.
 */
export function useScript(length: number, { stepMs = 1600, firstMs = 900, holdMs = 4500, delayFor }: { stepMs?: number; firstMs?: number; holdMs?: number; delayFor?: (step: number) => number } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [step, setStep] = useState(0);
  const [loop, setLoop] = useState(0);

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(q.matches);
    const on = () => setReduced(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !visible) return;
    const atEnd = step >= length;
    const wait = atEnd ? holdMs : step === 0 ? firstMs : (delayFor?.(step) ?? stepMs);
    const t = setTimeout(() => {
      if (atEnd) {
        setStep(0);
        setLoop((n) => n + 1);
      } else setStep(step + 1);
    }, wait);
    return () => clearTimeout(t);
  }, [step, visible, reduced, length, stepMs, firstMs, holdMs, delayFor]);

  return { ref, step: reduced ? length : step, reduced, loop };
}

/** Fades a value in whenever it changes (keyed remount). */
export const tickIn = {
  animation: `tickIn 400ms ${ease.out}`,
  '@keyframes tickIn': { from: { opacity: 0, transform: 'translateY(-4px)' }, to: { opacity: 1, transform: 'none' } },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
} as const;
