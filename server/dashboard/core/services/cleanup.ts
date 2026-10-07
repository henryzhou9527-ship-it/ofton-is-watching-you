import { Logger } from '@nestjs/common';
import { cleanupOldActivities, markOfflineDevices } from "../db";
let lastCleanup = 0;
let cleanupPending: Promise<void> | null = null;
export async function runRequestMaintenance(): Promise<void> {
  if (Date.now() - lastCleanup < 60 * 60 * 1000) return;
  if (!cleanupPending) {
    cleanupPending = cleanupOldActivities.run().then(() => { lastCleanup = Date.now(); })
      .finally(() => { cleanupPending = null; });
  }
  await cleanupPending;
}
// Request-time maintenance provides cloud correctness; no cloud timers.
if (!process.env.VERCEL && process.env.STORAGE_PROVIDER !== "libsql") {
  setInterval(() => { void runRequestMaintenance().catch(() => Logger.error("[cleanup] Failed")); }, 60 * 60 * 1000);
  setInterval(() => { void markOfflineDevices.run().catch(() => {}); }, 60_000);
}
