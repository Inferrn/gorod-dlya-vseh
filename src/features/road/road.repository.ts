/**
 * ============================================================================
 *  RoadRepository — отправка RoadEntity на бэкенд
 * ============================================================================
 */

import { RoadEntity } from "./road.entity";
import { IHttpClient } from "../../shared/http/http-client";
import { Result } from "../../shared/result/result";

/** Путь эндпоинта создания дороги. Уточни у бэкенда и поправь при необходимости. */
export const ROAD_ENDPOINT = "/roads";

export interface RoadCreatedResponse {
  id: number;
}

export class RoadRepository {
  constructor(private readonly http: IHttpClient) {}

  async create(entity: RoadEntity): Promise<Result<RoadCreatedResponse>> {
    return this.http.post<RoadCreatedResponse>(ROAD_ENDPOINT, entity);
  }
}
