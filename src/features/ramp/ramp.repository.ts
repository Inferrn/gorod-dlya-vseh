/**
 * ============================================================================
 *  RampRepository — отправка RampEntity на бэкенд (слой ДАННЫХ)
 * ============================================================================
 *
 * Репозиторий — единственное место в фиче, которое знает, КУДА и КАК
 * отправлять данные. Парсер готовит entity, репозиторий её отправляет.
 * Такое разделение позволяет тестировать парсер без сети, а при смене
 * API править только тут.
 *
 * Использует общий HttpClient (см. shared/http) — то есть базовый адрес,
 * заголовки и обработка ошибок берутся оттуда.
 * ============================================================================
 */

import { RampEntity } from "./ramp.entity";
import { IHttpClient } from "../../shared/http/http-client";
import { Result } from "../../shared/result/result";

/**
 * Путь эндпоинта для создания съезда. Вынесен в константу.
 * ПРИМЕЧАНИЕ: уточни у бэкенда реальный путь и при необходимости поправь.
 */
export const RAMP_ENDPOINT = "/ramps";

/**
 * Ответ бэкенда после создания записи.
 * Обычно сервер возвращает созданный объект с присвоенным id.
 * Если у вас другой формат ответа — поправь этот тип.
 */
export interface RampCreatedResponse {
  id: number;
}

export class RampRepository {
  constructor(private readonly http: IHttpClient) {}

  /**
   * Отправить съезд на бэкенд методом POST.
   * @param entity готовая (распарсенная) entity
   * @returns Result с ответом сервера (id созданной записи) или ошибкой
   */
  async create(entity: RampEntity): Promise<Result<RampCreatedResponse>> {
    return this.http.post<RampCreatedResponse>(RAMP_ENDPOINT, entity);
  }
}
