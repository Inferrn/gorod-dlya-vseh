/**
 * ============================================================================
 *  map-view.ts — экран карты (кадр 8)
 * ============================================================================
 *
 *  ОТВЕТСТВЕННОСТЬ:
 *    ДЕЛАЕТ: рисует карту (Leaflet), верхний поиск, кнопки зума и «моё место»,
 *            нижний лист с адресом и тремя действиями.
 *    НЕ ДЕЛАЕТ: не открывает форму и не знает про неё — только зовёт колбэк
 *            onAdd. Кто и что покажет дальше, решает screens-app.ts.
 *
 *  АДРЕС. В макете под координатами есть адрес («Московское шоссе, 143а»).
 *  Обратное геокодирование — отдельная задача и отдельный ключ API, поэтому
 *  сейчас адрес приходит из данных точки (у мока он задан), а для точек,
 *  выбранных на карте, показываются координаты. Место под адрес помечено TODO.
 * ============================================================================
 */

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { icon } from "./icons";
import { el, formatCoords, must } from "./dom";

/** Что известно про выбранную точку. */
export interface Place {
  /** Подпись-чип: «ВЫБРАННОЕ МЕСТО», «УЧАСТОК ПУТИ», «СЪЕЗДЫ У ПЕРЕХОДА». */
  kind: string;
  title: string;
  /** «Самара, 443250» */
  city: string;
  lat: number;
  lng: number;
}

/**
 * Источник тайлов. Тот же, что в старом экране карты (map/map-screen.ts):
 * tile.openstreetmap.de открывается из России, оригинальный OSM — нет (451).
 */
const TILE_URL = "https://tile.openstreetmap.de/{z}/{x}/{y}.png";

export class MapView {
  readonly root: HTMLElement;

  private map!: L.Map;
  private marker: L.Marker | null = null;
  private place: Place | null = null;

  private sheet!: HTMLElement;
  private sheetKind!: HTMLElement;
  private sheetTitle!: HTMLElement;
  private sheetCity!: HTMLElement;
  private sheetCoords!: HTMLElement;

  /**
   * @param onAdd    «Добавить» в листе — перейти к форме
   * @param onToast  короткое сообщение внизу экрана
   */
  constructor(
    private readonly onAdd: (place: Place) => void,
    private readonly onToast: (text: string) => void,
  ) {
    this.root = el("section", "screen screen--map");
    this.root.innerHTML = `
      <div class="map-view">
        <div class="map-canvas" id="screens-map"></div>

        <label class="map-search">
          ${icon("search", 22)}
          <input class="map-search__input" type="search"
                 placeholder="Поиск мест" aria-label="Поиск мест" />
          ${icon("mic", 22).replace('class="', 'class="map-search__mic ')}
        </label>

        <span class="map-city">Самара</span>

        <div class="map-controls">
          <div class="map-zoom">
            <button class="map-zoom__btn" type="button" data-zoom="in" aria-label="Приблизить">${icon("plus", 22)}</button>
            <button class="map-zoom__btn" type="button" data-zoom="out" aria-label="Отдалить">${icon("minus", 22)}</button>
          </div>
          <button class="map-locate" type="button" data-locate aria-label="Моё местоположение">${icon("locate", 22)}</button>
        </div>
      </div>

      <div class="sheet" hidden>
        <div class="sheet__handle"></div>
        <div class="sheet__top">
          <span class="chip" data-sheet-kind></span>
          <button class="icon-btn" type="button" data-sheet-close aria-label="Закрыть">${icon("close", 20)}</button>
        </div>
        <h1 class="sheet__title" data-sheet-title></h1>
        <p class="sheet__text" data-sheet-city></p>
        <div class="sheet__coords" data-sheet-coords></div>
        <div class="sheet__actions">
          <button class="sheet__action" type="button" data-about>${icon("info", 22)} О месте</button>
          <button class="sheet__action" type="button" data-add>${icon("plus", 22)} Добавить</button>
          <button class="sheet__action sheet__action--accent" type="button" data-route>${icon("route", 22)} Маршрут</button>
        </div>
      </div>
    `;

    this.sheet = must(this.root, ".sheet");
    this.sheetKind = must(this.root, "[data-sheet-kind]");
    this.sheetTitle = must(this.root, "[data-sheet-title]");
    this.sheetCity = must(this.root, "[data-sheet-city]");
    this.sheetCoords = must(this.root, "[data-sheet-coords]");
  }

  /** Создать карту. Вызывается, когда экран уже вставлен в документ. */
  mount(): void {
    this.map = L.map(must<HTMLElement>(this.root, "#screens-map"), {
      attributionControl: false,
      zoomControl: false,
    }).setView([53.196659, 50.17452], 16); // Самара, как в макете

    L.tileLayer(TILE_URL, { maxZoom: 20, maxNativeZoom: 18 }).addTo(this.map);

    this.map.on("click", (event: L.LeafletMouseEvent) => {
      this.setPlace({
        kind: "ВЫБРАННОЕ МЕСТО",
        // TODO: обратное геокодирование — сейчас адрес неизвестен.
        title: "Выбранная точка",
        city: "Самара",
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
      this.onToast("Точка выбрана");
    });

    this.bindControls();
  }

  /**
   * Пересчитать размеры карты. Нужно после показа экрана: Leaflet запоминает
   * размеры контейнера при создании, и если экран был скрыт — тайлы встанут
   * криво (половина карты серые квадраты).
   */
  invalidate(): void {
    this.map?.invalidateSize();
  }

  /** Показать точку в листе (и поставить маркер). */
  setPlace(place: Place): void {
    this.place = place;

    this.sheetKind.textContent = place.kind;
    this.sheetTitle.textContent = place.title;
    this.sheetCity.textContent = place.city;
    this.sheetCoords.innerHTML = `
      ${formatCoords(place.lat, place.lng)}
      <button type="button" data-copy aria-label="Скопировать координаты">${icon("copy", 22)}</button>
    `;

    must(this.sheetCoords, "[data-copy]").addEventListener("click", () => {
      void navigator.clipboard?.writeText(formatCoords(place.lat, place.lng));
      this.onToast("Координаты скопированы");
    });

    if (this.marker) {
      this.marker.setLatLng([place.lat, place.lng]);
    } else {
      this.marker = L.marker([place.lat, place.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="map-pin">${icon("pin", 20)}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
      }).addTo(this.map);
    }

    this.map.setView([place.lat, place.lng], Math.max(this.map.getZoom(), 16));
    this.sheet.hidden = false;
  }

  private bindControls(): void {
    must(this.root, "[data-zoom='in']").addEventListener("click", () => this.map.zoomIn());
    must(this.root, "[data-zoom='out']").addEventListener("click", () => this.map.zoomOut());

    must(this.root, "[data-locate]").addEventListener("click", () => {
      if (!("geolocation" in navigator)) {
        this.onToast("Геолокация не поддерживается");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.setPlace({
            kind: "ВЫБРАННОЕ МЕСТО",
            title: "Моё местоположение",
            city: "Самара",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => this.onToast("Не удалось определить местоположение"),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });

    must(this.root, "[data-add]").addEventListener("click", () => {
      if (this.place) this.onAdd(this.place);
    });

    must(this.root, "[data-about]").addEventListener("click", () =>
      this.onToast("Информация о месте появится позже"),
    );

    must(this.root, "[data-route]").addEventListener("click", () =>
      this.onToast("Построение маршрута появится позже"),
    );

    must(this.root, "[data-sheet-close]").addEventListener("click", () => {
      this.sheet.hidden = true;
      this.marker?.remove();
      this.marker = null;
      this.place = null;
    });
  }
}
