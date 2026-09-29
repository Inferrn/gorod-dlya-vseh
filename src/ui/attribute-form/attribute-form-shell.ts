/**
 * ============================================================================
 *  AttributeFormShell — каркас с переключателем типа (аккордеон)
 * ============================================================================
 *
 * Три секции: Съезд / Переход / Дорога. Открыта ОДНА за раз (по договорённости
 * "один тип за раз").
 *
 * СОХРАНЕНИЕ ВВЕДЁННОГО: форма каждой секции строится ОДИН раз при первом
 * открытии, а при переключении секций только прячется (display: none), а не
 * уничтожается. Введённые значения живут прямо в DOM формы, поэтому при
 * возврате в секцию пользователь видит всё, что уже ввёл. Хранилище не нужно:
 * данные существуют, пока существует каркас — то есть пока открыт экран ввода
 * для текущей точки (новая точка = новый каркас, см. app.ts).
 *
 * Каркас НЕ знает внутренностей форм — работает с ними через общий договор
 * AttributeForm (render/collect). Поэтому добавление типа не меняет этот код.
 *
 * Сохранение: каркас знает, какая форма сейчас активна, и по кнопке "Сохранить"
 * зовёт её collect(). Что делать с собранными данными — решает тот, кто создал
 * каркас (передаёт колбэк onSave). Так UI не привязан к отправке.
 * ============================================================================
 */

import { AttributeForm } from "./attribute-form.contract";

/** Описание одной секции аккордеона. */
export interface FormSection {
  /** Ключ типа (используется в колбэке onSave, чтобы понять что сохраняем). */
  key: "ramp" | "crossing" | "road";
  /** Заголовок секции для пользователя. */
  title: string;
  /**
   * Фабрика формы: получает контейнер, возвращает форму по общему договору.
   * Тип ввода разный у разных форм, поэтому здесь unknown — каркасу конкретика
   * не нужна, он только строит и собирает.
   */
  createForm(container: HTMLElement): AttributeForm<unknown>;
}

export class AttributeFormShell {
  private activeForm: AttributeForm<unknown> | null = null;
  private activeKey: FormSection["key"] | null = null;

  /**
   * Уже построенные формы секций. Форма строится при первом открытии секции
   * и дальше переиспользуется — вместе с её DOM живут введённые значения.
   */
  private readonly builtForms = new Map<FormSection["key"], AttributeForm<unknown>>();

  /**
   * @param root      контейнер, куда рисуется весь аккордеон
   * @param sections  список секций (три типа)
   * @param onSave    что делать с собранными данными (ключ типа + сырой ввод)
   */
  constructor(
    private readonly root: HTMLElement,
    private readonly sections: FormSection[],
    private readonly onSave: (key: FormSection["key"], input: unknown) => void,
  ) {}

  /** Построить аккордеон. */
  render(): void {
    for (const section of this.sections) {
      // Заголовок-переключатель секции
      const header = document.createElement("div");
      header.className = "section-title";
      header.innerHTML = `<span>${section.title}</span><span class="chevron">▼</span>`;

      // Контейнер под форму этой секции (пока пустой)
      const body = document.createElement("div");
      body.className = "section-body";
      body.style.display = "none";

      header.addEventListener("click", () => this.toggle(section, header, body));

      this.root.appendChild(header);
      this.root.appendChild(body);
    }
  }

  /** Открыть секцию (и закрыть остальные — один тип за раз). */
  private async toggle(
    section: FormSection,
    header: HTMLElement,
    body: HTMLElement,
  ): Promise<void> {
    // Клик по уже открытой секции — сворачиваем её (данные в DOM остаются).
    if (this.activeKey === section.key) {
      this.close(header, body);
      return;
    }

    // Прячем все секции, затем показываем выбранную.
    this.closeAll();

    body.style.display = "block";
    header.querySelector(".chevron")!.textContent = "▲";

    // Форму строим только при первом открытии секции; дальше переиспользуем
    // готовую — так введённые значения переживают переключение секций.
    let form = this.builtForms.get(section.key);
    if (!form) {
      body.innerHTML = ""; // убрать возможное сообщение об ошибке прошлой попытки
      form = section.createForm(body);
      const rendered = await form.render();
      if (!rendered.ok) {
        // Не кэшируем неудачу: следующее открытие секции попробует построить заново
        // (например, сеть появилась и справочники загрузятся).
        body.innerHTML = `<div class="form-error">${rendered.error}</div>`;
        return;
      }
      this.builtForms.set(section.key, form);
    }

    this.activeForm = form;
    this.activeKey = section.key;
  }

  private close(header: HTMLElement, body: HTMLElement): void {
    body.style.display = "none"; // только прячем — введённое сохраняется в DOM
    header.querySelector(".chevron")!.textContent = "▼";
    this.activeForm = null;
    this.activeKey = null;
  }

  private closeAll(): void {
    const headers = this.root.querySelectorAll(".section-title");
    const bodies = this.root.querySelectorAll(".section-body");
    headers.forEach((h) => (h.querySelector(".chevron")!.textContent = "▼"));
    bodies.forEach((b) => {
      (b as HTMLElement).style.display = "none"; // прячем, не уничтожаем
    });
    this.activeForm = null;
    this.activeKey = null;
  }

  /**
   * Собрать данные активной формы и передать наружу через onSave.
   * Если ни одна секция не открыта — ничего не делаем (сохранять нечего).
   */
  save(): void {
    if (!this.activeForm || !this.activeKey) {
      return;
    }
    const input = this.activeForm.collect();
    this.onSave(this.activeKey, input);
  }

  /** Открыта ли какая-нибудь секция (для подсказки в интерфейсе). */
  hasActiveSection(): boolean {
    return this.activeKey !== null;
  }

  /**
   * Сбросить секцию после успешной отправки: её данные уже в базе, поэтому
   * форму забываем и секцию сворачиваем. Повторное "Сохранить" по отправленной
   * форме становится невозможным — дублей в базе не будет. Введённое в ДРУГИХ
   * секциях при этом не трогаем.
   */
  resetSection(key: FormSection["key"]): void {
    this.builtForms.delete(key);

    // Секции добавлялись в root парами (заголовок + тело) в порядке sections,
    // поэтому i-я секция = элементы 2i и 2i+1.
    const index = this.sections.findIndex((s) => s.key === key);
    if (index >= 0) {
      const header = this.root.children[index * 2] as HTMLElement | undefined;
      const body = this.root.children[index * 2 + 1] as HTMLElement | undefined;
      if (header && body) {
        body.innerHTML = "";
        body.style.display = "none";
        header.querySelector(".chevron")!.textContent = "▼";
      }
    }

    if (this.activeKey === key) {
      this.activeForm = null;
      this.activeKey = null;
    }
  }
}
