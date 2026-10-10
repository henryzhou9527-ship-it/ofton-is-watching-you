// The welcome never waits indefinitely for the network or a failed image.
export const ENTRANCE_MIN_MS = 1350;
export const ENTRANCE_MAX_MS = 3200;
export function entranceCanClose(elapsed: number, ready: boolean, artReady: boolean) {
  return elapsed >= ENTRANCE_MAX_MS || (elapsed >= ENTRANCE_MIN_MS && ready && artReady);
}
export function entranceSwipe(dx: number, dy: number) {
  return dy < -50 && -dy > Math.abs(dx) * 1.25;
}
