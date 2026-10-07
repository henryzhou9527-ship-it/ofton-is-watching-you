import { db, cleanupOldActivities, markOfflineDevices } from "../db";

let lastAttempt = 0;
let pending: Promise<void> | undefined;
const claim = db.prepare(`
  INSERT INTO maintenance_state(name, last_run_at) VALUES ('hourly', ?)
  ON CONFLICT(name) DO UPDATE SET last_run_at = excluded.last_run_at
  WHERE maintenance_state.last_run_at < ?
`);
const release = db.prepare("DELETE FROM maintenance_state WHERE name = 'hourly' AND last_run_at = ?");

export async function runRequestMaintenance(force = false): Promise<void> {
  if (!force && Date.now() - lastAttempt < 60 * 60 * 1000) return;
  if (!pending) {
    const stamp = Date.now();
    pending = (async () => {
      const acquired = await claim.run(stamp, stamp - 60 * 60 * 1000);
      if (acquired.changes) {
        try {
          await db.batch([
            { sql: cleanupOldActivities.sql }, // Original seven-day retention; no extra data reduction.
            { sql: markOfflineDevices.sql },
            { sql: "DELETE FROM visitor_heartbeats WHERE last_seen < ?", args: [stamp - 30_000] },
            { sql: "INSERT INTO maintenance_state(name,last_run_at) VALUES ('timeline_revision',?) ON CONFLICT(name) DO UPDATE SET last_run_at=excluded.last_run_at", args: [stamp] },
          ]);
        } catch (error) {
          await release.run(stamp).catch(() => {});
          throw error;
        }
      }
      lastAttempt = stamp;
    })().finally(() => { pending = undefined; });
  }
  await pending;
}
