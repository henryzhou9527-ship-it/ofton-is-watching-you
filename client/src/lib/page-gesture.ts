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
