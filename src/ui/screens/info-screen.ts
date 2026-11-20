/**
 * ============================================================================
 *  info-screen.ts — форма «Добавить информацию» (кадры 03, 04, 07–10)
 * ============================================================================
 *
 *  ОТВЕТСТВЕННОСТЬ:
 *    ДЕЛАЕТ: показывает разделы формы (покрытие, уклон, ограждение,
 *            препятствия, комментарий), сворачивает/разворачивает их,
 *            хранит введённое и отдаёт его наружу по «Сохранить информацию».
 *    НЕ ДЕЛАЕТ: не ходит на бэкенд и не открывает подсказки сама — просит
 *            об этом колбэками onOpenHint / onSave.
 *
 *  СОСТОЯНИЕ. Хранится в объекте state и меняется точечно (а не полной
 *  перерисовкой экрана): иначе при каждом выборе радио слетал бы фокус и
 *  прокрутка — на длинной форме это сразу заметно.
 * ============================================================================
 */

import { icon } from "./icons";
import { el, must } from "./dom";
import type { Place } from "./map-view";

/** Вид подсказки, которую можно открыть из формы. */
export type HintKind = "surface" | "slope" | "curb";

/** Что ввёл волонтёр. Пока живёт в памяти; на бэкенд уйдёт при сохранении. */
export interface InfoState {
  surface: string | null;
  slope: string | null;
  fence: boolean;
  obstacles: string[];
  comment: string;
}

export const EMPTY_INFO: InfoState = {
  surface: null,
  slope: null,
  fence: false,
  obstacles: [],
  comment: "",
};

/**
 * Варианты уклона. В моках бэкенда такого справочника пока нет (есть только
 * curb-height и road-surface), поэтому список живёт здесь.
 * TODO: когда на бэке появится /dictionaries/slope — брать оттуда.
 */
export const SLOPE_OPTIONS = [
  "Менее 15 градусов",
  "20 градусов",
  "25 градусов",
  "30 градусов",
  "35 и более градусов",
];

export const OBSTACLE_OPTIONS = ["Ямы", "Пригорки", "Торчащие предметы"];

/**
 * Варианты покрытия. Совпадают по смыслу со справочником road-surface
 * (mock/mock-dictionaries.ts) — после подключения бэкенда придут оттуда.
 */
export const SURFACE_OPTIONS = [
  "Асфальт",
  "Асфальт плохого качества",
  "Брусчатка",
  "Щебёночное покрытие",
  "Грунтовка",
  "Песок",
  "Плиточное покрытие",
  "Плохое плиточное покрытие",
];

const COMMENT_LIMIT = 500;

interface InfoScreenOptions {
  place: Place;
  state: InfoState;
  onBack: () => void;
  onOpenHint: (kind: HintKind) => void;
  onSave: (state: InfoState) => void;
}

export class InfoScreen {
  readonly root: HTMLElement;

  private surfaceValue!: HTMLElement;
  private surfaceList!: HTMLElement;
  private slopeBody!: HTMLElement;
  private obstaclesBody!: HTMLElement;
  private commentArea!: HTMLTextAreaElement;
  private commentCount!: HTMLElement;
  private fenceToggle!: HTMLElement;

  constructor(private readonly options: InfoScreenOptions) {
    const { place } = options;

    this.root = el("section", "screen");
    this.root.innerHTML = `
      <header class="screen__head">
        <p class="kicker">Добавить информацию</p>
        <h1 class="screen__title">Пешеходная зона</h1>
        <p class="addr">${icon("pin", 18)} ${place.title}</p>
        <button class="icon-btn" type="button" data-close aria-label="Закрыть форму">${icon("close", 20)}</button>
      </header>

      <div class="screen__body">
        <!-- 1. Тип покрытия -->
        <div class="card">
          <div class="picker">
            <button class="picker__main" type="button" data-surface-picker aria-expanded="false">
              <span class="picker__label">Тип покрытия</span>
              <span class="picker__value picker__value--empty" data-surface-value>Выберите покрытие</span>
            </button>
            <button class="row-head__icon" type="button" data-surface-help aria-label="Подсказка: какой бывает тип покрытия">${icon("help", 24)}</button>
            <button class="row-head__icon row-head__chevron" type="button" data-surface-picker aria-expanded="false" aria-label="Открыть список покрытий">${icon("chevron", 22)}</button>
          </div>
          <div class="section__body" data-surface-list hidden></div>
        </div>

        <!-- 2. Уклон -->
        <div class="card">
          <div class="row-head">
            <button class="row-head__text" type="button" data-toggle="slope" aria-expanded="false">
              <h2 class="card__title">Уклон</h2>
            </button>
            <button class="row-head__icon" type="button" data-hint="slope" aria-label="Подсказка: как оценить уклон">${icon("help", 24)}</button>
            <button class="row-head__icon" type="button" data-toggle="slope" aria-expanded="false" aria-label="Развернуть раздел «Уклон»">
              <span class="row-head__chevron">${icon("chevron", 22)}</span>
            </button>
          </div>
          <div class="section__body" data-body="slope" hidden></div>
        </div>

        <!-- 3. Ограждение -->
        <div class="card">
          <div class="row-head">
            <span class="row-head__text"><h2 class="card__title">Наличие ограждения</h2></span>
            <button class="switch-host" type="button" role="switch" aria-checked="false" data-fence aria-label="Наличие ограждения"><span class="switch"></span></button>
          </div>
        </div>

        <!-- 4. Препятствия -->
        <div class="card">
          <div class="row-head">
            <button class="row-head__text" type="button" data-toggle="obstacles" aria-expanded="false">
              <h2 class="card__title">Препятствия</h2>
            </button>
            <button class="row-head__icon" type="button" data-toggle="obstacles" aria-expanded="false" aria-label="Развернуть раздел «Препятствия»">
              <span class="row-head__chevron">${icon("chevron", 22)}</span>
            </button>
          </div>
          <div class="section__body" data-body="obstacles" hidden></div>
        </div>

        <!-- 5. Дополнительно -->
        <div class="card">
          <div class="row-head">
            <button class="row-head__text" type="button" data-toggle="comment" aria-expanded="false">
              <h2 class="card__title">Дополнительно</h2>
            </button>
            <button class="row-head__icon" type="button" data-toggle="comment" aria-expanded="false" aria-label="Развернуть раздел «Дополнительно»">
              <span class="row-head__chevron">${icon("chevron", 22)}</span>
            </button>
          </div>
          <div class="section__body" data-body="comment" hidden>
            <div class="comment">
              <textarea class="comment__area" maxlength="${COMMENT_LIMIT}"
                        placeholder="Расскажите, что ещё важно знать" data-comment></textarea>
              <span class="comment__count" data-count>0 / ${COMMENT_LIMIT}</span>
            </div>
          </div>
        </div>

        <div class="note" style="margin-top:18px">
          <span class="note__icon">${icon("heart", 22)}</span>
          <div>
            <p class="note__title">Сделаем город доступнее</p>
            <p class="note__text">Ваши наблюдения помогут другим выбрать удобный и безопасный путь.</p>
          </div>
        </div>

        <div style="height:20px"></div>
      </div>

      <footer class="screen__foot">
        <button class="btn-primary" type="button" data-save>${icon("check", 22)} Сохранить информацию</button>
        <p class="foot-note">Можно заполнить только знакомые вам пункты</p>
      </footer>
    `;

    this.surfaceValue = must(this.root, "[data-surface-value]");
    this.surfaceList = must(this.root, "[data-surface-list]");
    this.slopeBody = must(this.root, "[data-body='slope']");
    this.obstaclesBody = must(this.root, "[data-body='obstacles']");
    this.commentArea = must<HTMLTextAreaElement>(this.root, "[data-comment]");
    this.commentCount = must(this.root, "[data-count]");
    this.fenceToggle = must(this.root, "[data-fence]");

    this.buildSurfaceList();
    this.buildSlope();
    this.buildObstacles();
    this.restore();
    this.bind();
  }

  /** Подставить значения, если форму открыли повторно. */
  private restore(): void {
    const { state } = this.options;
    if (state.surface) this.setSurface(state.surface, false);
    this.fenceToggle.setAttribute("aria-checked", String(state.fence));
    this.commentArea.value = state.comment;
    this.commentCount.textContent = `${state.comment.length} / ${COMMENT_LIMIT}`;
  }

  private buildSurfaceList(): void {
    this.surfaceList.innerHTML = SURFACE_OPTIONS.map(
      (name, index) => `
        <button class="option" type="button" role="radio" aria-checked="false" data-surface="${index}">
          <span class="option__text">${name}</span>
          <span class="radio"></span>
        </button>
        ${index < SURFACE_OPTIONS.length - 1 ? '<div class="divider"></div>' : ""}`,
    ).join("");

    this.surfaceList.addEventListener("click", (event) => {
      const btn = (event.target as HTMLElement).closest<HTMLElement>("[data-surface]");
      if (!btn) return;
      this.setSurface(SURFACE_OPTIONS[Number(btn.dataset.surface)], true);
      this.toggleSection("surface", false);
    });
  }

  private buildSlope(): void {
    this.slopeBody.innerHTML = SLOPE_OPTIONS.map(
      (label) => `
        <button class="option" type="button" role="radio" aria-checked="false" data-slope="${label}">
          <span class="option__text">${label}</span>
          <span class="radio"></span>
        </button>
        <div class="divider"></div>`,
    ).join("");

    this.slopeBody.addEventListener("click", (event) => {
      const btn = (event.target as HTMLElement).closest<HTMLElement>("[data-slope]");
      if (!btn) return;
      this.options.state.slope = btn.dataset.slope ?? null;
      this.slopeBody.querySelectorAll<HTMLElement>("[data-slope]").forEach((node) => {
        node.setAttribute("aria-checked", String(node === btn));
      });
    });
  }

  private buildObstacles(): void {
    this.obstaclesBody.innerHTML = OBSTACLE_OPTIONS.map(
      (label) => `
        <button class="option" type="button" role="checkbox" aria-checked="false" data-obstacle="${label}">
          <span class="option__text">${label}</span>
          <span class="check">${icon("check", 14)}</span>
        </button>
        <div class="divider"></div>`,
    ).join("");

    this.obstaclesBody.addEventListener("click", (event) => {
      const btn = (event.target as HTMLElement).closest<HTMLElement>("[data-obstacle]");
      if (!btn) return;
      const label = btn.dataset.obstacle ?? "";
      const list = this.options.state.obstacles;
      const index = list.indexOf(label);
      if (index === -1) list.push(label);
      else list.splice(index, 1);
      btn.setAttribute("aria-checked", String(index === -1));
    });
  }

  private bind(): void {
    must(this.root, "[data-close]").addEventListener("click", () => this.options.onBack());

    this.root.querySelectorAll<HTMLElement>("[data-surface-picker]").forEach((btn) => {
      btn.addEventListener("click", () => this.toggleSection("surface"));
    });

    // «?» у покрытия открывает подсказку с фотографиями — по ней проще
    // выбрать, чем по названию.
    must(this.root, "[data-surface-help]").addEventListener("click", () => {
      this.options.onOpenHint("surface");
    });

    must(this.root, "[data-hint='slope']").addEventListener("click", () =>
      this.options.onOpenHint("slope"),
    );

    this.root.querySelectorAll<HTMLElement>("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => this.toggleSection(btn.dataset.toggle as string));
    });

    this.fenceToggle.addEventListener("click", () => {
      const next = this.fenceToggle.getAttribute("aria-checked") !== "true";
      this.fenceToggle.setAttribute("aria-checked", String(next));
      this.options.state.fence = next;
    });

    this.commentArea.addEventListener("input", () => {
      this.options.state.comment = this.commentArea.value;
      this.commentCount.textContent = `${this.commentArea.value.length} / ${COMMENT_LIMIT}`;
    });

    must(this.root, "[data-save]").addEventListener("click", () =>
      this.options.onSave(this.options.state),
    );
  }

  /** Свернуть/развернуть раздел. `force` — задать состояние принудительно. */
  private toggleSection(key: string, force?: boolean): void {
    const body =
      key === "surface"
        ? this.surfaceList
        : must<HTMLElement>(this.root, `[data-body='${key}']`);

    const isOpen = force ?? body.hidden;
    body.hidden = !isOpen;

    this.root
      .querySelectorAll<HTMLElement>(`[data-toggle='${key}']`)
      .forEach((btn) => btn.setAttribute("aria-expanded", String(isOpen)));

    if (key === "surface") {
      this.root
        .querySelectorAll<HTMLElement>("[data-surface-picker]")
        .forEach((btn) => btn.setAttribute("aria-expanded", String(isOpen)));
    }
  }

  private setSurface(name: string, remember = true): void {
    if (remember) this.options.state.surface = name;
    this.surfaceValue.textContent = name;
    this.surfaceValue.classList.remove("picker__value--empty");

    this.surfaceList.querySelectorAll<HTMLElement>("[data-surface]").forEach((node) => {
      node.setAttribute(
        "aria-checked",
        String(SURFACE_OPTIONS[Number(node.dataset.surface)] === name),
      );
    });
  }
}
