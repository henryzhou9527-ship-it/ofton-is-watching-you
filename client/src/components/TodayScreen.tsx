import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Fish, Moon, Radio, X } from 'lucide-react';
import type { DeviceState, TimelineResponse } from '@/lib/api';
import { buildActivityView, durationText, isIdle, shiftDate } from '@/lib/activity-view';
import { playfulDuration, playfulHour } from '@/lib/playful-time';
import { groupReplaySessions } from '@/lib/replay-groups';
import { DayRibbon, DeviceIcon } from './ActivityViews';
import AppPie from './AppPie';
import ActivityReplay from './ActivityReplay';
import HealthData from './HealthData';
import CategoryBreakdown from './ActivityCategory';
import { classifyApp, categoryMeta, type CategoryId } from '@/lib/app-categories';

const PANES = [{ id: 'overview', name: '概览' }, { id: 'apps', name: '软件' }, { id: 'replay', name: '回放' }, { id: 'health', name: '健康' }] as const;
type Pane = typeof PANES[number]['id'];


function TodayScreen({ devices, timeline, date, today, changeDate, deviceId, onDeviceChange, now, loading, error, effects }: {
  devices: DeviceState[]; timeline: TimelineResponse | null; date: string; today: string;
  changeDate: (date: string) => void; deviceId: string | null; onDeviceChange: (id: string | null) => void;
  now: number; loading: boolean; error: string | null; effects: boolean;
}) {
  const [pane, setPane] = useState<Pane>(() => window.location.hash === '#replay' ? 'replay' : 'overview');
  const [categoryFocus, setCategoryFocus] = useState<CategoryId | null>(null);
  const [appFocus, setAppFocus] = useState<string | null>(null);
  const [hourFocus, setHourFocus] = useState<number | null>(null);
  const [showIdle, setShowIdle] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(3);
  const paneRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setAppFocus(null); setCategoryFocus(null); setHourFocus(null); setPage(0); }, [date, deviceId]);
  useEffect(() => { setPage(0); }, [appFocus, categoryFocus, hourFocus, showIdle, showDetails]);
  const available = timeline?.date === date ? timeline : null;
  const view = useMemo(() => buildActivityView(available?.segments ?? [], devices, date, deviceId, now), [available, devices, date, deviceId, now]);
  const filteredSessions = useMemo(() => view.sessions.filter(session => (showIdle || !isIdle(session)) && (!categoryFocus || (!isIdle(session) && classifyApp(session) === categoryFocus)) && (!appFocus || session.app_name === appFocus) && (hourFocus === null || (session.start < view.dayStart + (hourFocus + 1) * 3600000 && session.end >= view.dayStart + hourFocus * 3600000))), [view.sessions, view.dayStart, showIdle, appFocus, categoryFocus, hourFocus]);
  const sessions = useMemo(() => showDetails ? filteredSessions : groupReplaySessions(filteredSessions, view.sessions), [filteredSessions, view.sessions, showDetails]);
  const pages = Math.max(1, Math.ceil(sessions.length / size));
  const currentPage = Math.min(page, pages - 1);
  useLayoutEffect(() => {
    const element = paneRef.current;
    if (pane !== 'replay' || !element) return;
    const fitPage = () => {
      if (element.clientHeight < 100) return;
      const style = getComputedStyle(element);
      const outerHeight = (selector: string) => {
        const node = element.querySelector<HTMLElement>(selector);
        if (!node) return 0;
        const css = getComputedStyle(node);
        return node.offsetHeight + parseFloat(css.marginTop) + parseFloat(css.marginBottom);
      };
      const fixed = outerHeight('.replay-section > .section-heading') + outerHeight('.filter-note') + Math.max(52, outerHeight('.replay-pagination'));
      const heights = [...element.querySelectorAll<HTMLElement>('.replay-entry')].map(node => node.offsetHeight);
      const rowHeight = heights.length ? Math.max(...heights) : window.innerWidth <= 660 ? 120 : 90;
      const availableHeight = element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - fixed - 2;
      const nextSize = Math.max(1, Math.min(8, Math.floor(availableHeight / rowHeight)));
      if (nextSize !== size) {
        setPage(previous => Math.floor(previous * size / nextSize));
        setSize(nextSize);
      }
    };
    const observer = new ResizeObserver(fitPage);
    observer.observe(element);
    element.querySelectorAll('.replay-entry').forEach(node => observer.observe(node));
    fitPage();
    return () => observer.disconnect();
  }, [pane, size, currentPage, appFocus, categoryFocus, hourFocus, showIdle, date, deviceId, sessions]);
  const busy = loading && !available;
  const maxHour = Math.max(...view.hourly, 1);
  const clearFilters = () => { setAppFocus(null); setCategoryFocus(null); setHourFocus(null); };
  const openReplay = () => { setPane('replay'); requestAnimationFrame(() => document.getElementById('day-pane-replay')?.focus()); };
  function tabKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = PANES.findIndex(item => item.id === pane);
    const next = event.key === 'ArrowRight' ? (index + 1) % PANES.length : event.key === 'ArrowLeft' ? (index + PANES.length - 1) % PANES.length : event.key === 'Home' ? 0 : event.key === 'End' ? PANES.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); setPane(PANES[next]!.id); document.getElementById(`day-tab-${PANES[next]!.id}`)?.focus();
  }

  return <section className="day-section" id="today" aria-labelledby="day-title">
    <div className="day-heading"><h2 id="day-title">这一天<span>，</span>都去哪了？</h2><div className="date-control">
      <button type="button" data-egg-trigger="chance" aria-label="前一天" onClick={() => changeDate(shiftDate(date, -1))}><ChevronLeft size={19} /></button>
      <label className="date-field"><span className="sr-only">选择日期</span><input type="date" value={date} max={today} onChange={event => { if (event.target.value && event.target.value <= today) changeDate(event.target.value); }} /></label>
      <button type="button" data-egg-trigger="chance" aria-label="后一天" disabled={date >= today} onClick={() => changeDate(shiftDate(date, 1))}><ChevronRight size={19} /></button>
      <button className="today-button" type="button" onClick={() => changeDate(today)} disabled={date === today}>今天</button>
    </div></div>
    <div className="day-toolbar"><div className="device-filters" aria-label="筛选设备"><button type="button" aria-pressed={!deviceId} className={!deviceId ? 'active' : ''} onClick={() => onDeviceChange(null)}>全部设备</button>{devices.map(device => <button type="button" aria-pressed={deviceId === device.device_id} className={deviceId === device.device_id ? 'active' : ''} key={device.device_id} onClick={() => onDeviceChange(device.device_id)}><DeviceIcon platform={device.platform} size={14} />{device.device_name}</button>)}</div></div>
    <div className="detail-tabs" role="tablist" aria-label="今天的内容" onKeyDown={tabKey}>{PANES.map(item => <button key={item.id} id={`day-tab-${item.id}`} type="button" role="tab" aria-selected={pane === item.id} aria-controls={`day-pane-${item.id}`} tabIndex={pane === item.id ? 0 : -1} onClick={() => setPane(item.id)}>{item.name}{item.id === 'replay' && (appFocus || categoryFocus || hourFocus !== null) && <i aria-label="有筛选" />}</button>)}</div>
    {error && <div className="connection-notice" role="status"><Radio size={16} />数据连接中断，正在重试。{timeline && '当前显示上次记录。'}</div>}
    <div ref={paneRef} key={pane} id={`day-pane-${pane}`} className={`today-pane pane-${pane}`} role="tabpanel" aria-labelledby={`day-tab-${pane}`} tabIndex={-1} aria-busy={busy}>
      {pane === 'overview' && <>
        {busy ? <div className="stats-skeleton"><span /><span /><span /></div> : <div className="day-summary"><div><span>{deviceId ? '待了多久喵' : '合计时长'}</span><strong>{view.total > 0 ? playfulDuration(view.total) : '这天还很安静喵'}</strong></div><div><span>最黏谁喵</span><strong>{view.ranked[0]?.name ?? '—'}</strong></div><div><span>什么时候最热闹喵</span><strong>{view.peak === null ? '还没开始喵' : playfulHour(view.peak)}</strong></div></div>}
        {!busy && <CategoryBreakdown sessions={view.sessions} onSelect={category => { setCategoryFocus(category); setAppFocus(null); setHourFocus(null); openReplay(); }} />}
        <DayRibbon sessions={view.sessions} devices={devices.filter(device => !deviceId || device.device_id === deviceId)} dayStart={view.dayStart} dayLength={view.dayLength} />
        <section className="hours-section"><div className="section-heading"><h3>几点在忙</h3><span className="hour-readout">{view.peak === null ? '这会儿静悄悄喵' : playfulHour(view.peak)}</span></div>
          <div className="hour-chart" aria-label="每小时设备使用时长">{view.hourly.map((seconds, hour) => <button key={hour} type="button" className={`hour-column ${hourFocus === hour ? 'selected' : ''} ${hour === view.peak ? 'peak' : ''}`} aria-label={`${hour}点，${durationText(seconds)}`} aria-pressed={hourFocus === hour} title={`${String(hour).padStart(2, '0')}:00 · ${durationText(seconds)}`} onClick={() => { setHourFocus(hour); setCategoryFocus(null); openReplay(); }}><span className="hour-bar" style={{ '--bar-scale': Math.max(seconds / maxHour, .014) } as CSSProperties} /><span className="hour-label">{hour % 4 === 0 ? String(hour).padStart(2, '0') : ''}</span></button>)}</div><div className="hour-footer"><span>00:00</span><span>使用时间</span><span>24:00</span></div>
        </section>
      </>}
      {pane === 'apps' && <AppPie apps={view.ranked} selected={appFocus} onSelect={name => { setAppFocus(name); setCategoryFocus(null); if (name) openReplay(); }} effects={effects} animationKey={`${date}:${deviceId ?? 'all'}`} />}
      {pane === 'replay' && <section className="replay-section"><div className="section-heading"><div className="egg-replay-title"><h3>活动回放</h3><button type="button" className="egg-fish" data-egg-trigger="direct" aria-label="摸摸小鱼"><Fish size={20} /></button></div><div className="replay-options"><label className="idle-toggle"><input type="checkbox" checked={showDetails} onChange={event => setShowDetails(event.target.checked)} /><span>细分记录</span></label><label className="idle-toggle"><input type="checkbox" checked={showIdle} onChange={event => setShowIdle(event.target.checked)} /><span>显示离开时段</span></label></div></div>
        {(appFocus || categoryFocus || hourFocus !== null) && <div className="filter-note"><span>正在看：{categoryFocus ? categoryMeta(categoryFocus).label : appFocus ?? '全部软件'}{hourFocus !== null ? ` · ${hourFocus}:00` : ''}</span><button className="text-button" type="button" onClick={clearFilters}>清除筛选<X size={13} /></button></div>}
        <div className="replay-page" key={`${currentPage}:${date}:${deviceId}:${appFocus}:${categoryFocus}:${hourFocus}:${showIdle}:${showDetails}`}>
          {!sessions.length ? <div className="quiet-empty"><Moon size={28} /><p>{busy ? '记录加载中' : '这一段，暂时留白'}</p></div> : <ActivityReplay sessions={sessions.slice(currentPage * size, (currentPage + 1) * size)} devices={devices} />}
        </div>
        {sessions.length > size && <nav className="replay-pagination" aria-label="活动回放翻页"><button type="button" aria-label="较新的记录" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} />较新</button><span aria-live="polite">{currentPage + 1} / {pages}</span><button type="button" aria-label="较早的记录" disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)}>较早<ChevronRight size={17} /></button></nav>}
      </section>}
      {pane === 'health' && <div className="next-health"><HealthData selectedDate={date} deviceId={deviceId ?? undefined} /></div>}
    </div>
  </section>;
}

export default memo(TodayScreen);
