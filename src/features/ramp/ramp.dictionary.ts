/**
 * ============================================================================
 *  Справочники фичи "ramp"
 * ============================================================================
 *
 * У съезда один FK-справочник — curb_height (высота бордюра).
 * Здесь мы просто создаём экземпляр общего DictionaryService (см. shared)
 * и указываем ему конкретный эндпоинт этого справочника.
 *
 * ТОЧКА РАСШИРЕНИЯ:
 * Если в будущем у фичи появится ещё один справочник — добавляешь ещё одну
 * фабрику рядом. У других фич (crossing, road) справочников несколько —
 * там будет несколько таких функций в их *.dictionary.ts.
 * ============================================================================
 */

import { IHttpClient } from "../../shared/http/http-client";
import { DictionaryService } from "../../shared/dictionary/dictionary-service";

/**
 * Путь к справочнику высоты бордюра на бэкенде.
 * Вынесен в константу, чтобы не хардкодить строку в разных местах.
 * Поменяется адрес — правишь здесь.
 */
export const CURB_HEIGHT_ENDPOINT = "/dictionaries/curb-height";

/**
 * Создать сервис справочника высоты бордюра.
 * @param http общий HTTP-клиент
 */
export function createCurbHeightDictionary(http: IHttpClient): DictionaryService {
  return new DictionaryService(http, CURB_HEIGHT_ENDPOINT);
}
