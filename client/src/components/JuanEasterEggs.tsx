import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { eggPosition, JUAN_EGGS, nextEgg } from '@/lib/juan-eggs';

const LIFETIME_MS = 2800;
type Visit = { sequence: number; index: number; left: number; top: number; size: number; phase: 'entering' | 'arriving' | 'holding' | 'leaving' };

export default function JuanEasterEggs({ enabled }: { enabled: boolean }) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const deck = useRef<number[]>([]);
  const previous = useRef<number | null>(null);
  const lastShown = useRef(0);
  const busy = useRef(false);
  const sequence = useRef(0);
  const preloaded = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitions = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!enabled || preloaded.current) return;
    const preload = () => {
      preloaded.current = true;
      const sprites = ['juan-chibi-atlas.png', ...JUAN_EGGS.flatMap(egg => 'sprite' in egg ? [egg.sprite] : [])];
      sprites.forEach(sprite => { const image = new Image(); image.src = `${import.meta.env.BASE_URL}art/${sprite}`; });
    };
    if (typeof window.requestIdleCallback === 'function') {
      const request = window.requestIdleCallback(preload, { timeout: 1500 });
      return () => window.cancelIdleCallback(request);
    }
    const request = window.setTimeout(preload, 900);
    return () => window.clearTimeout(request);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) { setVisit(null); setAnnouncement(''); busy.current = false; return; }
    const dismiss = () => {
      if (timer.current) clearTimeout(timer.current);
      transitions.current.forEach(clearTimeout);
      transitions.current = [];
      timer.current = null;
      busy.current = false;
      setVisit(null);
      setAnnouncement('');
    };
    const show = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || document.hidden) return;
      if (target.closest('input,textarea,select,[contenteditable="true"]')) return;
      const trigger = target.closest<HTMLElement>('[data-egg-trigger]');
      if (!trigger || !trigger.closest('.next-shell')) return;
      const now = Date.now();
      const direct = trigger.dataset.eggTrigger === 'direct';
      if (busy.current || now - lastShown.current < (direct ? 1200 : 15000)) return;
      if (!direct && Math.random() > .22) return;
      const bounds = trigger.getBoundingClientRect();
      const point = event.detail === 0 ? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 } : { x: event.clientX, y: event.clientY };
      const index = nextEgg(deck.current, previous.current);
      previous.current = index;
      lastShown.current = now;
      busy.current = true;
      const position = eggPosition(JUAN_EGGS[index]!.place, point, { width: document.documentElement.clientWidth, height: window.innerHeight });
      const id = ++sequence.current;
      setVisit({ sequence: id, index, ...position, phase: 'entering' });
      transitions.current = [
        setTimeout(() => setVisit(current => current?.sequence === id ? { ...current, phase: 'arriving' } : current), 32),
        setTimeout(() => setVisit(current => current?.sequence === id ? { ...current, phase: 'holding' } : current), 380),
        setTimeout(() => setVisit(current => current?.sequence === id ? { ...current, phase: 'leaving' } : current), 2400),
      ];
      setAnnouncement(JUAN_EGGS[index]!.announcement);
      timer.current = setTimeout(dismiss, LIFETIME_MS);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    const onVisibility = () => { if (document.hidden) dismiss(); };
    document.addEventListener('click', show, { passive: true });
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', dismiss, { passive: true });
    return () => {
      document.removeEventListener('click', show);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', dismiss);
      if (timer.current) clearTimeout(timer.current);
      transitions.current.forEach(clearTimeout);
      transitions.current = [];
      busy.current = false;
    };
  }, [enabled]);

  const egg = visit ? JUAN_EGGS[visit.index] : null;
  const sprite = egg && 'sprite' in egg ? egg.sprite : null;
  return createPortal(<>
    <div className="egg-announcement" role="status" aria-live="polite">{enabled ? announcement : ''}</div>
    {enabled && visit && egg && <div className="juan-overlay" aria-hidden="true"><div key={visit.sequence} className={`juan-guest juan-${egg.motion}`} data-egg-id={egg.id} data-phase={visit.phase} style={{
      left: visit.left, top: visit.top, '--guest-size': `${visit.size}px`, '--guest-duration': `${LIFETIME_MS}ms`,
      opacity: visit.phase === 'entering' || visit.phase === 'leaving' ? 0 : 1,
      transform: visit.phase === 'arriving' || visit.phase === 'holding' ? 'translate(0, 0) scale(1)' : undefined,
      transition: visit.phase === 'holding' ? 'none' : undefined,
    } as CSSProperties}>
      <div className="juan-sprite" style={sprite ? { backgroundImage: `url("${import.meta.env.BASE_URL}art/${sprite}")`, backgroundSize: 'contain', backgroundPosition: 'center' } : { backgroundImage: `url("${import.meta.env.BASE_URL}art/juan-chibi-atlas.png")`, backgroundPosition: `${(egg.pose % 5) * 25}% ${Math.floor(egg.pose / 5) * 100}%` }} />
      {egg.caption && <span className="juan-whisper">{egg.caption}</span>}
      {egg.motion === 'wave' && <span className="juan-twinkle">✧</span>}
    </div></div>}
  </>, document.body);
}
