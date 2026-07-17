/**
 * ============================================================================
 *  CrossingParser — CrossingFormInput → CrossingEntity
 * ============================================================================
 *
 * Тот же шаблон, что RampParser, но полей больше и справочников три.
 * Структура ровно та же — сравни с ramp.parser.ts, узнаешь узор:
 *   1) FK: текст варианта → id (для каждого из трёх справочников);
 *   2) булевы поля через parseBool;
 *   3) условное поле platform_working (только если есть платформа);
 *   4) сборка entity.
 * ============================================================================
 */

import { CrossingEntity, CrossingFormInput } from "./crossing.entity";
import { DictionaryService } from "../../shared/dictionary/dictionary-service";
import { parseBool } from "../../shared/parsing/parsers";
import { Result, ok } from "../../shared/result/result";

export class CrossingParser {
  /**
   * Парсеру нужны все три справочника перехода, УЖЕ загруженные (load()).
   */
  constructor(
    private readonly entranceTypeDict: DictionaryService,
    private readonly crossingTypeDict: DictionaryService,
    private readonly tactileTileConditionDict: DictionaryService,
  ) {}

  parse(input: CrossingFormInput): Result<CrossingEntity> {
    // --- 1. Три FK-поля: текст → id ----------------------------------------
    // Каждый variantToId может вернуть Err (не загружен / неизвестный вариант).
    // Проверяем по очереди и сразу пробрасываем первую же ошибку.
    const entranceType = this.entranceTypeDict.variantToId(input.entranceTypeVariant);
    if (!entranceType.ok) return entranceType;

    const crossingType = this.crossingTypeDict.variantToId(input.crossingTypeVariant);
    if (!crossingType.ok) return crossingType;

    const tactileCondition = this.tactileTileConditionDict.variantToId(
      input.tactileTileConditionVariant,
    );
    if (!tactileCondition.ok) return tactileCondition;

    // --- 2. Булевы поля (чекбоксы) -----------------------------------------
    const ramp = parseBool(input.ramp);
    const liftingPlatform = parseBool(input.liftingPlatform);
    const handrailsBelow70cm = parseBool(input.handrailsBelow70cm);
    const stairContrastMarking = parseBool(input.stairContrastMarking);
    const tactileStrip = parseBool(input.tactileStrip);
    const lighting = parseBool(input.lighting);

    // --- 3. УСЛОВНОЕ поле: платформа работает — только если платформа есть --
    // Нет платформы (liftingPlatform === false) → вопрос "работает ли" не имеет
    // смысла → null. Есть платформа → берём реальное значение чекбокса.
    const platformWorking: boolean | null = liftingPlatform
      ? parseBool(input.platformWorking)
      : null;

    // --- 4. Сборка entity ---------------------------------------------------
    const entity: CrossingEntity = {
      entrance_type: entranceType.value,
      crossing_type: crossingType.value,
      ramp,
      lifting_platform: liftingPlatform,
      platform_working: platformWorking,
      handrails_below_70cm: handrailsBelow70cm,
      stair_contrast_marking: stairContrastMarking,
      tactile_strip: tactileStrip,
      lighting,
      tactile_tile_condition: tactileCondition.value,
    };

    return ok(entity);
  }
}
