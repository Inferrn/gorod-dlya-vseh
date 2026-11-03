/**
 * ============================================================================
 *  ScreenManager — анимированная смена основных экранов
 * ============================================================================
 *  Экраны лежат стопкой (position: absolute) и переключаются классами, а
 *  сам переход — это Web Animations API: уходящий уезжает назад и гаснет,
 *  приходящий въезжает сбоку. Направление зависит от того, куда идём:
 *    карта → рейтинг  — справа налево;
 *    рейтинг → карта  — слева направо.
 *
 *  Такой переход не требует пересчёта layout и не мешает Leaflet: карта
 *  просто едет вместе со своим контейнером.
 * ============================================================================
 */

import { EASE_OUT, prefersReducedMotion } from "../shared/motion";

export type MainScreenKey = "rating" | "map";

interface ShowOptions {
  /** Откуда въезжает новый экран. */
  from?: "left" | "right";
  /** false — показать сразу, без анимации (старт по ссылке). */
  animate?: boolean;
}

export class ScreenManager {
  private current: MainScreenKey;
  /** Растёт на каждом переходе: старые переходы перестают трогать классы. */
  private token = 0;
  private running: Animation[] = [];

  constructor(
    private readonly screens: Record<MainScreenKey, HTMLElement>,
    initial: MainScreenKey = "rating",
  ) {
    this.current = initial;
    this.screens[initial].classList.add("is-active");
    this.screens[initial].setAttribute("aria-hidden", "false");
  }

  /** Какой экран активен сейчас. */
  get activeScreen(): MainScreenKey {
    return this.current;
  }

  async show(next: MainScreenKey, options: ShowOptions = {}): Promise<void> {
    if (next === this.current) return;

    const token = ++this.token;
    const animate = options.animate ?? true;
    const from = options.from ?? "right";
    const direction = from === "right" ? 1 : -1;

    const previous = this.screens[this.current];
    const incoming = this.screens[next];

    this.cancelRunning();

    incoming.classList.add("is-active");
    incoming.setAttribute("aria-hidden", "false");
    incoming.style.zIndex = "2";
    previous.style.zIndex = "1";

    // Ветку «сдвиг 36px» даём даже без анимации — тогда экран не мигает.
    const distance = prefersReducedMotion() || !animate ? 0 : 36;
    const duration = prefersReducedMotion() || !animate ? 0 : 480;

    const out = previous.animate(
      [
        { opacity: 1, transform: "translateX(0) scale(1)" },
        { opacity: 0, transform: `translateX(${-18 * direction}px) scale(0.985)` },
      ],
      { duration: duration * 0.85, easing: EASE_OUT, fill: "both" },
    );

    const incomingAnimation = incoming.animate(
      [
        { opacity: 0, transform: `translateX(${distance * direction}px)` },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration, easing: EASE_OUT, fill: "both" },
    );

    this.running = [out, incomingAnimation];
    this.current = next;

    try {
      await Promise.all([out.finished, incomingAnimation.finished]);
    } catch {
      // Переход отменили более новым — просто выходим.
    }

    if (token !== this.token) return;

    out.cancel();
    incomingAnimation.cancel();
    this.running = [];

    previous.classList.remove("is-active");
    previous.setAttribute("aria-hidden", "true");
    previous.style.zIndex = "";
    incoming.style.zIndex = "";
  }

  private cancelRunning(): void {
    for (const animation of this.running) {
      try {
        animation.cancel();
      } catch {
        // Уже отменена — не страшно.
      }
    }
    this.running = [];
  }
}
