import { SITE_NAME, SITE_SETTINGS } from '@/site';
const API_BASE = (SITE_SETTINGS.apiBaseUrl || (typeof window === "undefined" ? "" :
  (window as unknown as { __platform__?: { basename?: string } }).__platform__?.basename || "")).replace(/\/$/, "");
import { assembleTimeline, type TimelineChanges, type TimelineSyncState } from "./timeline-sync";

export interface DashboardProfile {
  id: string;
  name: string;
  url: string;
  description?: string;
}

export interface DashboardRequestOptions {
  baseUrl?: string;
  dashboardId?: string;
}

function normalizeBaseUrl(baseUrl?: string): string {
  const target = (baseUrl ?? API_BASE).trim();
  return target.replace(/\/$/, "");
}

function buildApiUrl(path: string, options?: DashboardRequestOptions): string {
  const dashboardId = options?.dashboardId?.trim();
  if (dashboardId) {
    const endpoint = path.replace(/^\/api\//, "");
    const params = new URLSearchParams({
      dashboard_id: dashboardId,
      endpoint,
    });
    return `${API_BASE}/api/proxy?${params.toString()}`;
  }

  const baseUrl = normalizeBaseUrl(options?.baseUrl);
  return `${baseUrl}${path}`;
}

function withQuery(url: string, params: URLSearchParams): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${params.toString()}`;
}

export interface DeviceState {
  device_id: string;
  device_name: string;
  platform: string;
  app_id: string;
  app_name: string;
  status_text?: string;
  display_title?: string;
  last_seen_at: string;
  is_online: number;
  extra?: {
    battery_percent?: number;
    battery_charging?: boolean;
    music?: {
      title?: string;
      artist?: string;
      app?: string;
    };
  };
}

export interface ActivityRecord {
  id: number;
  device_id: string;
  device_name: string;
  platform: string;
  app_id: string;
  app_name: string;
  status_text?: string;
  display_title?: string;
  started_at: string;
}

export interface TimelineSegment {
  app_name: string;
  app_id: string;
  status_text: string;
  display_title?: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  device_id: string;
  device_name: string;
}

export interface CurrentResponse {
  devices: DeviceState[];
  recent_activities: ActivityRecord[];
  server_time: string;
  viewer_count: number;
}

export interface TimelineResponse {
  date: string;
  segments: TimelineSegment[];
  summary: Record<string, Record<string, number>>;
}

export async function fetchCurrent(
  signal?: AbortSignal,
  options?: DashboardRequestOptions,
): Promise<CurrentResponse> {
  const res = await fetch(buildApiUrl("/api/current", options), { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTimeline(
  date: string,
  signal?: AbortSignal,
  options?: DashboardRequestOptions,
): Promise<TimelineResponse> {
  const tz = new Date().getTimezoneOffset();
  const params = new URLSearchParams({
    date,
    tz: String(tz),
  });
  const url = withQuery(buildApiUrl("/api/timeline", options), params);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchDashboard(
  date: string,
  state: TimelineSyncState,
  signal?: AbortSignal,
  options?: DashboardRequestOptions,
): Promise<{ current: CurrentResponse; timeline: TimelineResponse }> {
  const tz = String(new Date().getTimezoneOffset());
  const params = new URLSearchParams({ history_date: date, tz, page_size: "500", after: String(state.after) });
  if (state.revision) params.set("revision", state.revision);
  const res = await fetch(withQuery(buildApiUrl("/api/current", options), params), { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const current: CurrentResponse & { timeline_changes?: TimelineChanges } = await res.json();
  let page = current.timeline_changes;
  // Older external dashboards keep their existing read-only API behavior.
  if (!page) return { current, timeline: await fetchTimeline(date, signal, options) };
  let changed = !state.timeline;
  let resets = 0;
  while (true) {
    if (page.reset) {
      state.records.clear(); state.after = 0; state.timeline = undefined; changed = true;
      if (++resets > 3) throw new Error("History changed during synchronization");
    }
    if (!Number.isSafeInteger(page.after) || page.after < 0 || !Array.isArray(page.records))
      throw new Error("Invalid history response");
    for (const record of page.records) state.records.set(record.id, record);
    changed ||= page.records.length > 0;
    if (page.has_more && page.after <= state.after) throw new Error("History cursor did not advance");
    state.after = page.after; state.revision = page.revision;
    if (!page.has_more) break;
    const nextParams = new URLSearchParams({ date, tz, mode: "changes", page_size: "500",
      after: String(page.after), snapshot: String(page.snapshot), revision: page.revision });
    const next = await fetch(withQuery(buildApiUrl("/api/timeline", options), nextParams), { signal });
    if (!next.ok) throw new Error(`HTTP ${next.status}`);
    page = await next.json() as TimelineChanges;
  }
  if (changed || !state.timeline) state.timeline = assembleTimeline(date, state.records.values());
  return { current, timeline: state.timeline };
}

export interface HealthRecord {
  device_id: string;
  type: string;
  value: number;
  unit: string;
  recorded_at: string;
  end_time: string;
}

export interface HealthDataResponse {
  date: string;
  records: HealthRecord[];
}

export interface SiteConfig {
  nicknameConfigured?: boolean;
  displayName: string;
  siteTitle: string;
  siteDescription: string;
  siteFavicon: string;
  dashboards: DashboardProfile[];
}

const defaultConfig: SiteConfig = {
  displayName: SITE_SETTINGS.displayName || "我",
  siteTitle: SITE_NAME,
  siteDescription: "个人设备活动状态页",
  siteFavicon: "/favicon.ico",
  dashboards: [],
};

export { defaultConfig };

function isValidFaviconUrl(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeDashboardProfile(value: unknown): DashboardProfile | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.url !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    url: record.url.replace(/\/$/, ""),
    description: typeof record.description === "string" ? record.description : undefined,
  };
}

export async function fetchConfig(
  signal?: AbortSignal,
  options?: DashboardRequestOptions,
): Promise<SiteConfig> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  if (signal?.aborted) {
    clearTimeout(timeout);
    return defaultConfig;
  }
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch(buildApiUrl("/api/config", options), { signal: controller.signal });
    if (!res.ok) throw new Error("Configuration unavailable");
    const data = await res.json();
    const favicon = typeof data.siteFavicon === "string" && isValidFaviconUrl(data.siteFavicon)
      ? data.siteFavicon
      : defaultConfig.siteFavicon;
    const dashboards = Array.isArray(data.dashboards)
      ? data.dashboards
          .map((entry: unknown) => normalizeDashboardProfile(entry))
          .filter((entry: DashboardProfile | null): entry is DashboardProfile => !!entry)
      : defaultConfig.dashboards;
    return {
      nicknameConfigured: data.nicknameConfigured === true,
      displayName: typeof data.displayName === "string" ? data.displayName : defaultConfig.displayName,
      siteTitle: typeof data.siteTitle === "string" ? data.siteTitle : defaultConfig.siteTitle,
      siteDescription: typeof data.siteDescription === "string" ? data.siteDescription : defaultConfig.siteDescription,
      siteFavicon: favicon,
      dashboards: dashboards.length > 0 ? dashboards : defaultConfig.dashboards,
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function fetchHealthData(
  date: string,
  signal?: AbortSignal,
  deviceId?: string,
  options?: DashboardRequestOptions,
): Promise<HealthDataResponse> {
  const tz = new Date().getTimezoneOffset();
  const params = new URLSearchParams({
    date,
    tz: String(tz),
  });
  if (deviceId) params.set("device_id", deviceId);
  params.set("page_size", "500");
  params.set("after", "0");
  const records: HealthRecord[] = [];
  let previous = 0;
  while (true) {
    const res = await fetch(withQuery(buildApiUrl("/api/health-data", options), params), { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const page: HealthDataResponse & { after?: number; snapshot?: number; has_more?: boolean } = await res.json();
    records.push(...page.records);
    if (!page.has_more) break;
    if (!Number.isSafeInteger(page.after) || (page.after ?? 0) <= previous) throw new Error("Health cursor did not advance");
    previous = page.after!;
    params.set("after", String(page.after)); params.set("snapshot", String(page.snapshot));
  }
  records.sort((a, b) => a.recorded_at < b.recorded_at ? -1 : a.recorded_at > b.recorded_at ? 1 : 0);
  return { date, records };
}
