import { useEffect, useRef } from 'react';
import { createPageGesture, createTouchPageGesture, wheelPixels } from '@/lib/page-gesture';
import type { Scene } from './useSceneNavigation';

function canScroll(target: Element, root: HTMLElement, direction: number) {
  let element: Element | null = target;
  while (element && element !== root) {
    if (element instanceof HTMLElement && element.scrollHeight > element.clientHeight + 2 && /auto|scroll|overlay/.test(getComputedStyle(element).overflowY)) {
      const remaining = element.scrollHeight - element.clientHeight - element.scrollTop;
      if (direction > 0 ? remaining > 2 : element.scrollTop > 2) return true;
    }
    element = element.parentElement;
  }
  return false;
}

export function usePageGestures(scene: Scene, navigate: (scene: Scene) => void, enabled = true) {
  const root = useRef<HTMLDivElement>(null);
  const gesture = useRef(createPageGesture());
  const touchGesture = useRef(createTouchPageGesture());
  const suppressedClick = useRef<{ target: Element; until: number } | null>(null);
  useEffect(() => {
    const element = root.current;
    if (!element || !enabled) return;
    const guarded = (event: WheelEvent | KeyboardEvent | TouchEvent) => event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
      !(event.target instanceof Element) || !!event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="slider"]');
    let touchId: number | null = null;
    let touchTarget: Element | null = null;
    const cancelTouch = () => { touchId = null; touchTarget = null; touchGesture.current.cancel(); };
    const nativeSelection = () => (window.visualViewport?.scale ?? 1) > 1.01 || window.getSelection()?.isCollapsed === false;
    const turn = (direction: number) => {
      const next = direction > 0 ? 'today' : 'now';
      if (next !== scene) {
        const focusNavigation = !!document.activeElement?.closest('.scene-tabs');
        navigate(next);
        if (focusNavigation) document.getElementById(`scene-tab-${next}`)?.focus({ preventScroll: true });
      }
    };
    const wheel = (event: WheelEvent) => {
      if (event.defaultPrevented || guarded(event) || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const delta = wheelPixels(event.deltaY, event.deltaMode, element.clientHeight);
      const result = gesture.current.next(delta, performance.now(), canScroll(event.target as Element, element, Math.sign(delta)));
      if (result === 'native') return;
      event.preventDefault();
      if (result === 'next' || result === 'previous') turn(result === 'next' ? 1 : -1);
    };
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || guarded(event) || event.repeat || !['PageDown', 'PageUp'].includes(event.key)) return;
      const direction = event.key === 'PageDown' ? 1 : -1;
      if (canScroll(event.target as Element, element, direction)) return;
      event.preventDefault(); turn(direction);
    };
    const touchStart = (event: TouchEvent) => {
      cancelTouch();
      suppressedClick.current = null;
      if (event.defaultPrevented || event.touches.length !== 1 || guarded(event) || nativeSelection()) return;
      const point = event.touches[0];
      touchId = point.identifier;
      touchTarget = event.target as Element;
      // Capture the scroll position before the browser moves content. The whole
      // gesture belongs to that list even if it reaches a boundary mid-swipe.
      touchGesture.current.begin(point.clientX, point.clientY, performance.now(), {
        previous: canScroll(touchTarget, element, -1),
        next: canScroll(touchTarget, element, 1),
      });
    };
    const touchMove = (event: TouchEvent) => {
      if (touchId === null) return;
      if (event.defaultPrevented || event.touches.length !== 1 || nativeSelection()) { cancelTouch(); return; }
      const point = Array.from(event.touches).find(touch => touch.identifier === touchId);
      if (!point) { cancelTouch(); return; }
      touchGesture.current.move(point.clientX, point.clientY);
    };
    const touchEnd = (event: TouchEvent) => {
      if (touchId === null) return;
      if (event.defaultPrevented || event.touches.length || nativeSelection()) { cancelTouch(); return; }
      const point = Array.from(event.changedTouches).find(touch => touch.identifier === touchId);
      if (!point) { cancelTouch(); return; }
      const result = touchGesture.current.end(point.clientX, point.clientY, performance.now());
      if ((result === 'next' || result === 'previous') && touchTarget) {
        suppressedClick.current = { target: touchTarget, until: performance.now() + 400 };
        turn(result === 'next' ? 1 : -1);
      }
      cancelTouch();
    };
    const click = (event: MouseEvent) => {
      const blocked = suppressedClick.current;
      if (!blocked || performance.now() > blocked.until) { suppressedClick.current = null; return; }
      if (event.detail === 0 || !(event.target instanceof Element)) return;
      if (blocked.target === event.target || blocked.target.contains(event.target) || event.target.contains(blocked.target)) {
        event.preventDefault(); event.stopPropagation(); suppressedClick.current = null;
      }
    };
    element.addEventListener('wheel', wheel, { passive: false });
    element.addEventListener('keydown', key);
    element.addEventListener('touchstart', touchStart, { passive: true });
    element.addEventListener('touchmove', touchMove, { passive: true });
    element.addEventListener('touchend', touchEnd, { passive: true });
    element.addEventListener('touchcancel', cancelTouch, { passive: true });
    element.addEventListener('click', click, true);
    return () => {
      cancelTouch();
      element.removeEventListener('wheel', wheel); element.removeEventListener('keydown', key);
      element.removeEventListener('touchstart', touchStart); element.removeEventListener('touchmove', touchMove);
      element.removeEventListener('touchend', touchEnd); element.removeEventListener('touchcancel', cancelTouch);
      element.removeEventListener('click', click, true);
    };
  }, [scene, navigate, enabled]);
  return root;
}
