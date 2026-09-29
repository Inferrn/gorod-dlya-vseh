/**
 * ============================================================================
 *  MapScreen — экран карты (Leaflet)
 * ============================================================================
 *
 * ОТВЕТСТВЕННОСТЬ:
 *   ДЕЛАЕТ:
 *     - показывает карту (тайлы задаются в TILE_SOURCE, см. ниже);
 *     - по клику ставит маркер в выбранную точку;
 *     - показывает карточку снизу с координатами и кнопкой "Добавить".
 *   НЕ ДЕЛАЕТ:
 *     - не открывает форму сама и не знает про неё;
 *     - вместо этого зовёт колбэк onAddPoint с координатами.
 *
 * Почему так: карта не должна быть склеена с формой напрямую — иначе получится
 * спагетти. Карта просто сообщает "пользователь выбрал точку и нажал Добавить,
 * вот координаты". Что делать дальше (открыть форму ввода) — решает тот, кто
 * связывает экраны между собой (см. app.ts). Это тот же приём разделения, что
 * и onSave у формы.
 *
 * ПРИМЕЧАНИЕ про адрес: в макете под координатами есть адрес ("Московское
 * шоссе, 143а"). Определение адреса по координатам (обратное геокодирование) —
 * отдельная задача (нужен геокодер). Пока показываем только координаты, а место
 * под адрес помечено TODO, чтобы не тянуть лишнюю зависимость на этом этапе.
 * ============================================================================
 */

import L from "leaflet";

// Стили и картинки Leaflet тянем из npm-пакета, а не с CDN: приложение
// собирается в APK и не должно зависеть от внешних ссылок в <head>.
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Дефолтная иконка маркера: при сборке бандлером Leaflet сам не находит свои
// картинки (он ищет их относительно CSS-файла) — задаём пути явно.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * ----------------------------------------------------------------------------
 *  ИСТОЧНИК ТАЙЛОВ (картинок карты)
 * ----------------------------------------------------------------------------
 * Меняется в ОДНОЙ строке — см. TILE_SOURCE под этим объектом.
 *
 * ПОЧЕМУ НЕ ОРИГИНАЛЬНЫЙ OSM: серверы tile.openstreetmap.org из России
 * отдают ошибку 451 (заблокировано). Нужен доступный источник.
 *
 * ПРО ФОРМАТЫ (частая причина поломки):
 *   - Порядок координат в адресе. Обычно {z}/{x}/{y}, но у Esri — {z}/{y}/{x}.
 *     Перепутаешь — карта покажет не те куски или ничего.
 *   - tms: true — сервер считает ось Y снизу вверх (формат TMS).
 *     tms: false — обычные XYZ-тайлы, как ждёт Leaflet по умолчанию.
 *     Перепутаешь — карта будет СЕРОЙ.
 *
 * КАК ПРОВЕРИТЬ ИСТОЧНИК ЗА 10 СЕКУНД (не запуская проект):
 * вставь в браузер ссылку на один тайл (пример — центр Самары, зум 15):
 *   немецкий:  https://tile.openstreetmap.de/15/19845/10286.png
 *   Esri:      https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/15/10286/19845
 * Открылся кусочек карты → источник живой.
 * Ошибка 451/403 → заблокирован. Пришла страница вместо картинки → браузер
 * заблокирует это как CORB, тайлы не появятся.
 */
const TILE_SOURCES = {
  /**
   * Немецкое зеркало OSM. Проверено: открывается из России без VPN.
   * Обычный XYZ-формат, привычный вид карты.
   */
  osmDe: {
    url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
    maxZoom: 18,
    tms: false,
    attribution: "© OpenStreetMap contributors",
  },

  /**
   * Esri World Street Map. Проверено: открывается из России без VPN.
   * ВНИМАНИЕ: порядок координат {z}/{y}/{x} — не как у остальных!
   * Использовать при проблемах с основным источником.
   */
  esri: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 19,
    tms: false,
    attribution: "© Esri, © OpenStreetMap contributors",
  },

  /**
   * NextGIS (TMS-формат). НЕ РАБОТАЕТ: отдаёт не PNG, браузер блокирует
   * ответы как CORB. Оставлен для истории, чтобы не наступить снова.
   */
  nextgis: {
    url: "https://tile.nextgis.com/tms/1.0.0/osm/{z}/{x}/{y}.png",
    maxZoom: 19,
    tms: true,
    attribution: "© OpenStreetMap contributors, © NextGIS",
  },

  /** Оригинальный OSM. НЕ РАБОТАЕТ из России: ошибка 451. Для справки. */
  osmOriginal: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    tms: false,
    attribution: "© OpenStreetMap contributors",
  },
} as const;

/**
 * АКТИВНЫЙ ИСТОЧНИК. Меняй только эту строку.
 * Работающие варианты: TILE_SOURCES.osmDe, TILE_SOURCES.esri
 */
const TILE_SOURCE = TILE_SOURCES.osmDe;

/** Координаты выбранной на карте точки. */
export interface PointCoords {
  lat: number;
  lng: number;
}

export class MapScreen {
  private map!: L.Map;
  private marker: L.Marker | null = null;
  private selected: PointCoords | null = null;

  // Элементы нижней карточки (создаём один раз, показываем/прячем).
  private card!: HTMLElement;
  private coordsEl!: HTMLElement;

  /**
   * @param container    DOM-элемент, в котором будет карта (должен иметь высоту!)
   * @param onAddPoint   колбэк: вызывается при нажатии "Добавить" с координатами
   * @param initialView  начальный центр карты и зум (по умолчанию — Самара)
   */
  constructor(
    private readonly container: HTMLElement,
    private readonly onAddPoint: (coords: PointCoords) => void,
    private readonly initialView: { center: [number, number]; zoom: number } = {
      center: [53.195, 50.1], // Самара, как в макетах
      zoom: 15,
    },
  ) {}

  /** Построить карту и карточку. */
  render(): void {
    // --- Карта ---------------------------------------------------------------
    this.map = L.map(this.container, {
      attributionControl: false,  // полностью убрать блок внизу
    }).setView(this.initialView.center, this.initialView.zoom);

    // Тайлы карты. Источник вынесен в TILE_SOURCE (см. ниже, вверху файла),
    // чтобы менять его в одном месте.
    //
    // ВАЖНО про tms: у TMS-серверов ось Y считается снизу вверх, а Leaflet по
    // умолчанию ждёт отсчёт сверху вниз. Если не выставить tms: true для
    // TMS-источника, запросы уйдут не за теми картинками — и карта будет серой.
    L.tileLayer(TILE_SOURCE.url, {
        maxZoom: 20,                        // до какого зума пускаем пользователя
        maxNativeZoom: TILE_SOURCE.maxZoom, // до какого реально есть тайлы
        attribution: TILE_SOURCE.attribution,
        tms: TILE_SOURCE.tms,
    }).addTo(this.map);

    // По клику по карте — выбираем точку.
    this.map.on("click", (e: L.LeafletMouseEvent) => {
      this.selectPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    // --- Нижняя карточка -----------------------------------------------------
    this.buildCard();

    // --- Кнопка "Я здесь" (геолокация) ---------------------------------------
    this.buildLocateButton();

    // --- Автоцентрирование при запуске ---------------------------------------
    // Тихо пробуем определить позицию и показать карту там, где стоит волонтёр
    // (точку НЕ выбираем — только центрируем). Не вышло (нет разрешения, нет
    // GPS, веб без HTTPS) — молча остаёмся на стартовом центре.
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => this.map.setView([pos.coords.latitude, pos.coords.longitude], 16),
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
      );
    }
  }

  /**
   * Кнопка "Я здесь": определяет позицию волонтёра по GPS, центрирует карту
   * и сразу выбирает эту точку (основной сценарий в поле: стою у объекта —
   * жму кнопку — заполняю форму, не выцеливая точку пальцем).
   */
  private buildLocateButton(): void {
    const btn = document.createElement("button");
    btn.className = "locate-btn";
    btn.type = "button";
    btn.title = "Моё местоположение";
    btn.textContent = "📍 Я здесь";

    btn.addEventListener("click", () => {
      if (!("geolocation" in navigator)) {
        alert("Геолокация не поддерживается на этом устройстве.");
        return;
      }

      btn.disabled = true;
      btn.textContent = "Определяем…";

      const restore = () => {
        btn.disabled = false;
        btn.textContent = "📍 Я здесь";
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          restore();
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          this.map.setView([coords.lat, coords.lng], 17);
          this.selectPoint(coords);
        },
        (e) => {
          restore();
          // Самая частая причина — не дали разрешение на доступ к геопозиции.
          const reason =
            e.code === e.PERMISSION_DENIED
              ? "Нет разрешения на доступ к геопозиции. Разрешите доступ в настройках."
              : "Не удалось определить местоположение. Проверьте, включён ли GPS.";
          alert(reason);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    });

    this.container.parentElement?.appendChild(btn);
  }

  /** Поставить/переставить маркер и показать карточку с координатами. */
  private selectPoint(coords: PointCoords): void {
    this.selected = coords;

    // Маркер: создаём при первом клике, дальше просто двигаем.
    if (this.marker) {
      this.marker.setLatLng([coords.lat, coords.lng]);
    } else {
      this.marker = L.marker([coords.lat, coords.lng]).addTo(this.map);
    }

    // Обновляем текст координат (округляем до 6 знаков — как в макете).
    this.coordsEl.textContent =
      `Координаты: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;

    // Показываем карточку.
    this.card.style.display = "block";
  }

  /** Создать нижнюю карточку с координатами и кнопкой "Добавить". */
  private buildCard(): void {
    this.card = document.createElement("div");
    this.card.className = "map-card";
    this.card.style.display = "none"; // скрыта, пока не выбрана точка

    // TODO: сюда добавить адрес, когда подключим обратное геокодирование.
    const address = document.createElement("div");
    address.className = "map-card-address";
    address.textContent = "Выбранная точка";

    this.coordsEl = document.createElement("div");
    this.coordsEl.className = "map-card-coords";

    const addBtn = document.createElement("button");
    addBtn.className = "map-card-add";
    addBtn.textContent = "Добавить";
    addBtn.addEventListener("click", () => {
      if (this.selected) {
        // Сообщаем наружу: выбрали точку, хотим добавить данные.
        this.onAddPoint(this.selected);
      }
    });

    this.card.appendChild(address);
    this.card.appendChild(this.coordsEl);
    this.card.appendChild(addBtn);

    // Карточку кладём поверх карты (в тот же контейнер-родитель).
    this.container.parentElement?.appendChild(this.card);
  }
}