import { useCallback, useEffect, useRef, useState } from 'react';

export type Scene = 'now' | 'today';
const fromHash = (): Scene => ['#today', '#replay'].includes(window.location.hash) ? 'today' : 'now';

export function useSceneNavigation(effects: boolean) {
  const [scene, setScene] = useState<Scene>(fromHash);
  const [destination, setDestination] = useState<Scene>(scene);
  const [phase, setPhase] = useState<'idle' | 'closing' | 'opening'>('idle');
  const current = useRef(scene);
  const target = useRef(scene);
  const moving = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; }, []);
  const change = useCallback((next: Scene, focusContent = false) => {
    if (moving.current && next === target.current) return;
    clear();
    target.current = next;
    setDestination(next);
    const apply = () => {
      current.current = next;
      setScene(next);
      if (focusContent) requestAnimationFrame(() => document.getElementById(`scene-${next}`)?.focus());
    };
    if (!effects || next === current.current) {
      moving.current = false; apply(); setPhase('idle'); return;
    }
    moving.current = true;
    setPhase('closing');
    timers.current = [
      setTimeout(() => { apply(); setPhase('opening'); }, 110),
      setTimeout(() => { moving.current = false; setPhase('idle'); }, 320),
    ];
  }, [clear, effects]);
  const navigate = useCallback((next: Scene, focusContent = false) => {
    if (window.location.hash !== `#${next}`) window.history.pushState(window.history.state, '', `#${next}`);
    change(next, focusContent);
  }, [change]);
  useEffect(() => {
    const sync = () => change(fromHash(), !!document.activeElement?.closest('.scene-panel'));
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
  }, [change]);
  useEffect(() => {
    if (!effects) { clear(); moving.current = false; current.current = target.current; setScene(target.current); setPhase('idle'); }
  }, [clear, effects]);
  useEffect(() => clear, [clear]);
  return { scene, destination, phase, navigate };
}
