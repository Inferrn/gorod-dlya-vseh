/**
 * ============================================================================
 *  RampForm — форма ввода для съезда (UI-слой)
 * ============================================================================
 *
 * ОТВЕТСТВЕННОСТЬ (что делает и чего НЕ делает):
 *   ДЕЛАЕТ:
 *     - рисует поля съезда (высота бордюра, галочки, ширина, угол);
 *     - грузит справочник высоты бордюра, чтобы наполнить выпадашку;
 *     - управляет УСЛОВНЫМИ полями: ширина/угол серые, пока не отмечен съезд;
 *     - по запросу отдаёт собранный ввод как RampFormInput.
 *   НЕ ДЕЛАЕТ:
 *     - не парсит (это парсер фичи);
 *     - не отправляет на сервер (это репозиторий фичи);
 *     - вообще не знает про сеть и id справочников.
 *
 * Такое разделение = "без спагетти": форма занимается только экраном, а вся
 * доменная логика остаётся в features/ramp. Связь — через готовый RampFormInput.
 * ============================================================================
 */

import { RampFormInput } from "../../features/ramp";
import { DictionaryService } from "../../shared/dictionary/dictionary-service";
import { Result, ok, err } from "../../shared/result/result";
import { AttributeForm } from "./attribute-form.contract";
import {
  createSelect,
  createCheckbox,
  createNumberField,
  Field,
} from "./form-helpers";

export class RampForm implements AttributeForm<RampFormInput> {
  private root: HTMLElement;

  // Поля формы. Храним ссылки, чтобы потом прочитать значения при сохранении.
  private curbHeight!: Field<string>;
  private roadAccess!: Field<boolean>;
  private walkerBarrier!: Field<boolean>;
  private tactileTile!: Field<boolean>;
  private rampWidth!: Field<string>;
  private angleSlant!: Field<string>;

  /**
   * @param container куда отрисовать форму (DOM-элемент)
   * @param curbHeightDict справочник высоты бордюра (ещё НЕ загружен — форма
   *                       сама вызовет load())
   */
  constructor(
    container: HTMLElement,
    private readonly curbHeightDict: DictionaryService,
  ) {
    this.root = document.createElement("div");
    this.root.className = "attr-form";
    container.appendChild(this.root);
  }

  /**
   * Построить форму. Асинхронно, потому что сначала грузим справочник.
   * Возвращает Result: если справочник не загрузился — отдадим ошибку,
   * а не покажем пустую выпадашку.
   */
  async render(): Promise<Result<void>> {
    // Грузим справочник высоты бордюра для выпадашки.
    const dict = await this.curbHeightDict.load();
    if (!dict.ok) {
      return err(`Не удалось загрузить справочник высоты бордюра: ${dict.error}`);
    }

    // --- Поле 1: высота бордюра (выпадашка из справочника) ------------------
    this.curbHeight = createSelect("Высота бордюра", dict.value);

    // --- Поле 2: съезд на проезжую часть (галочка) -------------------------
    // Именно эта галочка управляет условными полями ниже.
    this.roadAccess = createCheckbox("Съезд на проезжую часть");

    // --- Поле 3: ограждение у перехода (да/нет через выпадашку) -------------
    // В таблице это bool, но по макету — выбор Да/Нет, поэтому маленький select.
    // this.walkerBarrier = createSelect("Ограждение у пешеходного перехода", [
    //   { id: 1, variant: "да" },
    //   { id: 0, variant: "нет" },
    // ]); // TODO: убрать если будет решено, что это поле не нужно

    this.walkerBarrier = createCheckbox("Ограждение у пешеходного перехода");

    // --- Поле 4: тактильная плитка (галочка) -------------------------------
    this.tactileTile = createCheckbox("Наличие тактильной плитки");

    // --- Поля 5-6: УСЛОВНЫЕ — ширина и угол --------------------------------
    this.rampWidth = createNumberField("Ширина съезда, см", "например, 60");
    this.angleSlant = createNumberField("Угол наклона, °", "например, 30");

    // Вставляем всё по порядку.
    this.root.appendChild(this.curbHeight.wrapper);
    this.root.appendChild(this.roadAccess.wrapper);
    this.root.appendChild(this.walkerBarrier.wrapper);
    this.root.appendChild(this.tactileTile.wrapper);
    this.root.appendChild(this.rampWidth.wrapper);
    this.root.appendChild(this.angleSlant.wrapper);

    // --- Логика условных полей ---------------------------------------------
    // По договорённости: ширина/угол показываются ВСЕГДА, но серые (disabled),
    // пока не отмечен "съезд на проезжую часть". Отметил — разблокировались.
    const applyConditional = () => {
      const hasRamp = this.roadAccess.getValue();
      this.rampWidth.setEnabled(hasRamp);
      this.angleSlant.setEnabled(hasRamp);
    };

    // Реагируем на каждый клик по галочке съезда.
    this.roadAccess.wrapper.addEventListener("change", applyConditional);
    // И сразу выставляем начальное состояние (съезд не отмечен → поля серые).
    applyConditional();

    return ok(undefined);
  }

  /**
   * Собрать текущий ввод в RampFormInput — тот самый объект, который умеет
   * парсить RampParser. Форма отдаёт СЫРЫЕ значения, ничего не преобразуя.
   */
  collect(): RampFormInput {
    return {
      curbHeightVariant: this.curbHeight.getValue(),
      roadAccess: this.roadAccess.getValue(),
      walkerBarrier: this.walkerBarrier.getValue(),
      tactileTile: this.tactileTile.getValue(),
      rampWidth: this.rampWidth.getValue(),
      angleSlant: this.angleSlant.getValue(),
    };
  }
}
