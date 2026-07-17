/**
 * ============================================================================
 *  HttpClient — единая точка для всех сетевых запросов
 * ============================================================================
 *
 * ЗАЧЕМ ЭТО НУЖНО:
 * Чтобы НЕ дублировать в каждой фиче одно и то же: базовый URL, заголовки
 * (Content-Type: application/json), проверку статуса ответа, разбор JSON,
 * обработку ошибок сети. Все репозитории (ramp.repository, crossing.repository,
 * road.repository...) пользуются ОДНИМ этим клиентом.
 *
 * Если завтра поменяется базовый адрес API, добавится авторизация (токен)
 * или логирование запросов — правишь в ОДНОМ месте здесь, а не в каждой фиче.
 * ============================================================================
 */

import { Result, ok, err } from "../result/result";

/**
 * IHttpClient — "договор" клиента: любой клиент обязан уметь get и post.
 *
 * ЗАЧЕМ ЭТО НУЖНО:
 * Фичи и репозитории зависят от ЭТОГО интерфейса, а не от конкретного класса.
 * Значит, на его место можно подставить что угодно, что соблюдает договор:
 *   - настоящий HttpClient (ходит в сеть),
 *   - MockHttpClient (отдаёт заглушки),
 *   - в тестах — ещё какой-нибудь фейк.
 * Код фич при этом не меняется. Это и есть "зависеть от интерфейса, а не от
 * реализации" — приём, который защищает от спагетти.
 */
export interface IHttpClient {
  get<TResponse>(path: string): Promise<Result<TResponse>>;
  post<TResponse>(path: string, body: unknown): Promise<Result<TResponse>>;
}

/** Настройки клиента — задаются один раз при создании. */
export interface HttpClientConfig {
  /** Базовый адрес API, например "https://api.example.com" или "/api". */
  baseUrl: string;
  /** Доп. заголовки ко всем запросам (например, токен авторизации). Опционально. */
  defaultHeaders?: Record<string, string>;
}

export class HttpClient implements IHttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig) {
    // Убираем хвостовой слэш, чтобы не получить "//" при склейке путей
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.defaultHeaders = config.defaultHeaders ?? {};
  }

  /**
   * POST-запрос с JSON-телом. Используется для отправки entity на бэкенд.
   *
   * @param path  путь относительно baseUrl, например "/ramps"
   * @param body  объект, который будет сериализован в JSON
   * @returns     Result с распарсенным ответом (TResponse) или текстом ошибки
   */
  async post<TResponse>(path: string, body: unknown): Promise<Result<TResponse>> {
    return this.request<TResponse>("POST", path, body);
  }

  /**
   * GET-запрос. Используется для загрузки справочников (варианты curb_height и т.п.).
   */
  async get<TResponse>(path: string): Promise<Result<TResponse>> {
    return this.request<TResponse>("GET", path);
  }

  /**
   * Внутренний универсальный метод. Остальные (post/get) — обёртки над ним.
   * Здесь вся общая логика: сборка URL, заголовки, обработка ошибок.
   */
  private async request<TResponse>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<Result<TResponse>> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : "/" + path}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...this.defaultHeaders,
        },
        // тело отправляем только если оно есть (у GET его нет)
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      // Сервер ответил, но со статусом ошибки (4xx/5xx)
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return err(
          `Сервер вернул ошибку ${response.status} (${response.statusText}). ${text}`.trim(),
        );
      }

      // Некоторые ответы пустые (например, 204 No Content) — отдаём undefined
      if (response.status === 204) {
        return ok(undefined as TResponse);
      }

      const data = (await response.json()) as TResponse;
      return ok(data);
    } catch (e) {
      // Сюда попадаем при проблемах сети (нет интернета, CORS, таймаут)
      const message = e instanceof Error ? e.message : String(e);
      return err(`Ошибка сети: ${message}`);
    }
  }
}
