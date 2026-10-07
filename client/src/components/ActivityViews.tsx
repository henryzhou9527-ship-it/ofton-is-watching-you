import { Monitor, Smartphone } from 'lucide-react';
import { clockText, durationText, isIdle, type Session } from '@/lib/activity-view';
import type { DeviceState } from '@/lib/api';

export function DeviceIcon({ platform, size = 19 }: { platform: string; size?: number }) {
  return platform === 'android' ? <Smartphone size={size} /> : <Monitor size={size} />;
}
export function DayRibbon({ sessions, devices, dayStart, dayLength }: { sessions: Session[]; devices: DeviceState[]; dayStart: number; dayLength: number }) {
  return <div className="day-ribbon">
    <div className="day-axis" aria-hidden="true">{[0, 4, 8, 12, 16, 20, 24].map(hour => <span key={hour}>{String(hour).padStart(2, '0')}:00</span>)}</div>
    {devices.map(device => <div className="ribbon-row" key={device.device_id}><span className="ribbon-device" title={device.device_name}><DeviceIcon platform={device.platform} size={16} /><span>{device.device_name}</span></span>
      <div className="ribbon-track" role="img" aria-label={`${device.device_name}当天活动分布`}>{sessions.filter(session => session.device_id === device.device_id && session.seconds > 0).map(session => <span key={`${session.device_id}:${session.app_id}:${session.start}`} className={isIdle(session) ? 'ribbon-idle' : ''} title={`${clockText(session.start)}–${clockText(session.end)} ${isIdle(session) ? '暂时离开' : session.app_name} · ${durationText(session.seconds)}`} style={{ left: `${(session.start - dayStart) / dayLength * 100}%`, width: `${(session.end - session.start) / dayLength * 100}%`, backgroundColor: session.color }} />)}</div>
    </div>)}
  </div>;
}
