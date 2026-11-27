/**
 * ============================================================================
 *  LogoutScreen — экран 4 «Подтверждение выхода»
 * ============================================================================
 *  Это оверлей поверх рейтинга. Появляется круговой «шторкой» из кнопки
 *  профиля (clip-path circle), поэтому ему не подходит общий ScreenManager:
 *  у шторки свой тайминг и своя точка раскрытия.
 *
 *  Экран отвечает только за себя: анимацию, фокус и состояние кнопки.
 *  Что значит «Выйти» — решает app.ts через onConfirm.
 * ============================================================================
 */

import { need } from "../shared/dom";
import { prefersReducedMotion } from "../shared/motion";

/** Длительность раскрытия шторки — совпадает с transition в logout.css. */
const REVEAL_MS = 560;

export interface LogoutScreenOptions {
  onCancel: () => void;
  onConfirm: () => void;
}

export class LogoutScreen {
  private readonly root: HTMLElement;
  private readonly confirmButton: HTMLButtonElement;
  private readonly cancelButton: HTMLButtonElement;
  private readonly device: HTMLElement;

  private open = false;
  private busy = false;
  private lastFocused: HTMLElement | null = null;

  constructor(private readonly options: LogoutScreenOptions) {
    this.root = need('[data-screen="logout"]');
    this.device = need("#device");
    this.confirmButton = need("#logout-confirm");
    this.cancelButton = need("#logout-cancel");

    this.cancelButton.addEventListener("click", () => this.options.onCancel());
    this.confirmButton.addEventListener("click", () => {
      if (!this.busy) this.options.onConfirm();
    });
  }

  get isOpen(): boolean {
    return this.open;
  }

  /**
   * Открыть шторку.
   * @param origin точка на экране устройства, откуда раскрывается круг
   *               (центр кнопки профиля). Без неё — из нижнего края.
   */
  openAt(origin?: { x: number; y: number }): void {
    if (this.open) return;

    const box = this.device.getBoundingClientRect();
    const x = origin ? origin.x - box.left : box.width / 2;
    const y = origin ? origin.y - box.top : box.height;

    this.root.style.setProperty("--ox", `${x}px`);
    this.root.style.setProperty("--oy", `${y}px`);

    this.lastFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    this.open = true;
    this.root.classList.add("is-active");
    this.root.setAttribute("aria-hidden", "false");

    window.setTimeout(() => {
      if (this.open) this.root.focus({ preventScroll: true });
    }, prefersReducedMotion() ? 0 : REVEAL_MS * 0.6);
  }

  /** Закрыть и дождаться, пока шторка сожмётся. */
  async close(): Promise<void> {
    if (!this.open) return;

    this.open = false;
    this.setBusy(false);
    this.root.classList.remove("is-active");
    this.root.setAttribute("aria-hidden", "true");

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, prefersReducedMotion() ? 0 : REVEAL_MS);
    });

    if (this.lastFocused?.isConnected) {
      this.lastFocused.focus({ preventScroll: true });
    }
    this.lastFocused = null;
  }

  /** Состояние «отправляем»: кнопка выключается и показывает крутилку. */
  setBusy(busy: boolean): void {
    this.busy = busy;
    this.confirmButton.disabled = busy;
    this.cancelButton.disabled = busy;

    if (busy) {
      const spinner = document.createElement("span");
      spinner.className = "btn__spinner";
      this.confirmButton.replaceChildren(spinner, document.createTextNode("Выходим…"));
    } else {
      this.confirmButton.textContent = "Выйти";
    }
  }
}
