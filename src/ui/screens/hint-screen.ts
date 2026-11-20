/**
 * ============================================================================
 *  hint-screen.ts — экраны-подсказки (кадры 05, 06, 11, 12, 16)
 * ============================================================================
 *
 *  ОТВЕТСТВЕННОСТЬ:
 *    ДЕЛАЕТ: показывает фотопримеры, чтобы волонтёр выбрал покрытие/уклон/
 *            высоту бордюра «на глаз», сравнивая с тем, что видит на месте.
 *    НЕ ДЕЛАЕТ: не меняет значения формы — по «Далее/Готово» просто
 *            возвращается назад (onClose), выбор делает сама форма.
 *
 *  ПОЧЕМУ ОДИН КЛАСС НА ТРИ ПОДСКАЗКИ: у всех одинаковая оболочка (шапка,
 *  список карточек, нижняя панель с листалкой), различается только контент.
 *  Отдельный класс под каждый вид дал бы три копии одной и той же вёрстки.
 *
 *  ФОТО. Снимки выгружены из макета Figma и лежат в src/ui/assets/hints —
 *  на них уже нанесены подписи «15 градусов», «25 градусов» и номера 01–06,
 *  поэтому в разметке они не дублируются.
 * ============================================================================
 */

import { icon } from "./icons";
import { el, must } from "./dom";
import type { HintKind } from "./info-screen";

import coverAsphalt from "../assets/hints/cover-asphalt.jpg";
import coverCobble from "../assets/hints/cover-cobble.jpg";
import coverTile from "../assets/hints/cover-tile.jpg";
import coverGravel from "../assets/hints/cover-gravel.jpg";
import coverDirt from "../assets/hints/cover-dirt.jpg";
import coverSand from "../assets/hints/cover-sand.jpg";
import slope15 from "../assets/hints/slope-15.jpg";
import slope20 from "../assets/hints/slope-20.jpg";
import slope25 from "../assets/hints/slope-25.jpg";
import slope35 from "../assets/hints/slope-35.jpg";
import curbPhoto from "../assets/hints/curb.jpg";

interface CoverItem {
  photo: string;
  title: string;
  text: string;
}

/** Две страницы подсказки «Тип покрытия»: твёрдые и сыпучие. */
const COVER_PAGES: CoverItem[][] = [
  [
    { photo: coverAsphalt, title: "Асфальт", text: "Ровная поверхность без швов" },
    { photo: coverCobble, title: "Дорога из брусчатки", text: "Камни с заметными стыками" },
    { photo: coverTile, title: "Плиточное покрытие", text: "Плиты с регулярными швами" },
  ],
  [
    { photo: coverGravel, title: "Щебёночное покрытие", text: "Мелкие камни и неровности" },
    { photo: coverDirt, title: "Грунтовка", text: "Уплотнённая земля без покрытия" },
    { photo: coverSand, title: "Песок", text: "Рыхлая, подвижная поверхность" },
  ],
];

interface SlopeItem {
  photo: string;
  badge?: string;
  title: string;
  text: string;
}

const SLOPE_PAGES: SlopeItem[][] = [
  [
    { photo: slope15, badge: "< 15°", title: "Менее 15 градусов", text: "Небольшой уклон" },
    { photo: slope20, badge: "20°", title: "20 градусов", text: "Более заметный уклон" },
  ],
  [
    { photo: slope25, title: "25 градусов", text: "Выраженный наклон дороги" },
    { photo: slope35, title: "35 градусов", text: "Крутой наклон дороги" },
  ],
];

const CURB_STEPS = [
  { title: "Найдите край бордюра", text: "В месте перехода с тротуара на дорогу." },
  { title: "Измерьте по вертикали", text: "От поверхности дороги до верхнего края." },
  { title: "Выберите диапазон", text: "Укажите значение в форме съезда." },
];

const TITLES: Record<HintKind, { kicker: string; title: string; subtitle: string }> = {
  surface: {
    kicker: "Подсказка · тип покрытия",
    title: "Какое покрытие?",
    subtitle: "Сравните поверхность с примерами на фото.",
  },
  slope: {
    kicker: "Подсказка · уклон",
    title: "Как оценить уклон?",
    subtitle: "Сравните наклон дороги с примерами.",
  },
  curb: {
    kicker: "Подсказка · высота бордюра",
    title: "Высота бордюра",
    subtitle: "Два примера для сравнения.",
  },
};

const FOOT_NOTES: Record<HintKind, string> = {
  surface: "Выберите подходящий вариант в поле «Тип покрытия»",
  slope: "Выберите подходящее значение в разделе «Уклон»",
  curb: "Выберите значение в поле «Высота бордюра»",
};

export class HintScreen {
  readonly root: HTMLElement;

  private body!: HTMLElement;
  private pager!: HTMLElement;
  private nextBtn!: HTMLButtonElement;
  private page = 0;

  constructor(
    private readonly kind: HintKind,
    private readonly onClose: () => void,
    startPage = 0,
  ) {
    const { kicker, title, subtitle } = TITLES[kind];
    // У подсказки про бордюр одна страница и своя нижняя кнопка — листалки нет.
    const single = kind === "curb";

    this.root = el("section", "screen");
    this.root.innerHTML = `
      <header class="screen__head">
        <p class="kicker">${kicker}</p>
        <h1 class="screen__title">${title}</h1>
        <p class="screen__subtitle">${subtitle}</p>
        <button class="icon-btn" type="button" data-close aria-label="Закрыть подсказку">${icon("close", 20)}</button>
      </header>

      <div class="screen__body" data-hint-body></div>

      <footer class="screen__foot">
        ${
          single
            ? `<button class="btn-primary" type="button" data-close-foot>${icon("arrowLeft", 22)} Вернуться к форме</button>`
            : `<div class="hint-foot">
                 <button class="btn-ghost" type="button" data-close-foot>${icon("arrowLeft", 20)} К форме</button>
                 <div class="pager" role="tablist" aria-label="Страницы подсказки"></div>
                 <button class="btn-next" type="button" data-next></button>
               </div>`
        }
        <p class="foot-note">${FOOT_NOTES[kind]}</p>
      </footer>
    `;

    this.body = must(this.root, "[data-hint-body]");
    this.pager = this.root.querySelector<HTMLElement>(".pager") ?? document.createElement("div");
    this.nextBtn = this.root.querySelector<HTMLButtonElement>("[data-next]")!;

    must(this.root, "[data-close]").addEventListener("click", onClose);
    this.root.querySelectorAll("[data-close-foot]").forEach((btn) => {
      btn.addEventListener("click", onClose);
    });

    this.page = Math.min(startPage, this.pageCount - 1);
    this.render();
  }

  private get pageCount(): number {
    if (this.kind === "surface") return COVER_PAGES.length;
    if (this.kind === "slope") return SLOPE_PAGES.length;
    return 1;
  }

  private render(): void {
    if (this.kind === "curb") {
      this.body.innerHTML = this.curbMarkup();
      return;
    }

    const items = this.kind === "surface" ? COVER_PAGES[this.page] : SLOPE_PAGES[this.page];
    this.body.innerHTML =
      this.kind === "surface"
        ? `<div class="hint-list">${(items as CoverItem[]).map(this.coverCard).join("")}</div>`
        : this.slopeMarkup(items as SlopeItem[]);

    // Листалка: «1 2» + кнопка «Далее/Готово».
    this.pager.innerHTML = Array.from(
      { length: this.pageCount },
      (_, index) => `
        <button class="pager__btn" type="button" role="tab" data-page="${index}"
                aria-selected="${index === this.page}">${index + 1}</button>`,
    ).join("");

    this.pager.querySelectorAll<HTMLElement>("[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.page = Number(btn.dataset.page);
        this.render();
      });
    });

    const last = this.page === this.pageCount - 1;
    this.nextBtn.innerHTML = last
      ? `Готово ${icon("arrowRight", 22)}`
      : `Далее ${icon("arrowRight", 22)}`;
    this.nextBtn.onclick = () => {
      if (last) this.onClose();
      else {
        this.page += 1;
        this.render();
      }
    };
  }

  private coverCard = (item: CoverItem): string => `
    <article class="hint-card">
      <img class="hint-card__photo" src="${item.photo}" alt="${item.title}" loading="lazy" />
      <div class="hint-card__body">
        <h2 class="hint-card__title">${item.title}</h2>
        <p class="hint-card__text">${item.text}</p>
      </div>
    </article>`;

  private slopeMarkup(items: SlopeItem[]): string {
    if (this.page === 0) {
      // Первая страница: фото слева, текст справа (как в макете).
      return `
        <div class="hint-list">
          ${items
            .map(
              (item) => `
            <article class="hint-split">
              <img class="hint-split__photo" src="${item.photo}" alt="${item.title}" loading="lazy" />
              <div class="hint-split__body">
                <span class="hint-badge">${item.badge}</span>
                <h2 class="hint-split__title">${item.title}</h2>
                <p class="hint-split__text">${item.text}</p>
              </div>
            </article>`,
            )
            .join("")}
        </div>
        <div class="note" style="margin-top:18px">
          <span class="note__icon">${icon("info", 22)}</span>
          <div>
            <p class="note__title">Фото — ориентир, не измерение.</p>
            <p class="note__text">Для точного значения нужен замер.</p>
          </div>
        </div>`;
    }

    // Вторая страница: крупное фото во всю ширину, подпись под ним.
    return `
      <div class="hint-list">
        ${items
          .map(
            (item) => `
          <article class="hint-card">
            <img class="hint-card__photo" src="${item.photo}" alt="${item.title}" loading="lazy" />
            <div class="hint-card__body">
              <h2 class="hint-card__title">${item.title}</h2>
              <p class="hint-card__text">${item.text}</p>
            </div>
          </article>`,
          )
          .join("")}
      </div>`;
  }

  private curbMarkup(): string {
    return `
      <div class="hint-list">
        <article class="hint-card">
          <img class="hint-card__photo" src="${curbPhoto}" alt="Бордюр высотой 3 и 5 сантиметров" />
          <div class="curb-scale">
            <span><b>3 см</b> на фото</span>
            <span><b>5 см</b> на фото</span>
          </div>
        </article>
      </div>

      <h2 class="hint-title">Как определить высоту</h2>
      <ol class="steps">
        ${CURB_STEPS.map(
          (step, index) => `
          <li class="step">
            <span class="step__num">${index + 1}</span>
            <div>
              <p class="step__title">${step.title}</p>
              <p class="step__text">${step.text}</p>
            </div>
          </li>`,
        ).join("")}
      </ol>

      <div class="note" style="margin-top:24px">
        <span class="note__icon">${icon("info", 22)}</span>
        <p class="note__text">Фото помогает сравнить, но не заменяет замер.</p>
      </div>
      <div style="height:20px"></div>`;
  }
}
