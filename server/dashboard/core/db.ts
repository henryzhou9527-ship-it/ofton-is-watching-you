import { createHmac } from "node:crypto";
import { openStore } from "./storage";

const HASH_SECRET = process.env.HASH_SECRET || "";
if (HASH_SECRET.length < 32 || HASH_SECRET.includes("REPLACE_")) {
  throw new Error("Persistent storage unavailable");
}

// Schema is applied separately to a fresh dedicated database, never on cold start.
export const db = openStore();
export function hmacTitle(title: string): string {
  return createHmac("sha256", HASH_SECRET).update(title).digest("hex");
}

// Prepared statements
export const insertActivity = db.prepare(`
  INSERT INTO activities (device_id, device_name, platform, app_id, app_name, window_title, display_title, title_hash, time_bucket, started_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(device_id, app_id, title_hash, time_bucket) DO NOTHING
`);

export const upsertDeviceState = db.prepare(`
  INSERT INTO device_states (device_id, device_name, platform, app_id, app_name, window_title, display_title, last_seen_at, extra, is_online)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT(device_id) DO UPDATE SET
    device_name = excluded.device_name,
    platform = excluded.platform,
    app_id = excluded.app_id,
    app_name = excluded.app_name,
    window_title = excluded.window_title,
    display_title = excluded.display_title,
    last_seen_at = excluded.last_seen_at,
    extra = excluded.extra,
    is_online = 1
`);

export const getAllDeviceStates = db.prepare(`
  SELECT * FROM device_states ORDER BY last_seen_at DESC
`);

export const getRecentActivities = db.prepare(`
  SELECT * FROM activities ORDER BY started_at DESC LIMIT 20
`);

export const getTimelineByRange = db.prepare(`
  SELECT * FROM activities
  WHERE started_at >= ? AND started_at < ?
  ORDER BY started_at ASC, id ASC
`);

export const getTimelineByRangeAndDevice = db.prepare(`
  SELECT * FROM activities
  WHERE device_id = ? AND started_at >= ? AND started_at < ?
  ORDER BY started_at ASC, id ASC
`);

export const markOfflineDevices = db.prepare(`
  UPDATE device_states SET is_online = 0
  WHERE is_online = 1
  AND (last_seen_at IS NULL OR last_seen_at = '' OR last_seen_at <
       to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '1 minute', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
`);

export const cleanupOldActivities = db.prepare(`
  DELETE FROM activities WHERE created_at < to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '7 days', 'YYYY-MM-DD HH24:MI:SS')
`);

export const upsertDeviceConsent = db.prepare(`
  INSERT INTO device_consents (
    device_id,
    consent_version,
    activity_reporting,
    health_reporting,
    granted_scopes,
    granted_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(device_id) DO UPDATE SET
    consent_version = excluded.consent_version,
    activity_reporting = excluded.activity_reporting,
    health_reporting = excluded.health_reporting,
    granted_scopes = excluded.granted_scopes,
    granted_at = excluded.granted_at,
    updated_at = excluded.updated_at
`);

const getDeviceConsentById = db.prepare(`
  SELECT
    device_id,
    consent_version,
    activity_reporting,
    health_reporting,
    granted_scopes,
    granted_at,
    updated_at
  FROM device_consents
  WHERE device_id = ?
  LIMIT 1
`);

type DeviceConsentRow = {
  device_id: string;
  consent_version: number;
  activity_reporting: number;
  health_reporting: number;
  granted_scopes: string;
  granted_at: string;
  updated_at: string;
};

const REQUIRE_EXPLICIT_CONSENT = /^(1|true|yes)$/i.test(
  process.env.REQUIRE_EXPLICIT_CONSENT || "1"
);

export function isExplicitConsentRequired(): boolean {
  return REQUIRE_EXPLICIT_CONSENT;
}

export async function getDeviceConsent(deviceId: string): Promise<DeviceConsentRow | null> {
  return (await getDeviceConsentById.get(deviceId) as DeviceConsentRow | undefined) || null;
}

export async function canReportActivity(deviceId: string): Promise<boolean> {
  if (!REQUIRE_EXPLICIT_CONSENT) return true;
  const consent = await getDeviceConsent(deviceId);
  return !!consent && consent.activity_reporting === 1;
}

export async function canReportHealth(deviceId: string): Promise<boolean> {
  if (!REQUIRE_EXPLICIT_CONSENT) return true;
  const consent = await getDeviceConsent(deviceId);
  return !!consent && consent.health_reporting === 1;
}

export async function cleanupUnconfiguredDeviceData(allowedDeviceIds: string[]): Promise<{
  deviceStatesDeleted: number; activitiesDeleted: number; healthRecordsDeleted: number;
}> {
  if (!allowedDeviceIds.length) return { deviceStatesDeleted: 0, activitiesDeleted: 0, healthRecordsDeleted: 0 };
  const placeholders = allowedDeviceIds.map(() => "?").join(", ");
  const results = await db.batch([
    { sql: `DELETE FROM device_states WHERE device_id NOT IN (${placeholders})`, args: allowedDeviceIds },
    { sql: `DELETE FROM activities WHERE device_id NOT IN (${placeholders})`, args: allowedDeviceIds },
    { sql: `DELETE FROM health_records WHERE device_id NOT IN (${placeholders})`, args: allowedDeviceIds },
  ]);
  return { deviceStatesDeleted: results[0]!.changes, activitiesDeleted: results[1]!.changes, healthRecordsDeleted: results[2]!.changes };
}

export default db;
