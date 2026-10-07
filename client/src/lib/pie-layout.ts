import type { RankedApp } from './activity-view';

export type PieSlice = RankedApp & { start: number; end: number; share: number };
export function pieSlices(apps: RankedApp[]): PieSlice[] {
  const values = apps.filter(app => Number.isFinite(app.seconds) && app.seconds > 0);
  const total = values.reduce((sum, app) => sum + app.seconds, 0);
  let angle = -90;
  return values.map((app, index) => {
    const start = angle;
    const share = app.seconds / total;
    angle = index === values.length - 1 ? 270 : start + share * 360;
    return { ...app, start, end: angle, share };
  });
}

export function wedgePath(start: number, end: number, radius = 132) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return '';
  const point = (angle: number) => {
    const radians = angle * Math.PI / 180;
    return `${180 + radius * Math.cos(radians)} ${180 + radius * Math.sin(radians)}`;
  };
  if (end - start >= 359.999) return `M ${point(start)} A ${radius} ${radius} 0 1 1 ${point(start + 180)} A ${radius} ${radius} 0 1 1 ${point(start + 360)} Z`;
  return `M 180 180 L ${point(start)} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${point(end)} Z`;
}

export function percentText(share: number) {
  return share > 0 && share < .001 ? '<0.1%' : `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(share * 100)}%`;
}
