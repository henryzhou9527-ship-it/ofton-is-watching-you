import { useEffect, useMemo, useState } from 'react';
import { Battery, BatteryCharging, ChartPie, Eye, EyeOff, Radio, Sparkles } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { ConfigContext, useConfigLoader } from '@/hooks/useConfig';
import { isIdle, localDate } from '@/lib/activity-view';
import type { DeviceState } from '@/lib/api';
import { SITE_NAME, SITE_SETTINGS } from '@/site';
import NightPortrait from '@/components/NightPortrait';
import JuanEasterEggs from '@/components/JuanEasterEggs';
import { DeviceIcon } from '@/components/ActivityViews';
import TodayScreen from '@/components/TodayScreen';
import { useSceneNavigation } from '@/hooks/useSceneNavigation';
import { usePageGestures } from '@/hooks/usePageGestures';

function since(time: string | undefined, now: number) {
  if (!time || !Number.isFinite(Date.parse(time))) return '尚无上报';
  const minutes = Math.max(0, Math.floor((now - Date.parse(time)) / 60000));
  return minutes === 0 ? '刚刚' : minutes < 60 ? `${minutes}分钟前` : minutes < 1440 ? `${Math.floor(minutes / 60)}小时${minutes % 60 ? `${minutes % 60}分` : ''}前` : `${Math.floor(minutes / 1440)}天前`;
}
function online(device: DeviceState | undefined, now: number) { return device?.is_online === 1 && now - Date.parse(device.last_seen_at) < 120000; }

export default function NightDashboard() {
  const config = useConfigLoader();
  const nickname = config.nicknameConfigured ? config.displayName : SITE_SETTINGS.displayName || config.displayName;
  const displayConfig = useMemo(() => ({ ...config, displayName: nickname }), [config, nickname]);
  useEffect(() => { document.title = SITE_NAME; }, []);
  const { current, timeline, selectedDate, changeDate, loading, error, viewerCount } = useDashboard();
  const [now, setNow] = useState(Date.now());
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [effects, setEffects] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const { scene, destination, phase, navigate } = useSceneNavigation(effects);
  const gestureRoot = usePageGestures(destination, navigate);
  const today = localDate(new Date(now));
  const date = selectedDate || today;
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = () => { if (query.matches) setEffects(false); };
    query.addEventListener('change', listener); return () => query.removeEventListener('change', listener);
  }, []);
  const devices = useMemo(() => current?.devices ?? [], [current?.devices]);
  const active = devices.find(device => device.device_id === deviceId) ?? [...devices].sort((a, b) => Number(online(b, now)) - Number(online(a, now)) || Date.parse(b.last_seen_at) - Date.parse(a.last_seen_at))[0];
  const connected = !error && online(active, now);
  const idle = active && isIdle(active);
  const status = error ? '信号暂时断了' : !current ? '正在接收信号' : connected ? (active?.status_text || (idle ? '暂时离开了喵~' : `正在使用${active?.app_name}喵~`)) : `${nickname} 暂时不在线喵~`;

  return <ConfigContext.Provider value={displayConfig}><div ref={gestureRoot} className={`next-shell scene-shell ${effects ? 'effects-on' : 'effects-off'}`}>
    <a href="#today" className="skip-link" onClick={event => { event.preventDefault(); navigate('today', true); }}>跳到统计</a>
    <header className="next-header">
      <div className="wordmark" aria-label={`${SITE_NAME} 首页`}><button type="button" className="wordmark-icon" data-egg-trigger="direct" aria-label="和小卷打个招呼"><Eye size={21} /></button><strong>お布団巻き</strong></div>
      <nav className="scene-tabs" role="tablist" aria-label="切换画面" data-scene={destination} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'now' : event.key === 'End' ? 'today' : destination === 'now' ? 'today' : 'now';
        navigate(next); document.getElementById(`scene-tab-${next}`)?.focus();
      }}>
        <button type="button" id="scene-tab-now" role="tab" aria-label="此刻" title="此刻" aria-selected={destination === 'now'} aria-controls="scene-now" tabIndex={destination === 'now' ? 0 : -1} onClick={() => navigate('now')}><Eye size={20} aria-hidden="true" /></button>
        <button type="button" id="scene-tab-today" role="tab" aria-label="今天" title="今天" aria-selected={destination === 'today'} aria-controls="scene-today" tabIndex={destination === 'today' ? 0 : -1} onClick={() => navigate('today')}><ChartPie size={20} aria-hidden="true" /></button>
      </nav>
      <div className="header-end"><button className="effects-toggle" aria-label={effects ? '关闭特效' : '开启特效'} onClick={() => setEffects(!effects)} aria-pressed={effects} title={effects ? '关闭特效' : '开启特效'} type="button">{effects ? <Sparkles size={19} aria-hidden="true" /> : <EyeOff size={19} aria-hidden="true" />}</button></div>
    </header>
    <main className="scene-deck" data-phase={phase}>
      <div id="scene-now" className="scene-panel now-scene" role="tabpanel" aria-labelledby="scene-tab-now" tabIndex={-1} data-active={scene === 'now'} aria-hidden={scene !== 'now'} inert={scene !== 'now'}>
      <section className="night-hero" id="now" aria-labelledby="hero-title">
        <div className="hero-grid" aria-hidden="true" /><div className="hero-glow" aria-hidden="true" />
        <div className="hero-content"><div className="hero-copy"><h1 id="hero-title" className="watching-title" aria-label={SITE_NAME}>お布団巻き<button type="button" className="title-spark" data-egg-trigger="direct" aria-label="戳一下小星星">✳</button><span className="title-japanese">is watching you<span className="title-small-eye"><Eye size={32} /></span></span></h1>
          <div className={`live-state ${connected ? 'is-live' : ''}`}><div className="live-state-top"><span>{nickname}</span></div><p className="live-status" aria-live="polite">{status}</p><div className="live-meta"><span><Radio size={13} />{connected && active ? active.app_name === 'idle' ? '设备在线' : active.app_name : `最后上报 ${since(active?.last_seen_at, now)}`}</span>{current && <span><Eye size={13} />{viewerCount} 人在看</span>}</div>{connected && active?.extra?.music?.title && <div className="music-line">♫ {active.extra.music.title}{active.extra.music.artist ? ` · ${active.extra.music.artist}` : ''}</div>}</div>
          </div><NightPortrait effects={effects} /></div>
        <div className="device-rail" aria-label="设备状态">{devices.length === 0 ? <p className="device-empty">{loading ? '设备连接中' : '还没有设备上报'}</p> : devices.map(device => {
          const isConnected = !error && online(device, now); const power = device.extra?.battery_percent;
          return <button data-egg-trigger="chance" className={`device-row ${deviceId === device.device_id ? 'selected' : ''}`} key={device.device_id} onClick={() => setDeviceId(deviceId === device.device_id ? null : device.device_id)} type="button" aria-pressed={deviceId === device.device_id}><DeviceIcon platform={device.platform} /><span className="device-identity"><strong>{device.device_name}</strong><span>{error ? '连接中断' : isConnected ? device.status_text || (isIdle(device) ? '暂时离开了喵~' : `正在使用${device.app_name}喵~`) : `最后上报 ${since(device.last_seen_at, now)}`}</span></span>{typeof power === 'number' && <span className="device-power">{device.extra?.battery_charging ? <BatteryCharging size={16} /> : <Battery size={16} />}{power}%</span>}<span className={`device-state ${isConnected ? 'online' : ''}`}><i />{error ? '未知' : isConnected ? '在线' : '离线'}</span></button>;
        })}</div>
      </section>

      </div>
      <div id="scene-today" className="scene-panel today-scene" role="tabpanel" aria-labelledby="scene-tab-today" tabIndex={-1} data-active={scene === 'today'} aria-hidden={scene !== 'today'} inert={scene !== 'today'}>
        <TodayScreen devices={devices} timeline={timeline} date={date} today={today} changeDate={changeDate} deviceId={deviceId} onDeviceChange={setDeviceId} now={now} loading={loading} error={error} effects={effects} />
      </div>
      <div className="scene-shutter" aria-hidden="true" />
    </main>
    <JuanEasterEggs enabled={effects && phase === 'idle'} />
  </div></ConfigContext.Provider>;
}
