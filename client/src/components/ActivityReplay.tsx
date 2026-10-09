import type { DeviceState } from '@/lib/api';
import { clockText, durationText, isIdle } from '@/lib/activity-view';
import type { ReplaySession } from '@/lib/replay-groups';
import { playfulDuration, preciseDuration, timeMood } from '@/lib/playful-time';
import { classifyApp } from '@/lib/app-categories';
import { CategoryBadge } from './ActivityCategory';
import { DeviceIcon } from './ActivityViews';

export default function ActivityReplay({ sessions, devices }: { sessions: ReplaySession[]; devices: DeviceState[] }) {
  return <ol className="replay-feed">{sessions.map((session, index) => {
    const count = session.parts?.length ?? 1;
    const grouped = count > 1;
    const showSeconds = session.end - session.start < 60000;
    const start = clockText(session.start, showSeconds);
    const end = clockText(session.end, showSeconds);
    const totalText = session.seconds < 60 ? `${Math.max(1, Math.floor(session.seconds))}秒` : durationText(session.seconds);
    const device = devices.find(item => item.device_id === session.device_id);
    const caption = session.status_text || (isIdle(session) ? '暂时离开了喵~' : `正在使用${session.app_name}喵~`);
    return <li className="replay-entry" key={`${session.device_id}-${session.start}-${index}`}>
      <time className="replay-time" dateTime={new Date(session.start).toISOString()}><span>{timeMood(session.start)}</span><small>{start}{start !== end ? ` — ${end}` : ''}</small></time>
      <div className="replay-story"><i className="replay-dot" style={{ backgroundColor: session.color }} /><div><p>{caption}</p><div className="replay-meta"><span>{isIdle(session) ? '暂时离开' : session.app_name}</span>{!isIdle(session) && <CategoryBadge category={classifyApp(session)} />}{grouped && <span className="replay-group-tag" title={`间隔的 ${preciseDuration(session.interruptionSeconds ?? 0)} 不计入使用时长`}>{count}段合并</span>}<span><DeviceIcon platform={device?.platform ?? ''} size={14} />{session.device_name}</span></div></div></div>
      <span className="replay-duration" title={preciseDuration(session.seconds)}>{grouped && session.seconds > 0 ? `累计${totalText}喵` : playfulDuration(session.seconds)}</span>
    </li>;
  })}</ol>;
}
