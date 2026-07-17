/**
 * ============================================================================
 *  Публичный API фичи "crossing"
 * ============================================================================
 *  Аналог ramp/index.ts. Отличие — три справочника вместо одного,
 *  поэтому в фиче удобно отдать их наружу списком (для наполнения UI).
 * ============================================================================
 */

import { IHttpClient } from "../../shared/http/http-client";
import { Result } from "../../shared/result/result";

import { CrossingFormInput } from "./crossing.entity";
import { CrossingParser } from "./crossing.parser";
import { CrossingRepository, CrossingCreatedResponse } from "./crossing.repository";
import {
  createEntranceTypeDictionary,
  createCrossingTypeDictionary,
  createTactileTileConditionDictionary,
} from "./crossing.dictionary";
import { DictionaryService } from "../../shared/dictionary/dictionary-service";

export type { CrossingEntity, CrossingFormInput } from "./crossing.entity";
export type { CrossingCreatedResponse } from "./crossing.repository";

export interface CrossingFeature {
  /** Справочники перехода — каждый нужно load() перед показом в форме. */
  dictionaries: {
    entranceType: DictionaryService;
    crossingType: DictionaryService;
    tactileTileCondition: DictionaryService;
  };
  submit(input: CrossingFormInput): Promise<Result<CrossingCreatedResponse>>;
}

export function createCrossingFeature(http: IHttpClient): CrossingFeature {
  const entranceType = createEntranceTypeDictionary(http);
  const crossingType = createCrossingTypeDictionary(http);
  const tactileTileCondition = createTactileTileConditionDictionary(http);

  const parser = new CrossingParser(entranceType, crossingType, tactileTileCondition);
  const repository = new CrossingRepository(http);

  return {
    dictionaries: { entranceType, crossingType, tactileTileCondition },

    async submit(input: CrossingFormInput): Promise<Result<CrossingCreatedResponse>> {
      const parsed = parser.parse(input);
      if (!parsed.ok) return parsed;
      return repository.create(parsed.value);
    },
  };
}
