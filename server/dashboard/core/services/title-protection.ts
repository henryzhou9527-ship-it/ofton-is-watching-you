/** Preserve ordinary features while keeping file/window-derived document details private. */
import { resolveAppMeta } from "./app-mapper";
const FILE_OR_PATH = /(?:file:\/\/|[a-z]:[\\/]|\\\\[^\\]+\\|(?:^|\s)\/[\w.-]+\/|\.(?:pdf|docx?|xlsx?|pptx?|odt|ods|odp|txt|md|csv|json|xml|ya?ml|py|tsx?|jsx?|cpp|h|rs|go|java|cs|sql|psd|ai|blend|dwg|zip|7z|rar|mp[34]|mkv|avi|flac|wav)(?:\b|$))/i;
const MUSIC_SOURCES = new Set(["spotify", "qq音乐", "网易云音乐", "apple music", "youtube music", "酷狗音乐", "酷我音乐", "amazon music"]);

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
  if (input.music && typeof input.music === "object" && !Array.isArray(input.music)) {
    const source = input.music as Record<string, unknown>;
    const music: Record<string, string> = {};
    if (typeof source.app === "string" && !FILE_OR_PATH.test(source.app)) music.app = source.app.slice(0, 64);
    const trustedMetadata = MUSIC_SOURCES.has((music.app || "").toLowerCase());
    if (trustedMetadata) {
      for (const key of ["title", "artist"]) {
        const value = source[key];
        if (typeof value === "string" && !FILE_OR_PATH.test(value)) music[key] = value.slice(0, 256);
      }
    }
    // Generic/local players often report a filename as their song title; preserve playback/app.
    if (Object.keys(music).length) extra.music = music;
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
