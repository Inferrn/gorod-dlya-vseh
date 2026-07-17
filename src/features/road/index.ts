/**
 * ============================================================================
 *  Публичный API фичи "road"
 * ============================================================================
 */

import { IHttpClient } from "../../shared/http/http-client";
import { Result } from "../../shared/result/result";

import { RoadFormInput } from "./road.entity";
import { RoadParser } from "./road.parser";
import { RoadRepository, RoadCreatedResponse } from "./road.repository";
import { createRoadSurfaceDictionary } from "./road.dictionary";
import { DictionaryService } from "../../shared/dictionary/dictionary-service";

export type { RoadEntity, RoadFormInput } from "./road.entity";
export type { RoadCreatedResponse } from "./road.repository";

export interface RoadFeature {
  /** Справочник покрытия — load() перед показом в форме. */
  surfaceQualityDict: DictionaryService;
  submit(input: RoadFormInput): Promise<Result<RoadCreatedResponse>>;
}

export function createRoadFeature(http: IHttpClient): RoadFeature {
  const surfaceQualityDict = createRoadSurfaceDictionary(http);
  const parser = new RoadParser(surfaceQualityDict);
  const repository = new RoadRepository(http);

  return {
    surfaceQualityDict,

    async submit(input: RoadFormInput): Promise<Result<RoadCreatedResponse>> {
      const parsed = parser.parse(input);
      if (!parsed.ok) return parsed;
      return repository.create(parsed.value);
    },
  };
}
