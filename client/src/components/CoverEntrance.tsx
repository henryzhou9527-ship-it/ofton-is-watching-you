import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { entranceCanClose, entranceSwipe, ENTRANCE_MAX_MS, ENTRANCE_MIN_MS } from '@/lib/entrance';

interface Props {
  ready: boolean;
  effects: boolean;
  target: RefObject<HTMLButtonElement | null>;
  onDone: () => void;
}

export default function CoverEntrance({ ready, effects, target, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const picture = useRef<HTMLImageElement>(null);
  const [artReady, setArtReady] = useState(false);
  const [closing, setClosing] = useState(false);
  const started = useRef(performance.now());
  const touch = useRef<{ x: number; y: number } | null>(null);
  const dismiss = useCallback(() => setClosing(true), []);

  useEffect(() => {
    if (picture.current?.complete && picture.current.naturalWidth) setArtReady(true);
  }, []);
  useEffect(() => {
    if (closing) return;
    const check = () => {
      if (entranceCanClose(performance.now() - started.current, ready, artReady)) dismiss();
    };
    check();
    const elapsed = performance.now() - started.current;
    const minimum = setTimeout(check, Math.max(0, ENTRANCE_MIN_MS - elapsed));
    const maximum = setTimeout(dismiss, Math.max(0, ENTRANCE_MAX_MS - elapsed));
    return () => { clearTimeout(minimum); clearTimeout(maximum); };
  }, [ready, artReady, closing, dismiss]);

  useEffect(() => {
    if (!effects) onDone();
  }, [effects, onDone]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      if (event.deltaY > 30 && event.deltaY > Math.abs(event.deltaX)) dismiss();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'PageDown') { event.preventDefault(); dismiss(); }
    };
    const finish = () => onDone();
    // A resize or hidden tab must not leave a flight aimed at stale coordinates.
    window.addEventListener('resize', finish);
    const hidden = () => { if (document.hidden) finish(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('keydown', key);
    element.addEventListener('wheel', wheel, { passive: true });
    return () => {
      window.removeEventListener('resize', finish);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('keydown', key);
      element.removeEventListener('wheel', wheel);
    };
  }, [dismiss, onDone]);

  useEffect(() => {
    if (!closing) return;
    const element = art.current;
    const destination = target.current;
    if (!element || !destination || !artReady || !effects) { onDone(); return; }
    const from = element.getBoundingClientRect();
    const to = destination.getBoundingClientRect();
    if (!to.width || !to.height) { onDone(); return; }
    const dx = to.x + to.width / 2 - from.x - from.width / 2;
    const dy = to.y + to.height / 2 - from.y - from.height / 2;
    const animation = element.animate([
      { transform: 'translate3d(0,0,0) scale(1)' },
      { transform: `translate3d(${dx}px,${dy}px,0) scale(${to.width / from.width})` },
    ], { duration: 860, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
    animation.onfinish = onDone;
    const fallback = setTimeout(onDone, 1000);
    return () => { animation.onfinish = null; animation.cancel(); clearTimeout(fallback); };
  }, [closing, target, artReady, effects, onDone]);

  return <div ref={root} className={`cover-entrance ${closing ? 'is-closing' : ''}`} aria-label="开场" onTouchStart={event => {
    touch.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }} onTouchMove={event => { if (event.touches.length !== 1) touch.current = null; }} onTouchCancel={() => { touch.current = null; }} onTouchEnd={event => {
    const start = touch.current; touch.current = null;
    if (!start || event.touches.length || !event.changedTouches[0] || (window.visualViewport?.scale ?? 1) > 1.01) return;
    const end = event.changedTouches[0];
    if (entranceSwipe(end.clientX - start.x, end.clientY - start.y)) dismiss();
  }}>
    <div className="entrance-backdrop" aria-hidden="true" />
    <div className="entrance-type" aria-hidden="true"><strong>お布団巻き</strong><span>is watching you</span></div>
    <div ref={art} className={`entrance-art ${artReady ? 'art-ready' : ''}`} aria-hidden="true">
      <img ref={picture} src={`${import.meta.env.BASE_URL}art/monitoring-juan-cover.png`} alt="" fetchPriority="high" onLoad={() => setArtReady(true)} onError={dismiss} />
    </div>
    <div className="entrance-bottom"><span className="entrance-connection" role="status"><i />{ready ? '来啦' : '连接中'}</span><button type="button" onClick={dismiss} aria-label="跳过开场，进入网站">进入<ArrowUpRight size={20} aria-hidden="true" /></button></div>
  </div>;
}
