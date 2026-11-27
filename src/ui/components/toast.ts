import { need } from "../shared/dom";

let hideTimer: number | undefined;

/** Показать короткое сообщение внизу экрана. */
export function showToast(text: string, duration = 2400): void {
  const toast = need("#toast");
  toast.textContent = text;
  toast.classList.add("is-visible");

  if (hideTimer !== undefined) window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    hideTimer = undefined;
  }, duration);
}
