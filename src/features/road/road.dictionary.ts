/**
 * ============================================================================
 *  Справочники фичи "road"
 * ============================================================================
 *  У дороги один FK-справочник — surface_quality (тип покрытия, 8 вариантов).
 * ============================================================================
 */

import { IHttpClient } from "../../shared/http/http-client";
import { DictionaryService } from "../../shared/dictionary/dictionary-service";

export const ROAD_SURFACE_ENDPOINT = "/dictionaries/road-surface";

export function createRoadSurfaceDictionary(http: IHttpClient): DictionaryService {
  return new DictionaryService(http, ROAD_SURFACE_ENDPOINT);
}
