/**
 * ============================================================================
 *  Crossing — доменная модель "Переход" (entity) + тип сырого ввода формы
 * ============================================================================
 *
 * Слой ДОМЕНА фичи "crossing". Только типы, без логики и сети.
 * Соответствует таблице `crossing` в БД.
 *
 * Как и у ramp, здесь два типа:
 *   1) CrossingFormInput — сырой ввод из формы (тексты выбора + чекбоксы).
 *   2) CrossingEntity    — чистая модель на бэкенд (FK как id, bool, null).
 *
 * Мост между ними — CrossingParser (crossing.parser.ts).
 * ============================================================================
 */

/**
 * CrossingEntity — что отправляем на бэкенд (зеркало таблицы `crossing`).
 * id не указываем — его присваивает база.
 */
export interface CrossingEntity {
  /** FK: тип входа (covered / open air). Числовой id варианта. */
  entrance_type: number;

  /** FK: тип перехода (underground / overground). Числовой id варианта. */
  crossing_type: number;

  /** Есть съезд? (чекбокс) */
  ramp: boolean;

  /** Есть подъёмная платформа? (чекбокс) */
  lifting_platform: boolean;

  /**
   * Подъёмная платформа работает? (чекбокс)
   * УСЛОВНОЕ ПОЛЕ: имеет смысл только если lifting_platform === true.
   * Если платформы нет — здесь null.
   */
  platform_working: boolean | null;

  /** Поручни ниже 70 см? (чекбокс) */
  handrails_below_70cm: boolean;

  /** Контрастная маркировка на лестнице? (чекбокс) */
  stair_contrast_marking: boolean;

  /** Тактильная полоса перед лестницей? (чекбокс) */
  tactile_strip: boolean;

  /** Освещение в переходе? (чекбокс) */
  lighting: boolean;

  /** FK: состояние тактильной плитки (есть корректная / частично / нет). Id варианта. */
  tactile_tile_condition: number;
}

/**
 * CrossingFormInput — сырой ввод из формы, ДО парсинга.
 * FK-поля — выбранный ТЕКСТ варианта. Остальное — состояния чекбоксов.
 */
export interface CrossingFormInput {
  /** Выбранный текст типа входа, например "covered". */
  entranceTypeVariant: string;

  /** Выбранный текст типа перехода, например "underground". */
  crossingTypeVariant: string;

  ramp: boolean;
  liftingPlatform: boolean;
  /** Состояние чекбокса "платформа работает" (учтётся только если есть платформа). */
  platformWorking: boolean;
  handrailsBelow70cm: boolean;
  stairContrastMarking: boolean;
  tactileStrip: boolean;
  lighting: boolean;

  /** Выбранный текст состояния тактильной плитки. */
  tactileTileConditionVariant: string;
}
