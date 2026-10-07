import { createHash } from "node:crypto";
import { db } from "../db";
import { getConfiguredDeviceIds, isConfiguredDeviceId } from "../middleware/auth";
import { getUtcDayRange, parseTimezoneOffset } from "../services/date-range";
import { resolveAppMeta } from "../services/app-mapper";
import { protectDetails } from "../services/title-protection";
import bundledMappings from "../../../../deployment/custom-mappings.json";

const configuration = createHash("sha256").update(JSON.stringify([
  getConfiguredDeviceIds().sort(), process.env.VERCEL_DEPLOYMENT_ID || "local",
  process.env.CUSTOM_MAPPINGS_JSON || "",
  bundledMappings,
])).digest("hex").slice(0, 16);

export class InvalidSyncRequest extends Error {}

function integer(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) throw new InvalidSyncRequest("Invalid cursor");
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 0) throw new InvalidSyncRequest("Invalid cursor");
  return n;
}

export async function getTimelineChanges(url: URL, dateKey = "date") {
  const date = url.searchParams.get(dateKey) || "";
  const tz = parseTimezoneOffset(url.searchParams.get("tz"));
  const range = tz === null ? null : getUtcDayRange(date, tz);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !range) throw new InvalidSyncRequest("Invalid date");
  const pageSize = integer(url.searchParams.get("page_size"), 500);
  if (pageSize < 1 || pageSize > 500) throw new InvalidSyncRequest("Invalid page size");
  let after = integer(url.searchParams.get("after"), 0);
  const device = url.searchParams.get("device_id");
  const ids = device ? (isConfiguredDeviceId(device) ? [device] : []) : getConfiguredDeviceIds();
  const maintenance = await db.prepare("SELECT last_run_at FROM maintenance_state WHERE name='timeline_revision'").get();
  const revision = configuration + "." + String(maintenance?.last_run_at ?? 0);
  const clientRevision = url.searchParams.get("revision");
  let reset = clientRevision !== null && clientRevision !== revision;
  const maximum = Number((await db.prepare("SELECT MAX(id) AS maximum FROM activities").get())?.maximum ?? 0);
  let snapshot = reset ? maximum : integer(url.searchParams.get("snapshot"), maximum);
  if (snapshot > maximum || after > snapshot) { reset = true; snapshot = maximum; }
  if (reset) after = 0;
  if (!ids.length) return { date, records: [], after: snapshot, snapshot, has_more: false, revision, reset };
  const slots = ids.map(() => "?").join(",");
  if (after === 0) {
    // Scan the date index once at initial load/reset, then use primary-key seeks.
    const first = await db.prepare(`SELECT MIN(id) AS first FROM activities
      WHERE started_at >= ? AND started_at < ? AND device_id IN (${slots})`).get(range.start, range.end, ...ids);
    if (first?.first) after = Number(first.first) - 1;
    else after = snapshot;
  }
  const rows = await db.prepare(`SELECT id, device_id, device_name, platform, app_id, app_name,
      display_title, started_at FROM activities
    WHERE id > ? AND id <= ? AND started_at >= ? AND started_at < ?
      AND device_id IN (${slots}) ORDER BY id ASC LIMIT ?`
  ).all(after, snapshot, range.start, range.end, ...ids, pageSize + 1);
  const hasMore = rows.length > pageSize;
  const page = rows.slice(0, pageSize);
  const records = page.map(row => {
    const meta = resolveAppMeta(row.app_id, row.platform, row.app_name);
    return { ...row, app_name: meta.appName, status_text: meta.statusText,
      display_title: protectDetails(row.display_title) };
  });
  const next = hasMore ? Number(page[page.length - 1]!.id) : snapshot;
  return { date, records, after: next, snapshot, has_more: hasMore, revision, reset };
}
