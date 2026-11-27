/** Поиск элементов с понятной ошибкой, если разметка разошлась с кодом. */
export function need<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Не найден элемент: ${selector}`);
  }
  return element;
}
