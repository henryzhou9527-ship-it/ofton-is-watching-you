import { createHmac } from "node:crypto";
import { db } from "../db";

const TIMEOUT_MS = 30_000;
const MAX_ENTRIES = 10_000;
const BOT_PATTERNS = [
  "bot", "crawl", "spider", "slurp", "mediapartners", "facebookexternalhit",
  "linkedinbot", "twitterbot", "whatsapp", "telegrambot", "discordbot",
  "bingpreview", "yandex", "baidu", "sogou", "bytespider", "applebot",
  "amazonbot", "gptbot", "claudebot", "anthropic", "semrush", "ahref",
  "mj12bot", "dotbot", "petalbot", "dataforseo", "headlesschrome",
  "phantomjs", "puppeteer", "lighthouse", "pagespeed", "pingdom", "uptimerobot",
];
const heartbeat = db.prepare(`
  INSERT INTO visitor_heartbeats(visitor_key, last_seen)
  SELECT ?, ? WHERE EXISTS(SELECT 1 FROM visitor_heartbeats WHERE visitor_key = ?)
    OR (SELECT COUNT(*) FROM visitor_heartbeats WHERE last_seen >= ?) < ?
  ON CONFLICT(visitor_key) DO UPDATE SET last_seen = excluded.last_seen
`);
const count = db.prepare("SELECT COUNT(*) AS count FROM visitor_heartbeats WHERE last_seen >= ?");

// Original unique-IP/30s behavior across replicas; only keyed hashes are persisted.
export const visitors = {
  async heartbeat(ip: string, userAgent?: string): Promise<void> {
    if (!ip || (userAgent && BOT_PATTERNS.some(p => userAgent.toLowerCase().includes(p)))) return;
    const key = createHmac("sha256", process.env.HASH_SECRET!)
      .update("live-dashboard-viewer\0" + ip).digest("hex");
    const now = Date.now();
    await heartbeat.run(key, now, key, now - TIMEOUT_MS, MAX_ENTRIES);
  },
  async getCount(): Promise<number> {
    return Number((await count.get(Date.now() - TIMEOUT_MS))?.count ?? 0);
  },
};
