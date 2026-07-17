/**
 * ============================================================================
 *  Публичный API фичи "ramp"
 * ============================================================================
 *
 * Этот файл — "входная дверь" модуля. Внешний код (UI, обработчик кнопки
 * "Отправить") импортирует ТОЛЬКО отсюда, а не из внутренних файлов фичи.
 * Так внутреннее устройство можно менять, не ломая тех, кто пользуется фичей.
 *
 * Здесь же — фабрика createRampFeature(), которая собирает все части
 * (справочник + парсер + репозиторий) в один готовый к работе объект,
 * и удобный метод submit(), проходящий весь путь: ввод → entity → отправка.
 * ============================================================================
 */

import { IHttpClient } from "../../shared/http/http-client";
import { Result } from "../../shared/result/result";

import { RampFormInput } from "./ramp.entity";
import { RampParser } from "./ramp.parser";
import { RampRepository, RampCreatedResponse } from "./ramp.repository";
import { createCurbHeightDictionary } from "./ramp.dictionary";

// Реэкспорт типов — чтобы UI мог импортировать их тоже отсюда
export type { RampEntity, RampFormInput } from "./ramp.entity";
export type { RampCreatedResponse } from "./ramp.repository";

/**
 * Готовая к использованию фича "ramp": содержит метод submit()
 * и доступ к справочнику (для наполнения выпадашки в форме).
 */
export interface RampFeature {
  /** Справочник высоты бордюра — вызови load() и получишь варианты для UI. */
  curbHeightDict: ReturnType<typeof createCurbHeightDictionary>;

  /**
   * Полный путь: сырой ввод формы → парсинг → отправка на бэк.
   * Перед вызовом нужно один раз загрузить справочник (см. пример ниже).
   */
  submit(input: RampFormInput): Promise<Result<RampCreatedResponse>>;
}

/**
 * Фабрика фичи. Собирает все слои вместе.
 *
 * ПРИМЕР ИСПОЛЬЗОВАНИЯ В UI:
 * ---------------------------------------------------------------------------
 *   import { HttpClient } from "shared/http/http-client";
 *   import { createRampFeature } from "features/ramp";
 *
 *   const http = new HttpClient({ baseUrl: "/api" });
 *   const ramp = createRampFeature(http);
 *
 *   // 1. Загрузить справочник и наполнить выпадающий список высоты бордюра:
 *   const dict = await ramp.curbHeightDict.load();
 *   if (dict.ok) renderOptions(dict.value); // [{id,variant}, ...]
 *
 *   // 2. По нажатию "Отправить" собрать ввод формы и отправить:
 *   const input = {
 *     curbHeightVariant: "2-4cm",
 *     roadAccess: true,
 *     walkerBarrier: false,
 *     tactileTile: true,
 *     rampWidth: "60",
 *     angleSlant: "30",
 *   };
 *   const result = await ramp.submit(input);
 *   if (result.ok) showSuccess(result.value.id);
 *   else showError(result.error); // текст ошибки парсинга или сети
 * ---------------------------------------------------------------------------
 */
export function createRampFeature(http: IHttpClient): RampFeature {
  const curbHeightDict = createCurbHeightDictionary(http);
  const parser = new RampParser(curbHeightDict);
  const repository = new RampRepository(http);

  return {
    curbHeightDict,

    async submit(input: RampFormInput): Promise<Result<RampCreatedResponse>> {
      // Шаг 1. Парсим сырой ввод в чистую entity.
      const parsed = parser.parse(input);
      if (!parsed.ok) {
        // Ошибка парсинга/валидации — на бэк не идём, возвращаем как есть.
        return parsed;
      }

      // Шаг 2. Отправляем валидную entity на бэкенд.
      return repository.create(parsed.value);
    },
  };
}
