export const JUAN_EGGS = [
  { id: 'ledge', pose: 0, motion: 'ledge', place: 'bottom', caption: '在看什么呀？', announcement: '小卷从下面探头了。' },
  { id: 'left-peek', pose: 1, motion: 'left', place: 'left', caption: '', announcement: '小卷从左边悄悄看过来。' },
  { id: 'right-peek', pose: 2, motion: 'right', place: 'right', caption: '就看一眼。', announcement: '小卷在右边偷看。' },
  { id: 'binoculars', pose: 3, motion: 'spy', place: 'near', caption: '', announcement: '小卷举起了小望远镜。' },
  { id: 'blanket', pose: 4, motion: 'blanket', place: 'corner', caption: '困了。', announcement: '小卷缩进了被子。' },
  { id: 'fish', pose: 5, sprite: 'juan-chibi-shark.png', motion: 'fish', place: 'bottom', caption: '', announcement: '小卷抱着蓝色鲨鱼玩偶坐下了。' },
  { id: 'wave', pose: 6, motion: 'wave', place: 'near', caption: '嗨。', announcement: '小卷朝你挥挥手。' },
  { id: 'hat', pose: 7, motion: 'hat', place: 'corner', caption: '', announcement: '小卷害羞地压低了帽檐。' },
  { id: 'caught', pose: 8, motion: 'caught', place: 'near', caption: '欸？', announcement: '偷看的小卷被发现了。' },
  { id: 'shh', pose: 9, motion: 'shh', place: 'right', caption: '嘘。', announcement: '小卷示意悄悄看。' },
] as const;

export type JuanEgg = typeof JUAN_EGGS[number];

/** A shuffled deck: all ten appear once before any repeat, including across the boundary. */
export function nextEgg(deck: number[], previous: number | null, random = Math.random) {
  if (!deck.length) {
    const values = JUAN_EGGS.map((_, index) => index);
    for (let index = values.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [values[index], values[other]] = [values[other]!, values[index]!];
    }
    const last = values.length - 1;
    if (values[last] === previous) [values[0], values[last]] = [values[last]!, values[0]!];
    deck.push(...values);
  }
  return deck.pop()!;
}

export function eggPosition(place: JuanEgg['place'], point: { x: number; y: number }, viewport: { width: number; height: number }) {
  const size = viewport.width < 600 ? 128 : 164;
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, Math.max(low, high)));
  const left = clamp(point.x - size / 2, 12, viewport.width - size - 12);
  const top = clamp(point.y - size - 24, 66, viewport.height - size - 14);
  if (place === 'left') return { left: -14, top: clamp(point.y - size / 2, 70, viewport.height - size - 20), size };
  if (place === 'right') return { left: viewport.width - size + 14, top: clamp(point.y - size / 2, 70, viewport.height - size - 20), size };
  if (place === 'bottom') return { left, top: viewport.height - size + 7, size };
  if (place === 'corner') return { left: viewport.width - size - 14, top: viewport.height - size - 12, size };
  return { left, top, size };
}
