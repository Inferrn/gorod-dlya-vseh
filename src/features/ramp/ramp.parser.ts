/**
 * ============================================================================
 *  RampParser — превращает сырой ввод формы (RampFormInput) в RampEntity
 * ============================================================================
 *
 * Это центральный файл-ШАБЛОН. Логика парсинга у всех фич устроена одинаково,
 * меняются только конкретные поля. Разбираешься здесь — поймёшь все остальные.
 *
 * Что делает парсер:
 *   1) Числовые строки  → числа (через общие хелперы parseFloat_/parseInt_).
 *   2) Выбранный текст справочника → числовой id (через DictionaryService).
 *   3) УСЛОВНЫЕ поля: если условие не выполнено — кладёт null, а ввод
 *      пользователя игнорирует (даже если он что-то там напечатал).
 *   4) Собирает всё в RampEntity. Если хоть одно поле невалидно — возвращает
 *      Err с понятным текстом (а не кривую entity).
 *
 * Парсер НЕ ходит в сеть сам. Справочник он получает уже загруженным
 * (DictionaryService с вызванным load()) — это разделение ответственности:
 * за сеть отвечает репозиторий/сервис, парсер только преобразует данные.
 * ============================================================================
 */

import { RampEntity, RampFormInput } from "./ramp.entity";
import { DictionaryService } from "../../shared/dictionary/dictionary-service";
import { parseFloat_, parseBool } from "../../shared/parsing/parsers";
import { Result, ok, err } from "../../shared/result/result";

export class RampParser {
  /**
   * @param curbHeightDict справочник высоты бордюра, УЖЕ загруженный через load().
   *                       Нужен, чтобы перевести выбранный текст в FK-id.
   */
  constructor(private readonly curbHeightDict: DictionaryService) {}

  /**
   * Главный метод: RampFormInput → RampEntity (или ошибка).
   *
   * Возвращаем Result: вызывающий код обязан проверить .ok перед отправкой.
   */
  parse(input: RampFormInput): Result<RampEntity> {
    // --- 1. FK-поле: текст варианта → числовой id ---------------------------
    // Пустая строка = пользователь ничего не выбрал. Говорим об этом его
    // словами (название поля), а не внутренними («неизвестный вариант»).
    if (!input.curbHeightVariant) {
      return err("Заполните поле «Высота бордюра»");
    }

    // variantToId сам вернёт Err, если справочник не загружен или вариант
    // неизвестен. Сразу пробрасываем такую ошибку наверх.
    const curbHeightResult = this.curbHeightDict.variantToId(input.curbHeightVariant);
    if (!curbHeightResult.ok) {
      return curbHeightResult;
    }

    // --- 2. Простые булевы поля (чекбоксы / да-нет) -------------------------
    // parseBool не падает: отсутствие/мусор трактуется как false.
    const roadAccess = parseBool(input.roadAccess);
    const walkerBarrier = parseBool(input.walkerBarrier);
    const tactileTile = parseBool(input.tactileTile);

    // --- 3. УСЛОВНЫЕ поля: ширина и угол зависят от наличия съезда ----------
    // Логика: если съезда нет (roadAccess === false), эти поля не имеют
    // смысла → отправляем null и НЕ парсим пользовательский ввод.
    // Если съезд есть — поля обязательны, парсим и валидируем.
    let rampWidth: number | null = null;
    let angleSlant: number | null = null;

    if (roadAccess) {
      const widthResult = parseFloat_(input.rampWidth, "Ширина съезда");
      if (!widthResult.ok) {
        return widthResult;
      }
      rampWidth = widthResult.value;

      const angleResult = parseFloat_(input.angleSlant, "Угол наклона");
      if (!angleResult.ok) {
        return angleResult;
      }
      angleSlant = angleResult.value;
    }

    // --- 4. Сборка финальной entity ----------------------------------------
    // Сюда дошли только если все проверки выше прошли успешно.
    const entity: RampEntity = {
      curb_height: curbHeightResult.value,
      road_access: roadAccess,
      walker_barrier: walkerBarrier,
      tactile_tile: tactileTile,
      ramp_width: rampWidth,
      angle_slant: angleSlant,
    };

    return ok(entity);
  }
}
