/** Preserve ordinary features while keeping file/window-derived document details private. */
import { resolveAppMeta } from "./app-mapper";
import { resolveMediaSource } from "../../../../shared/media-sources";
import { PRIVATE_FILE_TITLE as FILE_OR_PATH } from "../../../../shared/media-title";

export function protectDetails(_windowDerivedDetail: unknown): string {
  // Browser document captions and extensionless filenames cannot be separated reliably.
  // App names, status descriptions, music, battery and history use independent fields.
  return "";
}

export function protectExtra(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const extra: Record<string, unknown> = {};
  if (typeof input.battery_percent === "number" && Number.isFinite(input.battery_percent))
    extra.battery_percent = Math.max(0, Math.min(100, Math.round(input.battery_percent)));
  if (typeof input.battery_charging === "boolean") extra.battery_charging = input.battery_charging;
  for (const channel of ['music', 'video']) {
    if (!input[channel] || typeof input[channel] !== 'object' || Array.isArray(input[channel])) continue;
    const source = input[channel] as Record<string, unknown>;
    const music: Record<string, string> = {};
    const mediaSource = resolveMediaSource(source.app);
    if (typeof source.app === "string" && !FILE_OR_PATH.test(source.app)) music.app = source.app.slice(0, 64);
    if (mediaSource) {
      music.app = mediaSource.name;
      music.kind = mediaSource.kind;
      for (const key of ["title", "artist"]) {
        const value = source[key];
        if (typeof value === "string" && !FILE_OR_PATH.test(value)) music[key] = value.slice(0, 256);
      }
    }
    // Android sends package IDs. Normalize approved music/video sessions without exposing file titles.
    if (Object.keys(music).length) extra[channel] = music;
  }
  return extra;
}

export function protectProxyPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(protectProxyPayload);
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (["window_title", "file_name", "file_path", "path"].includes(key)) continue;
    if (key === "display_title") result[key] = "";
    else if (key === "extra") result[key] = protectExtra(item);
    else result[key] = protectProxyPayload(item);
  }
  if (typeof result.app_id === "string") {
    const meta = resolveAppMeta(result.app_id, typeof result.platform === "string" ? result.platform : "",
      typeof result.app_name === "string" && !FILE_OR_PATH.test(result.app_name) ? result.app_name : undefined);
    result.app_name = meta.appName;
    result.status_text = meta.statusText;
  }
  return result;
}
