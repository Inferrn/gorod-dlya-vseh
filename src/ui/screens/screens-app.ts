/**
 * ============================================================================
 *  screens-app.ts — точка сборки новых экранов
 * ============================================================================
 *
 *  Здесь встречаются все экраны: карта, форма «Добавить информацию», форма
 *  «Съезд с тротуара» и подсказки. Экран — это класс с корневым элементом;
 *  приложение вставляет его в .stage, а нижнее меню остаётся общим и не
 *  пересоздаётся.
 *
 *  СОСТОЯНИЕ. Введённое в формах живёт здесь, а не внутри экранов: уйдёшь на
 *  подсказку и вернёшься — значения на месте, потому что экран собирается
 *  заново из этого состояния.
 *
 *  АДРЕСА ЭКРАНОВ. Кроме обычной навигации поддерживаются хэши — удобно
 *  открывать конкретный кадр макета для сверки с Figma:
 *      #/map  #/info  #/ramp
 *      #/hint-surface  #/hint-slope  #/hint-curb
 *      #/hint-slope/2   (вторая страница подсказки)
 * ============================================================================
 */

import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/screens.css";

// Inter — шрифт макета. Лежит в npm-пакете (а не на CDN), поэтому попадает
// в бандл и работает в APK без интернета. Только нужные начертания,
// чтобы не тащить весь набор.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

import { BottomNav, NavTab } from "./bottom-nav";
import { MapView, Place } from "./map-view";
import { InfoScreen, HintKind, InfoState, EMPTY_INFO } from "./info-screen";
import { HintScreen } from "./hint-screen";
import { RampScreen, RampState, EMPTY_RAMP } from "./ramp-screen";
import { FrameView, frameById } from "./frames";
import { el } from "./dom";

/* --- Типы маршрутов --------------------------------------------------------
 *  frameId — номер кадра макета, если экран открыт именно как кадр (см.
 *  frames.ts). По нему строится адрес вида #/61, чтобы кадр можно было
 *  открыть и сверить с Figma.
 * -------------------------------------------------------------------------- */

type ExpandedSection = "surface" | "slope" | "obstacles" | "comment";

type Route =
  | { name: "map"; frameId?: number }
  | { name: "info"; frameId?: number; expanded?: ExpandedSection[] }
  | { name: "ramp"; frameId?: number; curbOpen?: boolean }
  | { name: "hint"; kind: HintKind; page: number; frameId?: number };

/* --- Мок-точка, с которой открывается приложение --------------------------- */

const MOCK_PLACE: Place = {
  kind: "ВЫБРАННОЕ МЕСТО",
  title: "Московское шоссе, 143a",
  city: "Самара, 443250",
  lat: 53.196659,
  lng: 50.17452,
};

/* --- Приложение ------------------------------------------------------------ */

class ScreensApp {
  private readonly stage = el("div", "stage");
  private readonly toastEl = el("div", "toast");
  private readonly nav: BottomNav;

  private place: Place = MOCK_PLACE;
  private info: InfoState = { ...EMPTY_INFO };
  private ramp: RampState = { ...EMPTY_RAMP };

  private mapView: MapView | null = null;
  private current: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    this.nav = new BottomNav((tab) => this.onTab(tab), "map");

    root.classList.add("app");
    root.append(this.stage, this.nav.root, this.toastEl);

    window.addEventListener("hashchange", () => this.open(this.parseHash()));
    this.open(this.parseHash());
  }

  /* --- Переходы ----------------------------------------------------------- */

  private async open(route: Route): Promise<void> {
    if (route.name === "map") {
      this.showMap();
      return;
    }

    const screen =
      route.name === "info"
        ? new InfoScreen({
            place: this.place,
            state: this.info,
            expanded: route.expanded,
            onBack: () => this.go({ name: "map" }),
            onOpenHint: (kind) => this.go({ name: "hint", kind, page: 0 }),
            onSave: (state) => this.save(state),
          })
        : route.name === "ramp"
          ? new RampScreen({
              place: this.place,
              state: this.ramp,
              curbOpen: route.curbOpen,
              onBack: () => this.go({ name: "map" }),
              onOpenHint: () => this.go({ name: "hint", kind: "curb", page: 0 }),
              onSave: (state) => this.saveRamp(state),
            })
          : new HintScreen(route.kind, () => this.go({ name: "info" }), route.page);

    this.mount(screen.root, "add");
  }

  /** Показать экран: старый уезжает влево, новый въезжает справа. */
  private mount(next: HTMLElement, tab: NavTab): void {
    const previous = this.current;

    if (this.mapView) this.mapView.root.hidden = true;

    this.stage.appendChild(next);
    this.current = next;
    this.nav.setActive(tab);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (previous && !reduce) {
      previous.animate(
        [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(-8%)", opacity: 0 }],
        { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
      ).onfinish = () => previous.remove();
    } else {
      previous?.remove();
    }

    if (!reduce) {
      next.animate(
        [{ transform: "translateX(8%)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }],
        { duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
  }

  private showMap(): void {
    if (!this.mapView) {
      this.mapView = new MapView(
        (place) => {
          this.place = place;
          this.go({ name: place.kind === "СЪЕЗДЫ У ПЕРЕХОДА" ? "ramp" : "info" });
        },
        (text) => this.toast(text),
      );
      this.stage.appendChild(this.mapView.root);
      this.mapView.mount();
      this.mapView.setPlace(this.place);
    }

    const previous = this.current;
    this.mapView.root.hidden = false;
    this.mapView.invalidate();
    this.current = this.mapView.root;
    this.nav.setActive("map");
    previous?.remove();
  }

  private go(route: Route): void {
    // Хэш — источник правды: он же переживает перезагрузку страницы,
    // и по нему можно открыть нужный кадр для сверки с макетом.
    const hash = this.toHash(route);
    if (location.hash !== hash) {
      location.hash = hash; // вызовет hashchange → open()
    } else {
      void this.open(route);
    }
  }

  /* --- Действия ----------------------------------------------------------- */

  private onTab(tab: NavTab): void {
    if (tab === "map") {
      this.go({ name: "map" });
      return;
    }
    if (tab === "add") {
      this.go({ name: this.place.kind === "СЪЕЗДЫ У ПЕРЕХОДА" ? "ramp" : "info" });
      return;
    }
    this.toast("Профиль появится позже");
  }

  private save(state: InfoState): void {
    // TODO: отправка на бэкенд — POST /road или /crossing (см. features/).
    console.info("[screens] сохранить информацию", state, this.place);
    this.toast("Информация сохранена");
    this.go({ name: "map" });
  }

  private saveRamp(state: RampState): void {
    // TODO: POST /ramp (features/ramp) — сейчас только демонстрация формы.
    console.info("[screens] сохранить съезд", state, this.place);
    this.toast("Информация сохранена");
    this.go({ name: "map" });
  }

  private toast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add("is-visible");
    window.setTimeout(() => this.toastEl.classList.remove("is-visible"), 2200);
  }

  /* --- Хэш ---------------------------------------------------------------- */

  private toHash(route: Route): string {
    // Открыто как кадр макета — адрес остаётся номером кадра.
    if (route.frameId !== undefined) return `#/${route.frameId}`;

    if (route.name === "map") return "#/map";
    if (route.name === "info") return "#/info";
    if (route.name === "ramp") return "#/ramp";
    return route.page > 0 ? `#/hint-${route.kind}/${route.page + 1}` : `#/hint-${route.kind}`;
  }

  /** Кадр макета → маршрут экрана. */
  private routeFromFrame(frame: FrameView): Route {
    if (frame.screen === "map") return { name: "map", frameId: frame.id };
    if (frame.screen === "info") {
      return { name: "info", frameId: frame.id, expanded: frame.expanded };
    }
    if (frame.screen === "ramp") {
      return { name: "ramp", frameId: frame.id, curbOpen: frame.curbOpen };
    }
    return {
      name: "hint",
      kind: frame.hint ?? "surface",
      page: frame.page ?? 0,
      frameId: frame.id,
    };
  }

  private parseHash(): Route {
    const raw = location.hash.replace(/^#\/?/, "");

    // Кадр по номеру из основного проекта Figma: #/61
    const frame = /^\d+$/.test(raw) ? frameById(Number(raw)) : undefined;
    if (frame) return this.routeFromFrame(frame);

    if (raw === "info") return { name: "info" };
    if (raw === "ramp") return { name: "ramp" };

    const hint = raw.match(/^hint-(surface|slope|curb)(?:\/(\d+))?$/);
    if (hint) {
      const page = Math.max(0, Number(hint[2] ?? 1) - 1);
      return { name: "hint", kind: hint[1] as HintKind, page };
    }

    return { name: "map" };
  }
}

/* --- Запуск ---------------------------------------------------------------- */

const root = document.getElementById("app");
if (!root) {
  console.error("[screens] не найден #app");
} else {
  new ScreensApp(root);
}
