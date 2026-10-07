import { db } from "../db";
import { getConfiguredDeviceIds, isConfiguredDeviceId } from "../middleware/auth";
import { getUtcDayRange, parseTimezoneOffset } from "../services/date-range";
import { InvalidSyncRequest } from "./timeline-changes";

function number(raw: string | null, fallback: number) {
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new InvalidSyncRequest();
  return Number(raw);
}
export async function getHealthPage(url: URL) {
  const date = url.searchParams.get("date") || "";
  const tz = parseTimezoneOffset(url.searchParams.get("tz"));
  const range = tz === null ? null : getUtcDayRange(date, tz);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !range) throw new InvalidSyncRequest();
  const pageSize = number(url.searchParams.get("page_size"), 500);
  if (pageSize < 1 || pageSize > 500) throw new InvalidSyncRequest();
  let after = number(url.searchParams.get("after"), 0);
  const maximum = Number((await db.prepare("SELECT MAX(id) AS maximum FROM health_records").get())?.maximum ?? 0);
  const snapshot = number(url.searchParams.get("snapshot"), maximum);
  if (after > snapshot || snapshot > maximum) throw new InvalidSyncRequest();
  const device = url.searchParams.get("device_id");
  const ids = device ? (isConfiguredDeviceId(device) ? [device] : []) : getConfiguredDeviceIds();
  if (!ids.length) return { date, records: [], after: snapshot, snapshot, has_more: false };
  const slots = ids.map(() => "?").join(",");
  if (!after) {
    const first = await db.prepare(`SELECT MIN(id) AS first FROM health_records
      WHERE recorded_at >= ? AND recorded_at < ? AND device_id IN (${slots})`).get(range.start, range.end, ...ids);
    after = first?.first ? Number(first.first) - 1 : snapshot;
  }
  const rows = await db.prepare(`SELECT id, device_id, type, value, unit, recorded_at, end_time
    FROM health_records WHERE id > ? AND id <= ? AND recorded_at >= ? AND recorded_at < ?
    AND device_id IN (${slots}) ORDER BY id ASC LIMIT ?`
  ).all(after, snapshot, range.start, range.end, ...ids, pageSize + 1);
  const hasMore = rows.length > pageSize;
  const page = rows.slice(0, pageSize);
  return { date, records: page.map(({ id, ...record }) => record),
    after: hasMore ? Number(page[page.length - 1]!.id) : snapshot, snapshot, has_more: hasMore };
}
