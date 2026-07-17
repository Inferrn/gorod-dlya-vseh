/**
 * ============================================================================
 *  AttributeFormShell — каркас с переключателем типа (аккордеон)
 * ============================================================================
 *
 * Три секции: Съезд / Переход / Дорога. Открыта ОДНА за раз (по договорённости
 * "один тип за раз"). При открытии секции строится соответствующая форма;
 * при переключении — предыдущая убирается.
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
    // Клик по уже открытой секции — сворачиваем её.
    if (this.activeKey === section.key) {
      this.close(header, body);
      return;
    }

    // Закрываем все секции, затем открываем выбранную.
    this.closeAll();

    body.style.display = "block";
    body.innerHTML = ""; // очистить прошлое содержимое
    header.querySelector(".chevron")!.textContent = "▲";

    // Строим форму этой секции.
    const form = section.createForm(body);
    const rendered = await form.render();
    if (!rendered.ok) {
      body.innerHTML = `<div class="form-error">${rendered.error}</div>`;
      return;
    }

    this.activeForm = form;
    this.activeKey = section.key;
  }

  private close(header: HTMLElement, body: HTMLElement): void {
    body.style.display = "none";
    body.innerHTML = "";
    header.querySelector(".chevron")!.textContent = "▼";
    this.activeForm = null;
    this.activeKey = null;
  }

  private closeAll(): void {
    const headers = this.root.querySelectorAll(".section-title");
    const bodies = this.root.querySelectorAll(".section-body");
    headers.forEach((h) => (h.querySelector(".chevron")!.textContent = "▼"));
    bodies.forEach((b) => {
      (b as HTMLElement).style.display = "none";
      b.innerHTML = "";
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
}
