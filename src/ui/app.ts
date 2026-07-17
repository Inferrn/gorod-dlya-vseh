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

import { MockHttpClient } from "../mock/mock-http-client";
import { createRampFeature } from "../features/ramp";
import { createCrossingFeature } from "../features/crossing";
import { createRoadFeature } from "../features/road";

import { MapScreen, PointCoords } from "./map/map-screen";
import { AttributeFormShell, FormSection } from "./attribute-form/attribute-form-shell";
import { AttributeForm } from "./attribute-form/attribute-form.contract";
import { RampForm } from "./attribute-form/ramp-form";
import { CrossingForm } from "./attribute-form/crossing-form";
import { RoadForm } from "./attribute-form/road-form";

// --- Клиент. Пока mock. Для реального бэка: new HttpClient({ baseUrl }). ------
const http = new MockHttpClient();

// --- Три фичи (дают справочники + submit на будущее). -----------------------
const ramp = createRampFeature(http);
const crossing = createCrossingFeature(http);
const road = createRoadFeature(http);

// --- Ссылки на элементы страницы. -------------------------------------------
const mapEl = document.getElementById("map");
const panelEl = document.getElementById("form-panel");
const formContainer = document.getElementById("form-container");
const saveBtn = document.getElementById("save-btn");
const debug = document.getElementById("debug");
const coordsLabel = document.getElementById("panel-coords");
const closeBtn = document.getElementById("panel-close");

if (!mapEl || !panelEl || !formContainer || !saveBtn || !debug || !coordsLabel || !closeBtn) {
  console.error("Не найдены нужные элементы страницы");
} else {
  // Координаты точки, для которой сейчас открыта форма.
  let currentPoint: PointCoords | null = null;

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

  // Что делать по "Сохранить" (отправка пока отключена — только показываем).
  const handleSave = (key: FormSection["key"], input: unknown) => {
    // ─────────────────────────────────────────────────────────────────────
    //  ТОЧКА ПОДКЛЮЧЕНИЯ ОТПРАВКИ (пока отключена по заданию).
    //  Здесь по ключу выбирается фича и зовётся feature.submit(input),
    //  а координаты currentPoint добавляются к данным перед отправкой.
    // ─────────────────────────────────────────────────────────────────────
    debug.style.display = "block";
    debug.textContent =
      `Точка: ${currentPoint?.lat.toFixed(6)}, ${currentPoint?.lng.toFixed(6)}\n` +
      `Тип объекта: ${key}\n\nСобранные данные:\n\n` +
      JSON.stringify(input, null, 2) +
      "\n\n↑ данные НЕ отправляются (этап проекта), только показываются.";
  };

  // Открыть панель формы для выбранной точки.
  const openFormForPoint = (coords: PointCoords) => {
    currentPoint = coords;
    coordsLabel.textContent =
      `Координаты: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;

    // Заново строим каркас (чистая форма под новую точку).
    formContainer.innerHTML = "";
    debug.style.display = "none";
    shell = new AttributeFormShell(formContainer, sections, handleSave);
    shell.render();

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
