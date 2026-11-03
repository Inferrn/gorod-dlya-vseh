/**
 * ============================================================================
 *  RatingScreen — экраны 1–3 (три вида рейтинга в одном экране)
 * ============================================================================
 *  Виды «Таблица рейтинга», «Пьедестал» и «Рейтинг участников» — это не три
 *  разных экрана, а три слайда карусели. Переключаются:
 *    - свайпом влево/вправо по содержимому;
 *    - точками под карточкой;
 *    - стрелками клавиатуры;
 *    - сменой hash-адреса (#/rating/podium — можно кинуть ссылку).
 *
 *  Заголовок и звёздочка переезжают вместе с видом: у «Рейтинга участников»
 *  появляется звезда (так в макете), у остальных — нет.
 *
 *  Класс НЕ знает про другие экраны и про hash: он только сообщает наружу
 *  через onViewChange, какой вид сейчас активен. Решает app.ts.
 * ============================================================================
 */

import { PlacedParticipant, RatingSnapshot, withPlaces } from "../../features/rating";
import { need } from "../shared/dom";
import { countUp, EASE_OUT, prefersReducedMotion } from "../shared/motion";
import { buildListView, buildPodiumView, buildTableView } from "./rating.render";

export type RatingViewKey = "table" | "podium" | "list";

const VIEWS: readonly RatingViewKey[] = ["table", "podium", "list"];

const TITLES: Record<RatingViewKey, string> = {
  table: "Таблица рейтинга",
  podium: "Пьедестал",
  list: "Рейтинг участников",
};

/** Порог свайпа: меньше — считается случайным касанием и откатывается. */
const SWIPE_THRESHOLD = 56;

export interface RatingScreenOptions {
  /** Вызывается после каждой смены вида (app.ts обновляет адрес). */
  onViewChange?: (view: RatingViewKey) => void;
}

export class RatingScreen {
  private readonly participants: PlacedParticipant[];

  private readonly root: HTMLElement;
  private readonly track: HTMLElement;
  private readonly viewport: HTMLElement;
  private readonly titleRoot: HTMLElement;
  private readonly title: HTMLElement;
  private readonly dots: HTMLButtonElement[];
  private readonly views = new Map<RatingViewKey, HTMLElement>();

  private current: RatingViewKey = "table";
  private titleAnimation: Animation | null = null;

  constructor(
    snapshot: RatingSnapshot,
    private readonly options: RatingScreenOptions = {},
  ) {
    this.participants = withPlaces(snapshot.participants);

    this.root = need('[data-screen="rating"]');
    this.track = need("#rating-track");
    this.viewport = need("#rating-viewport");
    this.titleRoot = need("#rating-title-root");
    this.title = need("#rating-title");
    this.dots = Array.from(document.querySelectorAll<HTMLButtonElement>(".rating-dot"));

    for (const key of VIEWS) {
      this.views.set(key, need<HTMLElement>(`[data-view="${key}"]`, this.track));
    }
  }

  /** Активный вид — нужен app.ts, чтобы не потерять его при уходе на карту. */
  get view(): RatingViewKey {
    return this.current;
  }

  /** Построить три вида и навесить обработчики. Вызывается один раз. */
  init(): void {
    this.renderViews();
    this.bindDots();
    this.bindSwipe();
    this.bindKeyboard();
  }

  /**
   * Показать вид.
   * @param animate false — без анимаций заголовка (старт по ссылке/первая отрисовка)
   */
  goTo(view: RatingViewKey, options: { animate?: boolean } = {}): void {
    const animate = options.animate ?? true;
    if (!VIEWS.includes(view)) return;

    this.current = view;
    this.applyTransform();
    this.syncViews();
    this.syncDots();
    this.applyChrome(view, animate);
    this.runCountUp(view);
    this.options.onViewChange?.(view);
  }

  // --- Внутренности ---------------------------------------------------------

  private renderViews(): void {
    const content: Record<RatingViewKey, HTMLElement> = {
      table: buildTableView(this.participants),
      podium: buildPodiumView(this.participants),
      list: buildListView(this.participants),
    };

    for (const key of VIEWS) {
      this.views.get(key)?.replaceChildren(content[key]);
    }
  }

  private applyTransform(): void {
    this.track.classList.remove("is-dragging");
    const index = VIEWS.indexOf(this.current);
    this.track.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
  }

  private syncViews(): void {
    for (const key of VIEWS) {
      const view = this.views.get(key);
      if (!view) continue;
      const isActive = key === this.current;
      // Класс .is-active заново запускает CSS-анимации строк этого вида.
      view.classList.toggle("is-active", isActive);
      view.setAttribute("aria-hidden", String(!isActive));
    }
  }

  private syncDots(): void {
    for (const dot of this.dots) {
      const isActive = dot.dataset.view === this.current;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-selected", String(isActive));
    }
  }

  /** Заголовок + звезда. Смена текста — выездом, как в макете «переходы». */
  private applyChrome(view: RatingViewKey, animate: boolean): void {
    const nextTitle = TITLES[view];
    this.titleRoot.classList.toggle("has-star", view === "list");

    if (this.title.textContent === nextTitle) return;

    this.titleAnimation?.cancel();
    this.titleAnimation = null;

    if (!animate || prefersReducedMotion()) {
      this.title.textContent = nextTitle;
      return;
    }

    const out = this.title.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-8px)" },
      ],
      { duration: 140, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
    this.titleAnimation = out;

    out.finished
      .then(() => {
        if (this.titleAnimation !== out) return;
        this.title.textContent = nextTitle;

        const enter = this.title.animate(
          [
            { opacity: 0, transform: "translateY(10px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 280, easing: EASE_OUT, fill: "both" },
        );
        this.titleAnimation = enter;

        return enter.finished.then(() => {
          if (this.titleAnimation === enter) {
            this.titleAnimation = null;
            enter.cancel();
          }
        });
      })
      .catch(() => {
        // Анимацию отменили — при быстром переключении это нормально.
      });
  }

  /** Очки «набегают» от нуля при каждом показе вида. */
  private runCountUp(view: RatingViewKey): void {
    const container = this.views.get(view);
    if (!container) return;

    const baseDelay = view === "podium" ? 620 : 160;

    container.querySelectorAll<HTMLElement>(".js-points").forEach((element, index) => {
      const value = Number(element.dataset.value ?? "0");
      countUp(element, value, { delay: baseDelay + index * 34 });
    });
  }

  private bindDots(): void {
    for (const dot of this.dots) {
      dot.addEventListener("click", () => {
        const view = dot.dataset.view as RatingViewKey | undefined;
        if (view && view !== this.current) this.goTo(view);
      });
    }
  }

  /**
   * Свайп. Горизонталь отличаем от вертикали по первому движению: если палец
   * пошёл вбок — ведём карусель, если вниз — отдаём прокрутке (touch-action).
   */
  private bindSwipe(): void {
    let pointerDown = false;
    let directionDecided = false;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let deltaX = 0;

    const stopDragging = (): void => {
      this.track.classList.remove("is-dragging");
    };

    this.viewport.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (this.isBlockedByOverlay()) return;

      pointerDown = true;
      directionDecided = false;
      dragging = false;
      deltaX = 0;
      startX = event.clientX;
      startY = event.clientY;
    });

    this.viewport.addEventListener("pointermove", (event) => {
      if (!pointerDown) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (!directionDecided) {
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
        directionDecided = true;
        dragging = Math.abs(dx) > Math.abs(dy);

        if (!dragging) {
          pointerDown = false;
          return;
        }

        this.track.classList.add("is-dragging");
        this.viewport.setPointerCapture(event.pointerId);
      }

      if (!dragging) return;

      deltaX = dx;
      const index = VIEWS.indexOf(this.current);
      // На краях карусель сопротивляется — видно, что дальше ничего нет.
      const atEdge = (index === 0 && dx > 0) || (index === VIEWS.length - 1 && dx < 0);
      const shift = atEdge ? dx * 0.32 : dx;

      this.track.style.transform =
        `translate3d(calc(-${index * 100}% + ${shift}px), 0, 0)`;
    });

    const finish = (): void => {
      if (!pointerDown) return;

      const wasDragging = dragging;
      const travelled = deltaX;
      pointerDown = false;
      directionDecided = false;
      dragging = false;
      stopDragging();

      if (!wasDragging) return;

      const index = VIEWS.indexOf(this.current);
      const next = VIEWS[index + 1];
      const previous = VIEWS[index - 1];

      if (travelled < -SWIPE_THRESHOLD && next) this.goTo(next);
      else if (travelled > SWIPE_THRESHOLD && previous) this.goTo(previous);
      else this.applyTransform();
    };

    this.viewport.addEventListener("pointerup", finish);
    this.viewport.addEventListener("pointercancel", finish);
  }

  private bindKeyboard(): void {
    window.addEventListener("keydown", (event) => {
      if (!this.root.classList.contains("is-active")) return;
      if (this.isBlockedByOverlay()) return;

      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select")) return;

      const index = VIEWS.indexOf(this.current);
      if (event.key === "ArrowRight") {
        const next = VIEWS[index + 1];
        if (next) {
          event.preventDefault();
          this.goTo(next);
        }
      } else if (event.key === "ArrowLeft") {
        const previous = VIEWS[index - 1];
        if (previous) {
          event.preventDefault();
          this.goTo(previous);
        }
      }
    });
  }

  /** Пока открыт экран выхода, карусель под ним не должна слушаться. */
  private isBlockedByOverlay(): boolean {
    return document.querySelector('[data-screen="logout"].is-active') !== null;
  }
}
