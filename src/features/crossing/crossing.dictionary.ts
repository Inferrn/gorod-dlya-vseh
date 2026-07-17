/**
 * ============================================================================
 *  Справочники фичи "crossing"
 * ============================================================================
 *
 * В отличие от ramp (там был один справочник), у перехода их ТРИ:
 *   - entrance_type          (тип входа: covered / open air)
 *   - crossing_type          (тип перехода: underground / overground)
 *   - tactile_tile_condition (состояние тактильной плитки: 3 варианта)
 *
 * На каждый — своя фабрика и своя константа с эндпоинтом.
 * Это и есть "точка расширения", про которую говорилось в ramp.dictionary.ts:
 * у фичи может быть сколько угодно справочников, просто добавляешь ещё фабрику.
 * ============================================================================
 */

import { IHttpClient } from "../../shared/http/http-client";
import { DictionaryService } from "../../shared/dictionary/dictionary-service";

export const ENTRANCE_TYPE_ENDPOINT = "/dictionaries/entrance-type";
export const CROSSING_TYPE_ENDPOINT = "/dictionaries/crossing-type";
export const TACTILE_TILE_CONDITION_ENDPOINT = "/dictionaries/tactile-tile-condition";

export function createEntranceTypeDictionary(http: IHttpClient): DictionaryService {
  return new DictionaryService(http, ENTRANCE_TYPE_ENDPOINT);
}

export function createCrossingTypeDictionary(http: IHttpClient): DictionaryService {
  return new DictionaryService(http, CROSSING_TYPE_ENDPOINT);
}

export function createTactileTileConditionDictionary(http: IHttpClient): DictionaryService {
  return new DictionaryService(http, TACTILE_TILE_CONDITION_ENDPOINT);
}
