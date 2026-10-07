import { useEffect, useRef } from 'react';
import { createPageGesture, wheelPixels } from '@/lib/page-gesture';
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

export function usePageGestures(scene: Scene, navigate: (scene: Scene) => void) {
  const root = useRef<HTMLDivElement>(null);
  const gesture = useRef(createPageGesture());
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const guarded = (event: WheelEvent | KeyboardEvent) => event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
      !(event.target instanceof Element) || !!event.target.closest('input,textarea,select,[contenteditable="true"],[role="slider"]');
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
    element.addEventListener('wheel', wheel, { passive: false });
    element.addEventListener('keydown', key);
    return () => { element.removeEventListener('wheel', wheel); element.removeEventListener('keydown', key); };
  }, [scene, navigate]);
  return root;
}
