import type { DeviceState } from './api';
import { resolveMediaSource, type MediaKind } from '../../../shared/media-sources';

export interface NowPlayingItem {
  key: string;
  deviceId: string;
  deviceName: string;
  title: string;
  artist: string;
  source: string;
  kind: MediaKind | 'unknown';
}

export function getNowPlaying(devices: DeviceState[], now: number): NowPlayingItem[] {
  return devices.flatMap(device => {
    const age = now - Date.parse(device.last_seen_at);
    if (device.is_online !== 1 || !Number.isFinite(age) || age >= 120000) return [];
    const seen = new Set<string>();
    return (['music', 'video'] as const).flatMap(channel => {
      const music = device.extra?.[channel];
      const title = music?.title?.trim();
      if (!title) return [];
      const source = resolveMediaSource(music?.app);
      const duplicate = `${source?.name || music?.app}:${title}`;
      if (seen.has(duplicate)) return [];
      seen.add(duplicate);
      return [{
        key: `${device.device_id}:${channel}`,
        deviceId: device.device_id, deviceName: device.device_name, title,
        artist: music?.artist?.trim() || '', source: source?.name || music?.app?.trim() || '',
        kind: source?.kind || 'unknown',
      }];
    });
  });
}
