/**
 * ============================================================================
 *  DictionaryService — работа со справочниками (FK-таблицами)
 * ============================================================================
 *
 * ЗАЧЕМ ЭТО НУЖНО:
 * Многие поля — это ссылки на справочники (foreign key). Например, у съезда
 * (ramp) высота бордюра curb_height ссылается на таблицу вариантов:
 *     id=1 → "<2cm", id=2 → "2-4cm", id=3 → "4-5cm", id=4 → ">5cm"
 *
 * На бэкенде в entity нужно класть ЧИСЛОВОЙ id (например, 2), а пользователь
 * в форме выбирает ТЕКСТ ("2-4cm"). Значит, нужно уметь:
 *   1) загрузить список вариантов с бэка (GET) — чтобы показать их в выпадашке;
 *   2) превратить выбранный текст обратно в id — для отправки на бэк.
 *
 * Этот сервис делает обе вещи и КЭШИРУЕТ загруженный справочник, чтобы не
 * дёргать сеть на каждый чих. Один экземпляр сервиса = один справочник.
 *
 * Справочники curb_height, road_surface, entrance_type и т.д. — все имеют
 * одинаковую форму { id, variant }, поэтому один класс обслуживает их все.
 * ============================================================================
 */

import { IHttpClient } from "../http/http-client";
import { Result, ok, err } from "../result/result";

/**
 * Одна запись справочника, как её отдаёт бэкенд.
 * Форма совпадает с таблицами из БД: { id, variant }.
 */
export interface DictionaryItem {
  id: number;
  variant: string;
}

export class DictionaryService {
  /**
   * Кэш загруженных вариантов. null = ещё не загружали.
   * После первой загрузки лежит здесь и переиспользуется.
   */
  private items: DictionaryItem[] | null = null;

  /**
   * @param http     общий HTTP-клиент (см. shared/http)
   * @param endpoint путь к справочнику на бэке, например "/dictionaries/curb-height"
   */
  constructor(
    private readonly http: IHttpClient,
    private readonly endpoint: string,
  ) {}

  /**
   * Загрузить варианты с бэка (или вернуть из кэша, если уже грузили).
   * Вызывается, например, когда нужно показать выпадающий список в форме.
   */
  async load(): Promise<Result<DictionaryItem[]>> {
    if (this.items !== null) {
      return ok(this.items); // уже в кэше — сеть не трогаем
    }

    const result = await this.http.get<DictionaryItem[]>(this.endpoint);
    if (!result.ok) {
      return result; // пробрасываем ошибку загрузки наверх
    }

    this.items = result.value;
    return ok(this.items);
  }

  /**
   * Превратить выбранный пользователем ТЕКСТ варианта в числовой id.
   * Это ключевой метод для парсера: форма даёт строку "2-4cm", а на бэк
   * нужно отправить id=2.
   *
   * ВАЖНО: справочник должен быть предварительно загружен через load().
   * Если не загружен — вернётся ошибка (а не молчаливый неверный id).
   */
  variantToId(variant: string): Result<number> {
    if (this.items === null) {
      return err(
        `Справочник (${this.endpoint}) не загружен. Сначала вызовите load().`,
      );
    }

    const needle = variant.trim();
    const found = this.items.find((it) => it.variant === needle);
    if (!found) {
      return err(`Неизвестный вариант «${variant}» для справочника ${this.endpoint}`);
    }

    return ok(found.id);
  }

  /**
   * Обратное преобразование: по id получить текст варианта.
   * Удобно при показе уже сохранённых данных (история правок на скринах).
   */
  idToVariant(id: number): Result<string> {
    if (this.items === null) {
      return err(`Справочник (${this.endpoint}) не загружен.`);
    }
    const found = this.items.find((it) => it.id === id);
    if (!found) {
      return err(`Неизвестный id=${id} для справочника ${this.endpoint}`);
    }
    return ok(found.variant);
  }
}
