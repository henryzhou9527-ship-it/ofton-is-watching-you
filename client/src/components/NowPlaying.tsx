import { Headphones, Play, Clapperboard } from 'lucide-react';
import type { NowPlayingItem } from '@/lib/now-playing';

export default function NowPlaying({ items }: { items: NowPlayingItem[] }) {
  if (!items.length) return null;
  return <div className="now-playing" aria-label="正在播放" aria-live="polite">
    {items.map(item => {
      const Icon = item.kind === 'music' ? Headphones : item.kind === 'video' ? Clapperboard : Play;
      const label = item.kind === 'music' ? '正在听' : item.kind === 'video' ? '正在看' : '正在播放';
      return <div className="playing-item" key={item.key}>
        <Icon size={19} aria-hidden="true" />
        <div className="playing-copy"><span className="playing-source">{label}<span>{[item.deviceName, item.source].filter(Boolean).join(' · ')}</span></span>
          <p className="playing-title" title={item.title}>{item.title}</p>
          {item.artist && <span className="playing-artist" title={item.artist}>{item.artist}</span>}
        </div>
      </div>;
    })}
  </div>;
}
