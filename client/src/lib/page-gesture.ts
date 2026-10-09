export type PageGestureResult = 'native' | 'hold' | 'previous' | 'next';

export function wheelPixels(delta: number, mode: number, pageHeight: number) {
  return delta * (mode === 1 ? 16 : mode === 2 ? pageHeight : 1);
}

/** One deliberate wheel/trackpad gesture turns one page, never its momentum tail. */
export function createPageGesture() {
  let lastAt = -Infinity;
  let lockedUntil = -Infinity;
  let total = 0;
  let direction = 0;
  let consumed: 'page' | 'native' | null = null;
  return {
    next(delta: number, at: number, nativeCanScroll: boolean): PageGestureResult {
      if (!Number.isFinite(delta) || !delta) return 'native';
      if (at - lastAt > 200) { total = 0; direction = 0; consumed = null; }
      lastAt = at;
      if (consumed === 'page' || at < lockedUntil) return 'hold';
      if (nativeCanScroll) { consumed = 'native'; return 'native'; }
      if (consumed === 'native') return 'hold';
      const sign = Math.sign(delta);
      if (sign !== direction) { direction = sign; total = 0; }
      total += Math.min(Math.abs(delta), 160);
      if (total < 42) return 'hold';
      consumed = 'page'; lockedUntil = at + 360;
      return sign > 0 ? 'next' : 'previous';
    },
  };
}

interface TouchScrollOrigin { previous: boolean; next: boolean }

/** Observe a finger gesture without taking native scrolling or pinch zoom away. */
export function createTouchPageGesture() {
  let start: { x: number; y: number; scroll: TouchScrollOrigin; mode: 'pending' | 'page' | 'native' | 'blocked' } | null = null;
  let lockedUntil = -Infinity;
  const move = (x: number, y: number): PageGestureResult => {
    if (!start || !Number.isFinite(x) || !Number.isFinite(y)) return 'native';
    if (start.mode === 'native') return 'native';
    if (start.mode === 'blocked' || start.mode === 'page') return 'hold';
    const dx = x - start.x;
    const dy = start.y - y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return 'native';
    if (Math.abs(dx) > Math.abs(dy) * 1.25) {
      start.mode = 'native'; return 'native';
    }
    if (Math.abs(dy) <= Math.abs(dx) * 1.25) return 'native';
    if (start.scroll[dy > 0 ? 'next' : 'previous']) { start.mode = 'native'; return 'native'; }
    start.mode = 'page'; return 'hold';
  };
  return {
    begin(x: number, y: number, at: number, scroll: TouchScrollOrigin) {
      start = Number.isFinite(x) && Number.isFinite(y) ? { x, y, scroll, mode: at < lockedUntil ? 'blocked' : 'pending' } : null;
    },
    move,
    end(x: number, y: number, at: number): PageGestureResult {
      move(x, y);
      const origin = start;
      start = null;
      if (!origin || origin.mode !== 'page' || !Number.isFinite(x) || !Number.isFinite(y)) return 'native';
      const dx = x - origin.x;
      const dy = origin.y - y;
      if (Math.abs(dy) < 56 || Math.abs(dy) <= Math.abs(dx) * 1.25) return 'native';
      // A reversal may end in the direction where native content can still scroll.
      if (origin.scroll[dy > 0 ? 'next' : 'previous']) return 'native';
      lockedUntil = at + 360;
      return dy > 0 ? 'next' : 'previous';
    },
    cancel() { start = null; },
  };
}
