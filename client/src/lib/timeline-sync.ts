import type { ActivityRecord, TimelineResponse, TimelineSegment } from "./api";

export interface TimelineChanges {
  date: string;
  records: ActivityRecord[];
  after: number;
  snapshot: number;
  has_more: boolean;
  revision: string;
  reset: boolean;
}
export interface TimelineSyncState {
  records: Map<number, ActivityRecord>;
  after: number;
  revision?: string;
  timeline?: TimelineResponse;
}
export function createTimelineSyncState(): TimelineSyncState {
  return { records: new Map(), after: 0 };
}

// Same per-device gap handling, rounding and summaries as the original backend.
// Work is performed in the browser, keeping all history and late-arriving records.
export function assembleTimeline(date: string, source: Iterable<ActivityRecord>): TimelineResponse {
  const activities = [...source].sort((a, b) => a.started_at < b.started_at ? -1 : a.started_at > b.started_at ? 1 : a.id - b.id);
  const next = new Array<string | null>(activities.length).fill(null);
  const nextByDevice = new Map<string, string>();
  for (let i = activities.length - 1; i >= 0; i--) {
    const a = activities[i]!;
    next[i] = nextByDevice.get(a.device_id) ?? null;
    nextByDevice.set(a.device_id, a.started_at);
  }
  const segments: TimelineSegment[] = [];
  for (let i = 0; i < activities.length; i++) {
    const a = activities[i]!;
    const start = Date.parse(a.started_at);
    if (Number.isNaN(start)) continue;
    let ended = next[i] ?? null;
    let end = ended ? Date.parse(ended) : start;
    if (Number.isNaN(end)) end = start;
    if (ended && end - start > 120_000) { end = start + 60_000; ended = new Date(end).toISOString(); }
    segments.push({ app_name: a.app_name, app_id: a.app_id, status_text: a.status_text || "",
      display_title: "", started_at: a.started_at, ended_at: ended,
      duration_minutes: Math.max(0, Math.round((end - start) / 60_000)),
      device_id: a.device_id, device_name: a.device_name });
  }
  const totals = new Map<string, Map<string, number>>();
  for (const s of segments) {
    let apps = totals.get(s.device_id);
    if (!apps) { apps = new Map(); totals.set(s.device_id, apps); }
    apps.set(s.app_name, (apps.get(s.app_name) || 0) + s.duration_minutes);
  }
  const summary = Object.fromEntries([...totals].map(([device, apps]) => [device, Object.fromEntries(apps)]));
  return { date, segments, summary };
}
