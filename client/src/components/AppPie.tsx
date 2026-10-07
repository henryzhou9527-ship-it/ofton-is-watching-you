import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChevronDown, Moon, X } from 'lucide-react';
import { durationText, type RankedApp } from '@/lib/activity-view';
import { percentText, pieSlices, wedgePath } from '@/lib/pie-layout';
import { playfulDuration, preciseDuration } from '@/lib/playful-time';

export default function AppPie({ apps, selected, onSelect, effects, animationKey }: {
  apps: RankedApp[]; selected: string | null; onSelect: (name: string | null) => void; effects: boolean; animationKey: string;
}) {
  const slices = useMemo(() => pieSlices(apps), [apps]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(effects ? 0 : 1);
  const [inView, setInView] = useState(false);
  const chart = useRef<HTMLDivElement>(null);
  const hasData = slices.length > 0;
  useEffect(() => {
    setHovered(null); setExpanded(false);
  }, [animationKey]);
  useEffect(() => {
    if (!effects || !hasData) { setProgress(1); return; }
    setProgress(0);
    let frame = 0;
    let started = false;
    let disposed = false;
    const start = () => {
      if (started || disposed) return;
      started = true;
      const began = performance.now();
      const draw = (time: number) => {
        if (disposed) return;
        const t = Math.min(1, (time - began) / 850);
        setProgress(1 - Math.pow(1 - t, 4));
        if (t < 1) frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    };
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting);
      setInView(visible);
      if (visible) start();
      else if (started) { cancelAnimationFrame(frame); setProgress(1); }
    }, { rootMargin: '80px' }) : null;
    if (observer && chart.current) observer.observe(chart.current); else start();
    return () => { disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [animationKey, effects, hasData]);
  const active = slices.find(slice => slice.name === (hovered || selected)) ?? slices[0];
  const choose = (name: string) => onSelect(selected === name ? null : name);
  const visible = expanded ? slices : slices.slice(0, 6);

  return <section className="pie-section" aria-labelledby="pie-heading">
    <div className="section-heading"><h3 id="pie-heading" aria-label="常驻名单">常驻名单<button type="button" className="egg-star" data-egg-trigger="direct" aria-label="戳一下名单边的小星星">✦</button></h3>{selected && <button className="pie-clear" type="button" onClick={() => onSelect(null)} aria-label="清除软件筛选"><X size={15} />全都看看</button>}</div>
    {!active ? <div className="quiet-empty"><Moon size={28} /><p>这天没留下脚印喵</p></div> : <>
      <div className="pie-stage" ref={chart} data-in-view={inView}>
        <div className="pie-art" onPointerLeave={() => setHovered(null)}>
          <svg viewBox="0 0 360 360" aria-label="软件使用时长饼图" className="app-pie" data-egg-trigger="chance">
            <circle cx="180" cy="180" r="155" className="pie-orbit" aria-hidden="true" />
            <circle cx="180" cy="180" r="143" className="pie-inner-orbit" aria-hidden="true" />
            <g className="pie-spark" aria-hidden="true"><path d="M 306 69 L 309 80 L 320 83 L 309 86 L 306 97 L 303 86 L 292 83 L 303 80 Z" /></g>
            <g className="pie-pieces">{slices.map((slice, index) => {
              const focused = active.name === slice.name;
              const pinned = selected === slice.name;
              const mid = (slice.start + slice.end) / 2 * Math.PI / 180;
              const delay = index / slices.length * .18;
              const reveal = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
              const gap = slices.length === 1 ? 0 : Math.min(1.1, (slice.end - slice.start) * .12);
              return <g key={slice.name} className={`pie-piece ${focused ? 'highlighted' : ''} ${pinned ? 'pinned' : ''}`} style={{ transform: pinned ? `translate(${Math.cos(mid) * 9}px, ${Math.sin(mid) * 9}px)` : 'translate(0px, 0px)' }}>
                <path d={wedgePath(slice.start + gap / 2, slice.start + gap / 2 + (slice.end - slice.start - gap) * reveal)} fill={slice.color} tabIndex={0} role="button" aria-pressed={pinned} aria-label={`${slice.name}，${durationText(slice.seconds)}，${percentText(slice.share)}`} onPointerEnter={() => setHovered(slice.name)} onFocus={() => setHovered(slice.name)} onBlur={() => setHovered(null)} onClick={() => choose(slice.name)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(slice.name); } }}>
                  <title>{slice.name} · {preciseDuration(slice.seconds)} · {percentText(slice.share)}</title>
                </path>
              </g>;
            })}</g>
          </svg>
        </div>
        <div className="pie-detail" style={{ '--slice-color': active.color } as CSSProperties}>
          <span className="pie-detail-name"><i />{active.name}</span>
          <strong className="pie-detail-share">{percentText(active.share)}</strong>
          <p className="pie-detail-caption">{active.statusText}</p>
          <span className="pie-detail-duration" title={preciseDuration(active.seconds)}>{playfulDuration(active.seconds)}</span>
        </div>
      </div>
      <div className="pie-legend" aria-label="选择软件">{visible.map(slice => <button type="button" key={slice.name} className={`pie-legend-item ${selected === slice.name ? 'selected' : ''}`} aria-pressed={selected === slice.name} onClick={() => choose(slice.name)} onPointerEnter={() => setHovered(slice.name)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(slice.name)} onBlur={() => setHovered(null)} title={slice.statusText}>
        <i style={{ backgroundColor: slice.color }} /><span>{slice.name}</span><small>{percentText(slice.share)}</small>
      </button>)}</div>
      {slices.length > 6 && <button className="pie-expand" type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? '收起来喵' : '还有谁来过喵'}<ChevronDown size={15} className={expanded ? 'rotate' : ''} /></button>}
    </>}
  </section>;
}
