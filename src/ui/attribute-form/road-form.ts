/**
 * ============================================================================
 *  RoadForm — форма ввода для дороги (UI-слой)
 * ============================================================================
 *
 * Особенности:
 *   - поле "количество полос" — обычный числовой ввод (не справочник);
 *   - ДВА блока условных полей:
 *       * высота рельсов — серое, пока не отмечены трамвайные пути;
 *       * параметры светофора — серые, пока не отмечен светофор.
 * ============================================================================
 */

import { RoadFormInput } from "../../features/road";
import { DictionaryService } from "../../shared/dictionary/dictionary-service";
import { Result, ok, err } from "../../shared/result/result";
import { AttributeForm } from "./attribute-form.contract";
import { createSelect, createCheckbox, createNumberField, Field } from "./form-helpers";

export class RoadForm implements AttributeForm<RoadFormInput> {
  private root: HTMLElement;

  private trafficLanes!: Field<string>;
  private surfaceQuality!: Field<string>;
  private tramTracks!: Field<boolean>;
  private railHeight!: Field<string>;
  private trafficLight!: Field<boolean>;
  private audible!: Field<boolean>;
  private countdown!: Field<boolean>;

  constructor(
    container: HTMLElement,
    private readonly surfaceQualityDict: DictionaryService,
  ) {
    this.root = document.createElement("div");
    this.root.className = "attr-form";
    container.appendChild(this.root);
  }

  async render(): Promise<Result<void>> {
    const surface = await this.surfaceQualityDict.load();
    if (!surface.ok) return err(`Справочник покрытия: ${surface.error}`);

    this.trafficLanes = createNumberField("Количество полос движения", "например, 2");
    this.surfaceQuality = createSelect("Качество покрытия", surface.value);
    this.tramTracks = createCheckbox("Трамвайные пути вдоль дороги");
    this.railHeight = createNumberField("Высота рельсов над дорогой, см", "например, 5");
    this.trafficLight = createCheckbox("Светофор");
    this.audible = createCheckbox("Озвученный светофор");
    this.countdown = createCheckbox("Светофор с обратным отсчётом");

    this.root.appendChild(this.trafficLanes.wrapper);
    this.root.appendChild(this.surfaceQuality.wrapper);
    this.root.appendChild(this.tramTracks.wrapper);
    this.root.appendChild(this.railHeight.wrapper);
    this.root.appendChild(this.trafficLight.wrapper);
    this.root.appendChild(this.audible.wrapper);
    this.root.appendChild(this.countdown.wrapper);

    // УСЛОВНЫЙ блок 1: высота рельсов — только если есть трамвайные пути.
    const applyTram = () => this.railHeight.setEnabled(this.tramTracks.getValue());
    this.tramTracks.wrapper.addEventListener("change", applyTram);
    applyTram();

    // УСЛОВНЫЙ блок 2: параметры светофора — только если есть светофор.
    const applyLight = () => {
      const has = this.trafficLight.getValue();
      this.audible.setEnabled(has);
      this.countdown.setEnabled(has);
    };
    this.trafficLight.wrapper.addEventListener("change", applyLight);
    applyLight();

    return ok(undefined);
  }

  collect(): RoadFormInput {
    return {
      trafficLanes: this.trafficLanes.getValue(),
      surfaceQualityVariant: this.surfaceQuality.getValue(),
      tramTracks: this.tramTracks.getValue(),
      railHeight: this.railHeight.getValue(),
      trafficLight: this.trafficLight.getValue(),
      audibleTrafficLight: this.audible.getValue(),
      countdownTimer: this.countdown.getValue(),
    };
  }
}
