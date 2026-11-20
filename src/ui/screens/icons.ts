/**
 * ============================================================================
 *  icons.ts — иконки интерфейса
 * ============================================================================
 *
 *  Все иконки — инлайновые SVG с обводкой (stroke), как в макете: тонкая
 *  линия 1.7, скруглённые концы. Иконочный шрифт или спрайт-файл не нужны:
 *  иконок мало, а инлайн-SVG наследует цвет через currentColor и не требует
 *  отдельного запроса.
 *
 *  Использование: element.innerHTML = icon("close", 24).
 * ============================================================================
 */

/** Все контуры в одной системе координат 24×24. */
const PATHS: Record<string, string> = {
  search:
    '<circle cx="11" cy="11" r="7"/><path d="m16.2 16.2 4.1 4.1"/>',
  mic:
    '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
  pin: '<path d="M12 21.5s7-6.4 7-11.5a7 7 0 1 0-14 0c0 5.1 7 11.5 7 11.5Z"/><circle cx="12" cy="9.8" r="2.6"/>',
  close: '<path d="m6.5 6.5 11 11m0-11-11 11"/>',
  chevron: '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.4a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.2-2.6 4"/><circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none"/>',
  check: '<path d="m5 12.5 4.6 4.6L19 7.5"/>',
  route:
    '<circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="6.5" r="2.5"/><path d="M9 17.5h3.2a3.3 3.3 0 0 0 0-6.6H9a3.2 3.2 0 0 1 0-6.4h3.2"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  minus: '<path d="M5.5 12h13"/>',
  locate:
    '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
  map: '<path d="M9 3.6 3.5 5.8v14.6L9 18.2l6 2.2 5.5-2.2V3.6L15 5.8 9 3.6ZM9 3.6v14.6m6-12.4v14.6"/>',
  pencil:
    '<path d="M4 20h4L20 8l-4-4L4 16v4Zm10-14 4 4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  arrowLeft: '<path d="M20 12H4m0 0 6-6m-6 6 6 6"/>',
  arrowRight: '<path d="M4 12h16m0 0-6-6m6 6-6 6"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5v-3a1.5 1.5 0 0 0-1.5-1.5H5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 5 16h3.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.4"/><circle cx="12" cy="7.9" r="0.9" fill="currentColor" stroke="none"/>',
  heart:
    '<path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.6 12 20 12 20Z"/>',
};

/**
 * Разметка иконки.
 * @param name  ключ из PATHS
 * @param size  сторона квадрата в px (по умолчанию 24)
 */
export function icon(name: keyof typeof PATHS | string, size = 24): string {
  const body = PATHS[name];
  if (!body) {
    // Опечатка в имени иконки не должна ломать вёрстку: пустой квадрат
    // заметен сразу, а ошибка — в консоли.
    console.warn(`[icons] нет иконки «${name}»`);
    return "";
  }

  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="1.7" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true">${body}</svg>`
  );
}
