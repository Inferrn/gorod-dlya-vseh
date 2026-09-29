/**
 * ============================================================================
 *  RoadRepository — отправка RoadEntity на бэкенд
 * ============================================================================
 */

import { RoadEntity } from "./road.entity";
import { IHttpClient } from "../../shared/http/http-client";
import { Result } from "../../shared/result/result";
import { GeoPoint } from "../../shared/geo/geo-point";

/** Путь эндпоинта создания дороги (бэкенд: POST /api/roads). */
export const ROAD_ENDPOINT = "/roads";

export interface RoadCreatedResponse {
  id: number;
}

export class RoadRepository {
  constructor(private readonly http: IHttpClient) {}

  async create(entity: RoadEntity, point: GeoPoint): Promise<Result<RoadCreatedResponse>> {
    return this.http.post<RoadCreatedResponse>(ROAD_ENDPOINT, { ...point, ...entity });
  }
}
