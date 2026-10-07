import type { DeviceState, TimelineSegment } from './api';

export const APP_PALETTE = ['oklch(78% .10 266)', 'oklch(76% .12 344)', 'oklch(88% .10 104)', 'oklch(79% .07 175)', 'oklch(76% .09 298)', 'oklch(80% .07 57)', 'oklch(81% .065 235)', 'oklch(79% .055 310)'];
export function appColor(name: string) {
  let hash = 0;
  for (const char of name) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
  return APP_PALETTE[hash % APP_PALETTE.length]!;
}
export function durationText(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (seconds > 0 && minutes === 0) return '<1分钟';
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}小时${minutes % 60 ? `${minutes % 60}分` : ''}` : `${minutes}分钟`;
}
const minuteClock = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
const secondClock = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
export function clockText(date: number | string, withSeconds = false) {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? 'Invalid Date' : (withSeconds ? secondClock : minuteClock).format(value);
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localDate(value);
}
export function isIdle(segment: { app_id: string; app_name: string }) {
  return segment.app_id.toLowerCase() === 'idle' || segment.app_name.toLowerCase() === 'idle';
}
export type Session = TimelineSegment & { start: number; end: number; seconds: number; color: string };
export type RankedApp = { name: string; id: string; statusText: string; seconds: number; sessions: number; color: string };

export type Interval = { start: number; end: number };

/** Union of confirmed activity intervals; simultaneous devices only occupy time once. */
export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  const ordered = intervals.filter(interval => interval.end > interval.start).sort((a, b) => a.start - b.start);
  const result: Interval[] = [];
  for (const interval of ordered) {
    const previous = result[result.length - 1];
    if (previous && interval.start <= previous.end) previous.end = Math.max(previous.end, interval.end);
    else result.push({ start: interval.start, end: interval.end });
  }
  return result;
}

export const intervalSeconds = (intervals: readonly Interval[]) => intervals.reduce((sum, interval) => sum + (interval.end - interval.start) / 1000, 0);

/** View-only calculations. Missing intervals stay empty; idle is excluded from app-use totals. */
export function buildActivityView(segments: TimelineSegment[], devices: DeviceState[], date: string, deviceId: string | null, now: number) {
  const dayStart = new Date(`${date}T00:00:00`).getTime();
  const nextDay = new Date(`${shiftDate(date, 1)}T00:00:00`).getTime();
  const deviceMap = new Map(devices.map(device => [device.device_id, device]));
  const sessions: Session[] = [];
  for (const segment of segments) {
    if (deviceId && segment.device_id !== deviceId) continue;
    const rawStart = Date.parse(segment.started_at);
    if (!Number.isFinite(rawStart)) continue;
    let rawEnd = segment.ended_at ? Date.parse(segment.ended_at) : rawStart;
    const device = deviceMap.get(segment.device_id);
    if (!segment.ended_at && date === localDate(new Date(now)) && device?.app_id === segment.app_id) {
      const lastSeen = Date.parse(device.last_seen_at);
      if (Number.isFinite(lastSeen) && lastSeen >= rawStart) rawEnd = Math.min(now, lastSeen);
    }
    if (!Number.isFinite(rawEnd)) rawEnd = rawStart;
    const start = Math.max(rawStart, dayStart);
    const end = Math.min(Math.max(rawEnd, start), nextDay, now);
    if (start >= nextDay || start > now || end < dayStart) continue;
    sessions.push({ ...segment, start, end: Math.max(start, end), seconds: Math.max(0, end - start) / 1000, color: isIdle(segment) ? 'oklch(52% .034 275)' : appColor(segment.app_name) });
  }
  sessions.sort((a, b) => a.start - b.start);
  const merged: Session[] = [];
  const lastByDevice = new Map<string, Session>();
  for (const session of sessions) {
    const previous = lastByDevice.get(session.device_id);
    if (previous && previous.app_id === session.app_id && session.start <= previous.end) {
      previous.end = Math.max(previous.end, session.end);
      previous.seconds = (previous.end - previous.start) / 1000;
    } else {
      const copy = { ...session };
      merged.push(copy);
      lastByDevice.set(session.device_id, copy);
    }
  }
  const apps = new Map<string, RankedApp>();
  const appIntervals = new Map<string, Interval[]>();
  const hourly = Array<number>(24).fill(0);
  const activeSessions = merged.filter(session => !isIdle(session) && session.seconds > 0);
  for (const session of activeSessions) {
    const app = apps.get(session.app_name) ?? { name: session.app_name, id: session.app_id, statusText: '', seconds: 0, sessions: 0, color: session.color };
    app.statusText = session.status_text || app.statusText || `正在使用${session.app_name}喵~`;
    app.sessions++;
    apps.set(app.name, app);
    const intervals = appIntervals.get(app.name) ?? [];
    intervals.push(session);
    appIntervals.set(app.name, intervals);
  }
  for (const app of apps.values()) {
    app.seconds = intervalSeconds(mergeIntervals(appIntervals.get(app.name)!));
  }
  const activeIntervals = mergeIntervals(activeSessions);
  for (const interval of activeIntervals) {
    for (let hour = 0; hour < 24; hour++) {
      const start = dayStart + hour * 3600000;
      hourly[hour] += Math.max(0, Math.min(interval.end, start + 3600000) - Math.max(interval.start, start)) / 1000;
    }
  }
  const ranked = [...apps.values()].sort((a, b) => b.seconds - a.seconds);
  const total = intervalSeconds(activeIntervals);
  const peak = total ? hourly.indexOf(Math.max(...hourly)) : null;
  return { sessions: merged.sort((a, b) => b.start - a.start), ranked, hourly, total, peak, dayStart, dayLength: nextDay - dayStart };
}
