/**
 * ============================================================================
 *  ramp-screen.ts — форма «Съезд с тротуара» (кадры 14, 15)
 * ============================================================================
 *
 *  ОТВЕТСТВЕННОСТЬ:
 *    ДЕЛАЕТ: чекбоксы «Оборудование съезда» + выбор высоты бордюра,
 *            хранит введённое, по «Сохранить информацию» отдаёт наружу.
 *    НЕ ДЕЛАЕТ: не отправляет данные и не открывает подсказку сам.
 *
 *  Про высоту бордюра: варианты совпадают со справочником curb-height
 *  (mock/mock-dictionaries.ts: менее 2 см, 2–4 см, 4–5 см, более 5 см),
 *  поэтому после подключения бэкенда достаточно подставить список оттуда.
 * ============================================================================
 */

import { icon } from "./icons";
import { el, must } from "./dom";
import type { Place } from "./map-view";

export interface RampState {
  /** Съезд на проезжую часть */
  toRoad: boolean;
  /** Ограждение у пешеходного перехода */
  fence: boolean;
  /** Наличие тактильной плитки */
  tactile: boolean;
  /** Высота бордюра */
  curbHeight: string | null;
}

export const EMPTY_RAMP: RampState = {
  toRoad: false,
  fence: false,
  tactile: false,
  curbHeight: null,
};

/** Справочник curb-height (id 1–4), текст — как в макете. */
export const CURB_HEIGHT_OPTIONS = ["Менее 2 см", "2–4 см", "4–5 см", "Более 5 см"];

const EQUIPMENT = [
  { key: "toRoad" as const, title: "Съезд на проезжую часть", sub: "Переход с тротуара на дорогу" },
  { key: "fence" as const, title: "Ограждение у пешеходного перехода", sub: "" },
  { key: "tactile" as const, title: "Наличие тактильной плитки", sub: "Рельефное покрытие перед переходом" },
];

interface RampScreenOptions {
  place: Place;
  state: RampState;
  onBack: () => void;
  onOpenHint: () => void;
  onSave: (state: RampState) => void;
}

export class RampScreen {
  readonly root: HTMLElement;

  private curbValue!: HTMLElement;
  private curbBody!: HTMLElement;

  constructor(private readonly options: RampScreenOptions) {
    const { place, state } = options;

    this.root = el("section", "screen");
    this.root.innerHTML = `
      <header class="screen__head">
        <p class="kicker">Добавить информацию</p>
        <h1 class="screen__title">Съезд с тротуара</h1>
        <p class="addr">${icon("pin", 18)} ${place.title}</p>
        <button class="icon-btn" type="button" data-close aria-label="Закрыть форму">${icon("close", 20)}</button>
      </header>

      <div class="screen__body">
        <p class="group-label">Оборудование съезда</p>

        <div class="card">
          ${EQUIPMENT.map(
            (item, index) => `
            <button class="option option--tall" type="button" role="checkbox"
                    aria-checked="${Boolean(state[item.key])}" data-equipment="${item.key}">
              <span class="option__text">
                ${item.title}
                ${item.sub ? `<span class="option__sub">${item.sub}</span>` : ""}
              </span>
              <span class="check">${icon("check", 14)}</span>
            </button>
            ${index < EQUIPMENT.length - 1 ? '<div class="divider"></div>' : ""}`,
          ).join("")}
        </div>

        <div class="card">
          <div class="picker">
            <button class="picker__main" type="button" data-curb-picker aria-expanded="false">
              <span class="card__title">Высота бордюра</span>
              <span class="picker__label" data-curb-value>Выберите значение</span>
            </button>
            <button class="row-head__icon" type="button" data-curb-help aria-label="Подсказка: как определить высоту бордюра">${icon("help", 24)}</button>
            <button class="row-head__icon row-head__chevron" type="button" data-curb-picker aria-expanded="false" aria-label="Открыть список высот бордюра">${icon("chevron", 22)}</button>
          </div>
          <div class="section__body" data-curb-body hidden></div>
        </div>

        <div class="note" style="margin-top:18px">
          <span class="note__icon">${icon("info", 22)}</span>
          <div>
            <p class="note__title">Отметьте то, что есть на месте</p>
            <p class="note__text">Для высоты бордюра можно открыть подсказку с примерами.</p>
          </div>
        </div>

        <div style="height:20px"></div>
      </div>

      <footer class="screen__foot">
        <button class="btn-primary" type="button" data-save>${icon("check", 22)} Сохранить информацию</button>
        <p class="foot-note">Можно заполнить только знакомые вам пункты</p>
      </footer>
    `;

    this.curbValue = must(this.root, "[data-curb-value]");
    this.curbBody = must(this.root, "[data-curb-body]");

    this.buildCurbList();
    if (state.curbHeight) this.setCurbHeight(state.curbHeight, false);
    this.bind();
  }

  private buildCurbList(): void {
    this.curbBody.innerHTML = CURB_HEIGHT_OPTIONS.map(
      (label) => `
        <button class="option" type="button" role="radio" aria-checked="false" data-curb="${label}">
          <span class="option__text">${label}</span>
          <span class="radio"></span>
        </button>
        <div class="divider"></div>`,
    ).join("");

    this.curbBody.addEventListener("click", (event) => {
      const btn = (event.target as HTMLElement).closest<HTMLElement>("[data-curb]");
      if (!btn) return;
      this.setCurbHeight(btn.dataset.curb ?? "", true);
      this.toggleCurb(false);
    });
  }

  private bind(): void {
    must(this.root, "[data-close]").addEventListener("click", () => this.options.onBack());

    this.root.querySelectorAll<HTMLElement>("[data-curb-picker]").forEach((btn) => {
      btn.addEventListener("click", () => this.toggleCurb());
    });

    must(this.root, "[data-curb-help]").addEventListener("click", () => {
      this.options.onOpenHint();
    });

    this.root.querySelectorAll<HTMLElement>("[data-equipment]").forEach((btn) => {
      btn.setAttribute("aria-checked", String(this.options.state[btn.dataset.equipment as keyof RampState] === true));
      btn.addEventListener("click", () => {
        const key = btn.dataset.equipment as "toRoad" | "fence" | "tactile";
        const next = !this.options.state[key];
        this.options.state[key] = next;
        btn.setAttribute("aria-checked", String(next));
      });
    });

    must(this.root, "[data-save]").addEventListener("click", () =>
      this.options.onSave(this.options.state),
    );
  }

  private toggleCurb(force?: boolean): void {
    const open = force ?? this.curbBody.hidden;
    this.curbBody.hidden = !open;
    this.root
      .querySelectorAll<HTMLElement>("[data-curb-picker]")
      .forEach((btn) => btn.setAttribute("aria-expanded", String(open)));
  }

  private setCurbHeight(label: string, remember = true): void {
    if (remember) this.options.state.curbHeight = label;
    this.curbValue.textContent = label;
    this.curbValue.classList.add("picker__label--filled");

    this.curbBody.querySelectorAll<HTMLElement>("[data-curb]").forEach((node) => {
      node.setAttribute("aria-checked", String(node.dataset.curb === label));
    });
  }
}
