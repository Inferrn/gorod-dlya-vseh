/**
 * ============================================================================
 *  dom.ts — мелкие помощники для сборки разметки
 * ============================================================================
 *
 *  Проект без фреймворка, поэтому элементы создаются руками. Эти три
 *  функции убирают повторяющийся шум: createElement + className + innerHTML
 *  на каждой строке.
 * ============================================================================
 */

/** Создать элемент: `el("div", "card", "<p>…</p>")`. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/** Найти элемент внутри корня и упасть с понятной ошибкой, если его нет. */
export function must<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`[dom] не найден элемент «${selector}»`);
  return node;
}

/** Подпись координат как в макете: «53.196659, 50.174520». */
export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
