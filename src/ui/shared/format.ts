/** Форматирование чисел для интерфейса. */

const POINTS = new Intl.NumberFormat("ru-RU");

/** 10500 → «10 500». Пробел — неразрывный, число не разорвётся на две строки. */
export function formatPoints(value: number): string {
  return POINTS.format(Math.round(value));
}
