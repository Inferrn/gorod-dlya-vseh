/**
 * ============================================================================
 *  Хелперы для построения форм (общие для ramp / crossing / road)
 * ============================================================================
 *
 * ЗАЧЕМ:
 * Во всех трёх формах повторяются одни и те же кирпичики — выпадающий список,
 * чекбокс, числовое поле. Чтобы не копировать разметку в каждой форме, собираем
 * их здесь одинаковыми функциями. Форма конкретного типа просто зовёт эти
 * хелперы и не думает про вёрстку каждого поля.
 *
 * Каждый хелпер:
 *   - создаёт готовый DOM-элемент (через document.createElement);
 *   - возвращает и обёртку (чтобы вставить на страницу), и само поле ввода
 *     (чтобы потом прочитать значение).
 *
 * Тут только "как нарисовать поле". Никакой логики парсинга/сети — форма и
 * подавно UI-слой их не касаются.
 * ============================================================================
 */

import { DictionaryItem } from "../../shared/dictionary/dictionary-service";

/**
 * Результат создания поля: обёртка для вставки + доступ к значению.
 * getValue() читает текущее значение поля в нужный момент (при сохранении).
 */
export interface Field<T> {
  /** DOM-элемент, который вставляем на страницу. */
  wrapper: HTMLElement;
  /** Прочитать текущее значение поля. */
  getValue(): T;
  /** Включить/выключить поле (для условных полей — "серые, пока неактивны"). */
  setEnabled(enabled: boolean): void;
}

/**
 * Выпадающий список (select), наполненный вариантами справочника.
 * Показывает variant (русский текст), а значением служит тоже текст —
 * дальше парсер через справочник превратит его в id.
 *
 * @param label человекочитаемая подпись поля
 * @param items варианты из справочника ({ id, variant })
 */
export function createSelect(label: string, items: DictionaryItem[]): Field<string> {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const labelEl = document.createElement("label");
  labelEl.className = "field-label";
  labelEl.textContent = label;

  const select = document.createElement("select");
  select.className = "field-select";

  // Первый пункт — пустой (placeholder), чтобы не выбралось что-то по умолчанию.
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "— выберите —";
  select.appendChild(placeholder);

  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.variant; // значение = текст варианта
    option.textContent = item.variant;
    select.appendChild(option);
  }

  wrapper.appendChild(labelEl);
  wrapper.appendChild(select);

  return {
    wrapper,
    getValue: () => select.value,
    setEnabled: (enabled) => {
      select.disabled = !enabled;
      wrapper.classList.toggle("field--disabled", !enabled);
    },
  };
}

/**
 * Чекбокс с подписью. Значение — boolean.
 */
export function createCheckbox(label: string): Field<boolean> {
  const wrapper = document.createElement("div");
  wrapper.className = "field field--checkbox";

  const labelEl = document.createElement("label");
  labelEl.className = "checkbox-label";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "field-checkbox";

  const text = document.createElement("span");
  text.textContent = label;

  labelEl.appendChild(input);
  labelEl.appendChild(text);
  wrapper.appendChild(labelEl);

  return {
    wrapper,
    getValue: () => input.checked,
    setEnabled: (enabled) => {
      input.disabled = !enabled;
      wrapper.classList.toggle("field--disabled", !enabled);
    },
  };
}

/**
 * Числовое поле ввода (для ширины, угла, количества полос, высоты рельсов).
 * Значение возвращается СТРОКОЙ — как есть, без преобразования: превращать
 * в число будет парсер. Форма не парсит, только собирает сырой ввод.
 *
 * @param label       подпись
 * @param placeholder подсказка внутри поля (например "60")
 */
export function createNumberField(label: string, placeholder = ""): Field<string> {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const labelEl = document.createElement("label");
  labelEl.className = "field-label";
  labelEl.textContent = label;

  const input = document.createElement("input");
  input.type = "text"; // именно text, а не number: сами валидируем в парсере,
  input.inputMode = "decimal"; // но на телефоне показываем цифровую клавиатуру
  input.className = "field-input";
  input.placeholder = placeholder;

  wrapper.appendChild(labelEl);
  wrapper.appendChild(input);

  return {
    wrapper,
    getValue: () => input.value,
    setEnabled: (enabled) => {
      input.disabled = !enabled;
      wrapper.classList.toggle("field--disabled", !enabled);
    },
  };
}
