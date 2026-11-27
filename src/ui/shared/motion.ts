/**
 * ============================================================================
 *  motion.ts — маленькие помощники для анимаций
 * ============================================================================
 *  Здесь только то, что неудобно держать в CSS: счётчик очков и проверка
 *  системной настройки «уменьшить движение».
 * ============================================================================
 */

import { formatPoints } from "./format";

/** Короткая запись основной кривой разгона (совпадает с --ease-out в CSS). */
export const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Пользователь попросил систему не крутить анимации? */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Пауза в промисах (для последовательных переходов). */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Идущие счётчики по элементам — чтобы повторный запуск отменял прошлый. */
const running = new WeakMap<HTMLElement, number>();

/**
 * Анимировать число от 0 до значения.
 * Работает через requestAnimationFrame, поэтому не блокирует поток.
 * При «уменьшить движение» число появляется сразу.
 */
export function countUp(
  element: HTMLElement,
  to: number,
  options: { duration?: number; delay?: number } = {},
): void {
  const previous = running.get(element);
  if (previous !== undefined) {
    cancelAnimationFrame(previous);
    running.delete(element);
  }

  if (prefersReducedMotion()) {
    element.textContent = formatPoints(to);
    return;
  }

  const duration = Math.max(1, options.duration ?? 900);
  const startAt = performance.now() + (options.delay ?? 0);

  element.textContent = formatPoints(0);

  const tick = (now: number): void => {
    const progress = Math.min(1, Math.max(0, (now - startAt) / duration));
    // easeOutCubic: быстрый разгон и мягкое торможение — как в макете «дорого-богато».
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatPoints(to * eased);

    if (progress < 1) {
      running.set(element, requestAnimationFrame(tick));
    } else {
      element.textContent = formatPoints(to);
      running.delete(element);
    }
  };

  running.set(element, requestAnimationFrame(tick));
}
