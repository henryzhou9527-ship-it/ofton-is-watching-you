import { memo, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';

function NightPortrait({ effects, target }: { effects: boolean; target: RefObject<HTMLButtonElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [knocks, setKnocks] = useState(0);
  const [peek, setPeek] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerFrame = useRef<number | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current);
  }, []);
  useEffect(() => {
    if (!effects) {
      if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current);
      pointerFrame.current = null;
      ref.current?.style.setProperty('--look-x', '0px');
      ref.current?.style.setProperty('--look-y', '0px');
    }
  }, [effects]);
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!effects || event.pointerType === 'touch') return;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (pointerFrame.current !== null) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = null;
      const element = ref.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      element.style.setProperty('--look-x', `${((pointer.current.x - rect.left) / rect.width - .5) * 13}px`);
      element.style.setProperty('--look-y', `${((pointer.current.y - rect.top) / rect.height - .5) * 13}px`);
    });
  }
  function reset() {
    if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = null;
    ref.current?.style.setProperty('--look-x', '0px');
    ref.current?.style.setProperty('--look-y', '0px');
  }
  function knock() {
    if (!effects) return;
    setKnocks(value => value + 1); setPeek(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPeek(false), 1800);
  }
  return <div className={`portrait-scene ${peek ? 'is-peeking' : ''}`} ref={ref} onPointerMove={move} onPointerLeave={reset}>
    <div className="orbit orbit-outer" aria-hidden="true" /><div className="orbit orbit-inner" aria-hidden="true" />
    <div className="lens-star star-one" aria-hidden="true">✦</div><div className="lens-star star-two" aria-hidden="true">✧</div><div className="lens-star star-three" aria-hidden="true">✦</div>
    <button ref={target} type="button" className="portrait-lens" data-egg-trigger="direct" onClick={knock} aria-label="轻敲观察窗">
      <img src={`${import.meta.env.BASE_URL}art/monitoring-juan-cover.png`} alt="小卷戴着猫耳帽和黑框眼镜贴近猫眼镜头，银发旁围绕粉黄色图形、爱心和眼睛，蓝色大眼睛看向你" fetchPriority="high" />
      <span className="lens-glint" aria-hidden="true" />{peek && <span key={knocks} className="knock-ring" aria-hidden="true" />}
    </button>
  </div>;
}

export default memo(NightPortrait);
