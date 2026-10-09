import { memo, useMemo, type CSSProperties } from 'react';
import { BookOpen, BriefcaseBusiness, Gamepad2, Globe2, MessageCircle, MonitorPlay, Moon, Sparkles, Wrench, WifiOff, Radio } from 'lucide-react';
import { buildCategoryUsage, categoryMeta, isCategoryId, type CategoryId, type MoodId } from '@/lib/app-categories';
import type { Session } from '@/lib/activity-view';
import { preciseDuration } from '@/lib/playful-time';

const ICONS = { work: BriefcaseBusiness, game: Gamepad2, entertainment: MonitorPlay, study: BookOpen, browse: Globe2, social: MessageCircle, tools: Wrench, other: Sparkles };
export function CategoryBadge({ category }: { category: CategoryId }) {
  const meta = categoryMeta(category); const Icon = ICONS[category];
  return <span className="category-badge" style={{ '--category-color': meta.color } as CSSProperties}><Icon size={13} aria-hidden="true" />{meta.label}</span>;
}
const QUIET = {
  idle: { state: '暂时离开', quote: '人呢？刚刚还在这里的。', icon: Moon },
  offline: { state: '离线', quote: '没逮到人，等会儿再来。', icon: WifiOff },
  loading: { state: '连接中', quote: '让我探个头。', icon: Radio },
  error: { state: '信号中断', quote: '信号呢？我的信号呢？', icon: Radio },
};

export const ActivityMood = memo(function ActivityMood({ mood }: { mood: MoodId }) {
  const meta = isCategoryId(mood) ? categoryMeta(mood) : null;
  const quiet = !isCategoryId(mood) ? QUIET[mood] : null;
  const Icon = meta ? ICONS[meta.id] : quiet!.icon;
  return <aside className={`activity-mood mood-${mood}`} aria-label="当前活动分类" style={{ '--category-color': meta?.color ?? 'oklch(81% .045 270)' } as CSSProperties}>
    <img className="mood-sticker" src={`${import.meta.env.BASE_URL}art/${meta?.sprite ?? 'juan-mood-other.png'}`} alt={meta?.alt ?? '小卷歪头摊手，睁着蓝眼睛等人回来'} width={132} height={132} decoding="async" />
    <div className="mood-caption" key={mood}><span className="mood-label"><Icon size={16} aria-hidden="true" />{meta?.state ?? quiet!.state}</span><p>{meta?.quote ?? quiet!.quote}</p></div>
  </aside>;
});

export default function CategoryBreakdown({ sessions, onSelect }: { sessions: readonly Session[]; onSelect: (category: CategoryId) => void }) {
  const usage = useMemo(() => buildCategoryUsage(sessions), [sessions]);
  return <section className="category-breakdown" aria-label="活动分类统计"><div className="category-heading"><h3>时间花在哪</h3></div>
    {!usage.total ? <p className="category-empty">还没开始，先占个位。</p> : <>
      <div className="category-meter" aria-hidden="true">{usage.ranked.map(item => <span key={item.id} style={{ flexGrow: item.seconds, background: item.color }} />)}</div>
      <div className="category-legend">{usage.ranked.map(item => <button type="button" key={item.id} onClick={() => onSelect(item.id)} aria-label={`查看${item.label}记录，${preciseDuration(item.seconds)}`} title={preciseDuration(item.seconds)}><CategoryBadge category={item.id} /><span>{item.percent}%</span></button>)}</div>
    </>}
  </section>;
}
