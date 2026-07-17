/**
 * ============================================================================
 *  CrossingForm — форма ввода для перехода (UI-слой)
 * ============================================================================
 *
 * Та же идея, что RampForm, но полей больше и справочников три.
 * Условное поле здесь: "платформа работает" — серое, пока не отмечена
 * "подъёмная платформа".
 * ============================================================================
 */

import { CrossingFormInput } from "../../features/crossing";
import { DictionaryService } from "../../shared/dictionary/dictionary-service";
import { Result, ok, err } from "../../shared/result/result";
import { AttributeForm } from "./attribute-form.contract";
import { createSelect, createCheckbox, Field } from "./form-helpers";

export class CrossingForm implements AttributeForm<CrossingFormInput> {
  private root: HTMLElement;

  private entranceType!: Field<string>;
  private crossingType!: Field<string>;
  private ramp!: Field<boolean>;
  private liftingPlatform!: Field<boolean>;
  private platformWorking!: Field<boolean>;
  private handrails!: Field<boolean>;
  private stairContrast!: Field<boolean>;
  private tactileStrip!: Field<boolean>;
  private lighting!: Field<boolean>;
  private tactileTileCondition!: Field<string>;

  /**
   * @param container контейнер для отрисовки
   * @param dicts три справочника перехода (ещё не загружены — форма сама грузит)
   */
  constructor(
    container: HTMLElement,
    private readonly dicts: {
      entranceType: DictionaryService;
      crossingType: DictionaryService;
      tactileTileCondition: DictionaryService;
    },
  ) {
    this.root = document.createElement("div");
    this.root.className = "attr-form";
    container.appendChild(this.root);
  }

  async render(): Promise<Result<void>> {
    // Грузим все три справочника. Если любой не загрузился — ошибка.
    const entrance = await this.dicts.entranceType.load();
    if (!entrance.ok) return err(`Справочник типа входа: ${entrance.error}`);

    const crossing = await this.dicts.crossingType.load();
    if (!crossing.ok) return err(`Справочник типа перехода: ${crossing.error}`);

    const tactile = await this.dicts.tactileTileCondition.load();
    if (!tactile.ok) return err(`Справочник состояния плитки: ${tactile.error}`);

    // Поля-выпадашки из справочников
    this.entranceType = createSelect("Вход в переход", entrance.value);
    this.crossingType = createSelect("Тип перехода", crossing.value);

    // Галочки
    this.ramp = createCheckbox("Съезд");
    this.liftingPlatform = createCheckbox("Подъёмная платформа");
    this.platformWorking = createCheckbox("Подъёмная платформа работает");
    this.handrails = createCheckbox("Поручни ниже 70 см");
    this.stairContrast = createCheckbox("Контрастная маркировка на лестнице");
    this.tactileStrip = createCheckbox("Тактильная полоса перед лестницей");
    this.lighting = createCheckbox("Освещение в переходе");

    this.tactileTileCondition = createSelect("Тактильная плитка в переходе", tactile.value);

    // Вставляем по порядку (близко к макету перехода)
    this.root.appendChild(this.entranceType.wrapper);
    this.root.appendChild(this.crossingType.wrapper);
    this.root.appendChild(this.ramp.wrapper);
    this.root.appendChild(this.liftingPlatform.wrapper);
    this.root.appendChild(this.platformWorking.wrapper);
    this.root.appendChild(this.handrails.wrapper);
    this.root.appendChild(this.stairContrast.wrapper);
    this.root.appendChild(this.tactileStrip.wrapper);
    this.root.appendChild(this.tactileTileCondition.wrapper);
    this.root.appendChild(this.lighting.wrapper);

    // УСЛОВНОЕ поле: "платформа работает" активна только если есть платформа.
    const applyConditional = () => {
      this.platformWorking.setEnabled(this.liftingPlatform.getValue());
    };
    this.liftingPlatform.wrapper.addEventListener("change", applyConditional);
    applyConditional(); // начальное состояние: платформы нет → поле серое

    return ok(undefined);
  }

  collect(): CrossingFormInput {
    return {
      entranceTypeVariant: this.entranceType.getValue(),
      crossingTypeVariant: this.crossingType.getValue(),
      ramp: this.ramp.getValue(),
      liftingPlatform: this.liftingPlatform.getValue(),
      platformWorking: this.platformWorking.getValue(),
      handrailsBelow70cm: this.handrails.getValue(),
      stairContrastMarking: this.stairContrast.getValue(),
      tactileStrip: this.tactileStrip.getValue(),
      lighting: this.lighting.getValue(),
      tactileTileConditionVariant: this.tactileTileCondition.getValue(),
    };
  }
}
