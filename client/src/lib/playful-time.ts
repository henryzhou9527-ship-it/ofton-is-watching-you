import { durationText } from './activity-view';

export function playfulDuration(seconds: number) {
  if (seconds <= 0) return '刚探了个头喵';
  if (seconds < 60) return `才${Math.max(1, Math.floor(seconds))}秒就溜了喵`;
  if (seconds < 300) return `溜达了${durationText(seconds)}喵`;
  if (seconds < 3600) return `窝了${durationText(seconds)}喵`;
  return `一不小心就${durationText(seconds)}喵`;
}

export function preciseDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  return [hours ? `${hours}小时` : '', minutes ? `${minutes}分` : '', rest || !safe ? `${rest}秒` : ''].join('');
}

export function timeMood(time: number) {
  const hour = new Date(time).getHours();
  if (hour < 5) return '深夜出没喵';
  if (hour < 9) return '清早冒泡喵';
  if (hour < 12) return '上午来过喵';
  if (hour < 14) return '中午晃晃喵';
  if (hour < 18) return '午后冒泡喵';
  if (hour < 21) return '傍晚来过喵';
  return '夜猫出没喵';
}

export function playfulHour(hour: number) {
  const part = hour < 6 ? '凌晨' : hour < 12 ? '上午' : hour < 14 ? '中午' : hour < 18 ? '下午' : '晚上';
  const value = hour > 12 ? hour - 12 : hour;
  return `${part}${value}点最热闹喵`;
}
