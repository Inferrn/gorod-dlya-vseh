/**
 * ============================================================================
 *  RoadParser — RoadFormInput → RoadEntity
 * ============================================================================
 *
 * Тот же шаблон, но с двумя новыми моментами по сравнению с ramp/crossing:
 *   - парсим ЦЕЛОЕ число (traffic_lanes) через parseInt_;
 *   - ДВА независимых блока условных полей (рельсы и светофор).
 * ============================================================================
 */

import { RoadEntity, RoadFormInput } from "./road.entity";
import { DictionaryService } from "../../shared/dictionary/dictionary-service";
import { parseInt_, parseFloat_, parseBool } from "../../shared/parsing/parsers";
import { Result, ok, err } from "../../shared/result/result";

export class RoadParser {
  constructor(private readonly surfaceQualityDict: DictionaryService) {}

  parse(input: RoadFormInput): Result<RoadEntity> {
    // --- 1. Количество полос: строка → целое число -------------------------
    const trafficLanes = parseInt_(input.trafficLanes, "Количество полос");
    if (!trafficLanes.ok) return trafficLanes;

    // --- 2. FK-поле: текст покрытия → id -----------------------------------
    // Пустая строка = пользователь ничего не выбрал — говорим названием поля.
    if (!input.surfaceQualityVariant) {
      return err("Заполните поле «Качество покрытия»");
    }
    const surfaceQuality = this.surfaceQualityDict.variantToId(input.surfaceQualityVariant);
    if (!surfaceQuality.ok) return surfaceQuality;

    // --- 3. Булевы поля (выбор нет/есть) -----------------------------------
    const tramTracks = parseBool(input.tramTracks);
    const trafficLight = parseBool(input.trafficLight);

    // --- 4a. УСЛОВНЫЙ блок: высота рельсов — только если есть пути ----------
    let railHeight: number | null = null;
    if (tramTracks) {
      const rh = parseFloat_(input.railHeight, "Высота рельсов");
      if (!rh.ok) return rh;
      railHeight = rh.value;
    }

    // --- 4b. УСЛОВНЫЙ блок: параметры светофора — только если есть светофор -
    // Оба поля зависят от одного условия. Нет светофора → оба null.
    let audible: boolean | null = null;
    let countdown: boolean | null = null;
    if (trafficLight) {
      audible = parseBool(input.audibleTrafficLight);
      countdown = parseBool(input.countdownTimer);
    }

    // --- 5. Сборка entity ---------------------------------------------------
    const entity: RoadEntity = {
      traffic_lanes: trafficLanes.value,
      surface_quality: surfaceQuality.value,
      tram_tracks: tramTracks,
      rail_height: railHeight,
      traffic_light: trafficLight,
      audible_traffic_light: audible,
      countdown_timer: countdown,
    };

    return ok(entity);
  }
}
