/**
 * ============================================================================
 *  CrossingRepository — отправка CrossingEntity на бэкенд
 * ============================================================================
 *  Такой же, как RampRepository, только эндпоинт и тип другие.
 * ============================================================================
 */

import { CrossingEntity } from "./crossing.entity";
import { IHttpClient } from "../../shared/http/http-client";
import { Result } from "../../shared/result/result";

/** Путь эндпоинта создания перехода. Уточни у бэкенда и поправь при необходимости. */
export const CROSSING_ENDPOINT = "/crossings";

export interface CrossingCreatedResponse {
  id: number;
}

export class CrossingRepository {
  constructor(private readonly http: IHttpClient) {}

  async create(entity: CrossingEntity): Promise<Result<CrossingCreatedResponse>> {
    return this.http.post<CrossingCreatedResponse>(CROSSING_ENDPOINT, entity);
  }
}
