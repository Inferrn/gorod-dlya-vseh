/**
 * ============================================================================
 *  app.ts — главная точка сборки приложения
 * ============================================================================
 *
 * Здесь встречаются два экрана. Это ЕДИНСТВЕННОЕ место, которое знает про оба
 * сразу — карта и форма по отдельности друг о друге не знают. Тут мы их
 * связываем:
 *
 *   карта (клик → "Добавить" с координатами)
 *        → открываем панель формы ввода для этой точки
 *        → по "Сохранить" собираем данные (отправка пока отключена)
 *
 * Также здесь создаётся клиент (пока MOCK) и все три фичи — и передаются формам.
 * Замена mock на реальный бэк — в ОДНОЙ строке ниже.
 * ============================================================================
 */

import { HttpClient } from "../shared/http/http-client";
import { GeoPoint } from "../shared/geo/geo-point";
import { createRampFeature, RampFormInput } from "../features/ramp";
import { createCrossingFeature, CrossingFormInput } from "../features/crossing";
import { createRoadFeature, RoadFormInput } from "../features/road";

import { MapScreen, PointCoords } from "./map/map-screen";
import { AttributeFormShell, FormSection } from "./attribute-form/attribute-form-shell";
import { AttributeForm } from "./attribute-form/attribute-form.contract";
import { RampForm } from "./attribute-form/ramp-form";
import { CrossingForm } from "./attribute-form/crossing-form";
import { RoadForm } from "./attribute-form/road-form";

// --- Клиент. Настоящий бэкенд (Spring Boot, см. репозиторий gorod-dlya-vseh_back).
// Для локальной разработки со своим бэком поменяй адрес на http://localhost:8080/api.
const API_BASE_URL = "http://90.156.128.216/api";
const http = new HttpClient({ baseUrl: API_BASE_URL });

// --- Три фичи (дают справочники + submit на будущее). -----------------------
const ramp = createRampFeature(http);
const crossing = createCrossingFeature(http);
const road = createRoadFeature(http);

// --- Ссылки на элементы страницы. -------------------------------------------
const mapEl = document.getElementById("map");
const panelEl = document.getElementById("form-panel");
const formContainer = document.getElementById("form-container");
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement | null;
const debug = document.getElementById("debug");
const coordsLabel = document.getElementById("panel-coords");
const closeBtn = document.getElementById("panel-close");

if (!mapEl || !panelEl || !formContainer || !saveBtn || !debug || !coordsLabel || !closeBtn) {
  console.error("Не найдены нужные элементы страницы");
} else {
  // Координаты точки, для которой сейчас открыта форма.
  let currentPoint: PointCoords | null = null;

  // Точка, для которой построен текущий каркас форм. Пока пользователь
  // открывает ту же точку — каркас переиспользуется, и случайное закрытие
  // панели крестиком не теряет введённое. null = каркас устарел (данные
  // отправлены или точки ещё не было) и будет построен заново.
  let shellPoint: PointCoords | null = null;

  // Каркас формы создаём один раз; при открытии панели он строит секции заново.
  let shell: AttributeFormShell | null = null;

  // Описание трёх секций (тот же список, что был в форме).
  const sections: FormSection[] = [
    {
      key: "ramp",
      title: "Съезд",
      createForm: (c) => new RampForm(c, ramp.curbHeightDict) as AttributeForm<unknown>,
    },
    {
      key: "crossing",
      title: "Переход",
      createForm: (c) => new CrossingForm(c, crossing.dictionaries) as AttributeForm<unknown>,
    },
    {
      key: "road",
      title: "Дорога",
      createForm: (c) => new RoadForm(c, road.surfaceQualityDict) as AttributeForm<unknown>,
    },
  ];

  // По ключу секции — какую фичу звать. Формы отдают input как unknown,
  // поэтому здесь единственное место с приведением типа (по ключу оно безопасно:
  // ключ и форма создаются парой в sections ниже).
  const submitByKey: Record<string, (input: unknown, point: GeoPoint) => Promise<{ ok: boolean; value?: { id: number }; error?: string }>> = {
    ramp: (input, point) => ramp.submit(input as RampFormInput, point),
    crossing: (input, point) => crossing.submit(input as CrossingFormInput, point),
    road: (input, point) => road.submit(input as RoadFormInput, point),
  };

  // Показать сообщение пользователю и ДОскроллить до него: блок сообщений
  // живёт в самом низу панели, и в длинной форме без прокрутки его не видно.
  const showMessage = (text: string) => {
    debug.style.display = "block";
    debug.textContent = text;
    debug.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // Что делать по "Сохранить": парсинг + отправка на бэкенд через фичу.
  const handleSave = async (key: FormSection["key"], input: unknown) => {
    if (!currentPoint) {
      showMessage("Сначала выберите точку на карте.");
      return;
    }
    const submit = submitByKey[key];
    if (!submit) {
      showMessage(`Неизвестный тип объекта: ${key}`);
      return;
    }

    const point: GeoPoint = {
      latitude: currentPoint.lat,
      longitude: currentPoint.lng,
    };

    // Пока запрос в полёте, кнопка выключена: на медленной сети повторные
    // нажатия успели бы создать в базе дубли объекта.
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Отправляем…";
    }
    showMessage("Отправляем…");

    try {
      const result = await submit(input, point);

      if (result.ok && result.value) {
        showMessage(
          `✓ Сохранено! id записи: ${result.value.id}\n` +
          `Можно внести ещё один объект для этой точки или закрыть панель.`,
        );
        // Отправленную секцию очищаем и сворачиваем — повторное "Сохранить"
        // по ней невозможно (дублей не будет). Панель НЕ закрываем: данные
        // других секций на месте, волонтёр сам решает, что дальше.
        shell?.resetSection(key);
      } else {
        showMessage(`✗ Не удалось сохранить.\n${result.error ?? "Неизвестная ошибка"}`);
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Сохранить";
      }
    }
  };

  // Открыть панель формы для выбранной точки.
  const openFormForPoint = (coords: PointCoords) => {
    currentPoint = coords;
    coordsLabel.textContent =
      `Координаты: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;

    // Каркас строим заново только для НОВОЙ точки. Если пользователь закрыл
    // панель крестиком и снова нажал "Добавить" на той же точке — показываем
    // прежний каркас со всем, что он уже успел ввести.
    const samePoint =
      shell !== null &&
      shellPoint !== null &&
      shellPoint.lat === coords.lat &&
      shellPoint.lng === coords.lng;

    if (!samePoint) {
      formContainer.innerHTML = "";
      shell = new AttributeFormShell(formContainer, sections, handleSave);
      shell.render();
      shellPoint = coords;
    }

    debug.style.display = "none";
    panelEl.style.display = "block";
  };

  // --- Карта. По "Добавить" открываем форму для точки. ----------------------
  const mapScreen = new MapScreen(mapEl, openFormForPoint);
  mapScreen.render();

  // --- Кнопки панели. -------------------------------------------------------
  saveBtn.addEventListener("click", () => {
    if (!shell || !shell.hasActiveSection()) {
      debug.style.display = "block";
      debug.textContent = "Сначала выберите тип объекта и заполните форму.";
      return;
    }
    shell.save();
  });

  closeBtn.addEventListener("click", () => {
    panelEl.style.display = "none";
  });
}
