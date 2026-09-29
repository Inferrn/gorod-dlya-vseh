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
import { GeoPoint } from "../../shared/geo/geo-point";

/** Путь эндпоинта создания перехода (бэкенд: POST /api/crossings). */
export const CROSSING_ENDPOINT = "/crossings";

export interface CrossingCreatedResponse {
  id: number;
}

export class CrossingRepository {
  constructor(private readonly http: IHttpClient) {}

  async create(entity: CrossingEntity, point: GeoPoint): Promise<Result<CrossingCreatedResponse>> {
    return this.http.post<CrossingCreatedResponse>(CROSSING_ENDPOINT, { ...point, ...entity });
  }
}
