import { intervalSeconds, isIdle, localDate, mergeIntervals, type Interval, type Session } from './activity-view';

export const REPLAY_MAX_RETURN_GAP_MS = 2 * 60 * 1000;
export const REPLAY_MIN_ACTIVE_SHARE = .8;
const MAX_UNOBSERVED_GAP_MS = 2000;

export type ReplaySession = Session & { parts?: readonly Session[]; interruptionSeconds?: number };
type ReplayGroup = ReplaySession & { parts: Session[]; interruptionSeconds: number };
type Continuity = { active: Interval[]; idle: Interval[] };

function canBridge(start: number, end: number, continuity: Continuity | undefined): boolean {
  if (end <= start) return true;
  if (!continuity) return false;
  if (continuity.idle.some(interval => interval.start < end && (interval.end > start || interval.start >= start))) return false;
  let coveredUntil = start;
  let missing = 0;
  for (const interval of continuity.active) {
    if (interval.end <= coveredUntil) continue;
    if (interval.start >= end) break;
    missing += Math.max(0, interval.start - coveredUntil);
    if (missing > MAX_UNOBSERVED_GAP_MS) return false;
    coveredUntil = Math.max(coveredUntil, Math.min(end, interval.end));
    if (coveredUntil === end) break;
  }
  return missing + Math.max(0, end - coveredUntil) <= MAX_UNOBSERVED_GAP_MS;
}

/** Display-only sessionization. Statistics continue to use the original exact intervals. */
export function groupReplaySessions(sessions: readonly Session[], context: readonly Session[] = sessions): ReplayGroup[] {
  const byDevice = new Map<string, Continuity>();
  for (const session of context) {
    const continuity = byDevice.get(session.device_id) ?? { active: [], idle: [] };
    (isIdle(session) ? continuity.idle : continuity.active).push({ start: session.start, end: session.end });
    byDevice.set(session.device_id, continuity);
  }
  for (const continuity of byDevice.values()) continuity.active = mergeIntervals(continuity.active);
  const groups: ReplayGroup[] = [];
  const latestByApp = new Map<string, ReplayGroup>();
  for (const session of [...sessions].sort((a, b) => a.start - b.start || a.end - b.end)) {
    const key = JSON.stringify([session.device_id, session.app_id, session.app_name, localDate(new Date(session.start))]);
    const previous = latestByApp.get(key);
    if (previous && !isIdle(previous) && !isIdle(session) && session.start - previous.end <= REPLAY_MAX_RETURN_GAP_MS && canBridge(previous.end, session.start, byDevice.get(session.device_id))) {
      const parts = [...previous.parts, session];
      const end = Math.max(previous.end, session.end);
      const seconds = intervalSeconds(mergeIntervals(parts));
      const span = (end - previous.start) / 1000;
      if (!span || seconds / span >= REPLAY_MIN_ACTIVE_SHARE) {
        previous.parts = parts;
        if (session.end >= previous.end) previous.ended_at = session.ended_at;
        previous.end = end;
        previous.seconds = seconds;
        previous.duration_minutes = seconds / 60;
        previous.status_text = session.status_text || previous.status_text;
        previous.interruptionSeconds = Math.max(0, span - seconds);
        continue;
      }
    }
    const group: ReplayGroup = { ...session, parts: [session], interruptionSeconds: 0 };
    groups.push(group);
    latestByApp.set(key, group);
  }
  return groups.sort((a, b) => b.end - a.end || b.start - a.start || a.device_id.localeCompare(b.device_id));
}
