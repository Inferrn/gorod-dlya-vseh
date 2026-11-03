/**
 * ============================================================================
 *  app.ts — главная точка сборки приложения
 * ============================================================================
 *
 * Здесь встречаются все экраны. Это ЕДИНСТВЕННОЕ место, которое знает про них
 * сразу — сами экраны друг о друге не знают:
 *
 *   рейтинг (экраны 1–3)  — таблица / пьедестал / список участников;
 *   карта                 — старый экран сбора данных (точка → форма);
 *   подтверждение выхода  — оверлей поверх рейтинга (экран 4).
 *
 * Что делает app.ts:
 *   1. Создаёт экраны и связывает их переходы (ScreenManager).
 *   2. Держит адрес (#/rating/podium, #/map, #/logout), чтобы на любой экран
 *      можно было кинуть ссылку и обновить страницу.
 *   3. Собирает карту + формы (этот код переехал сюда без изменений логики).
 *
 * Карта создаётся ЛЕНИВО — при первом показе экрана карты. Так старт
 * приложения не зависит от Leaflet, тайлов и геолокации.
 * ============================================================================
 */

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/map.css";
import "./styles/rating.css";
import "./styles/logout.css";
import "./styles/motion.css";

import { HttpClient } from "../shared/http/http-client";
import { GeoPoint } from "../shared/geo/geo-point";
import { createRampFeature, RampFormInput } from "../features/ramp";
import { createCrossingFeature, CrossingFormInput } from "../features/crossing";
import { createRoadFeature, RoadFormInput } from "../features/road";
import { RATING_MOCK } from "../features/rating";

import { MapScreen, PointCoords } from "./map/map-screen";
import { AttributeFormShell, FormSection } from "./attribute-form/attribute-form-shell";
import { AttributeForm } from "./attribute-form/attribute-form.contract";
import { RampForm } from "./attribute-form/ramp-form";
import { CrossingForm } from "./attribute-form/crossing-form";
import { RoadForm } from "./attribute-form/road-form";

import { RatingScreen, RatingViewKey } from "./rating/rating-screen";
import { ScreenManager } from "./screens/screen-manager";
import { LogoutScreen } from "./screens/logout-screen";
import { showToast } from "./components/toast";
import { need } from "./shared/dom";
import { wait } from "./shared/motion";

// --- Клиент. Настоящий бэкенд (Spring Boot, см. репозиторий gorod-dlya-vseh_back).
// Адрес берётся из VITE_API_BASE_URL (файл .env в корне, см. .env.example).
// Если переменная не задана — идём на локальный бэкенд.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const http = new HttpClient({ baseUrl: API_BASE_URL });

// --- Три фичи (дают справочники + submit). ----------------------------------
const ramp = createRampFeature(http);
const crossing = createCrossingFeature(http);
const road = createRoadFeature(http);

// --- Элементы страницы. ------------------------------------------------
const ratingScreenEl = need('[data-screen="rating"]');
const mapScreenEl = need('[data-screen="map"]');

const mapEl = need("#map");
const panelEl = need("#form-panel");
const formContainer = need("#form-container");
const saveBtn = need<HTMLButtonElement>("#save-btn");
const debugEl = need("#debug");
const coordsLabel = need("#panel-coords");
const closeBtn = need("#panel-close");
const mapRatingBtn = need<HTMLButtonElement>("#map-rating-btn");
const navButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".nav-btn"));

// --- Экраны 1–3: рейтинг. ---------------------------------------------------
const rating = new RatingScreen(RATING_MOCK, {
  onViewChange: (view) => {
    // Адрес меняем только когда рейтинг действительно на экране.
    if (logoutOpen || baseScreen !== "rating") return;
    writeHash(`#/rating/${view}`);
  },
});
rating.init();

const manager = new ScreenManager({ rating: ratingScreenEl, map: mapScreenEl }, "rating");

// --- Экран 4: подтверждение выхода. ----------------------------------------
let logoutOpen = false;
let leaving = false;

const logout = new LogoutScreen({
  onCancel: () => {
    void closeLogout();
  },
  onConfirm: () => {
    void confirmLogout();
  },
});

// --- Карта (создаётся при первом открытии). ---------------------------------
let mapScreen: MapScreen | null = null;
let shell: AttributeFormShell | null = null;

let currentPoint: PointCoords | null = null;
let shellPoint: PointCoords | null = null;

// Описание трёх секций формы.
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
// поэтому здесь единственное место с приведением типа (по ключу оно безопасно).
const submitByKey: Record<
  string,
  (
    input: unknown,
    point: GeoPoint,
  ) => Promise<{ ok: boolean; value?: { id: number }; error?: string }>
> = {
  ramp: (input, point) => ramp.submit(input as RampFormInput, point),
  crossing: (input, point) => crossing.submit(input as CrossingFormInput, point),
  road: (input, point) => road.submit(input as RoadFormInput, point),
};

/** Показать сообщение пользователю и доскроллить до него. */
function showMessage(text: string): void {
  debugEl.style.display = "block";
  debugEl.textContent = text;
  debugEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/** Что делать по «Сохранить»: парсинг + отправка на бэкенд через фичу. */
async function handleSave(key: FormSection["key"], input: unknown): Promise<void> {
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
  saveBtn.disabled = true;
  saveBtn.textContent = "Отправляем…";
  showMessage("Отправляем…");

  try {
    const result = await submit(input, point);

    if (result.ok && result.value) {
      showMessage(
        `✓ Сохранено! id записи: ${result.value.id}\n` +
          `Можно внести ещё один объект для этой точки или закрыть панель.`,
      );
      // Отправленную секцию очищаем и сворачиваем — повторное «Сохранить»
      // по ней невозможно (дублей не будет). Панель НЕ закрываем: данные
      // других секций на месте, волонтёр сам решает, что дальше.
      shell?.resetSection(key);
    } else {
      showMessage(`✗ Не удалось сохранить.\n${result.error ?? "Неизвестная ошибка"}`);
    }
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Сохранить";
  }
}

/** Открыть панель формы для выбранной точки. */
function openFormForPoint(coords: PointCoords): void {
  currentPoint = coords;
  coordsLabel.textContent =
    `Координаты: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;

  // Каркас строим заново только для НОВОЙ точки. Если пользователь закрыл
  // панель крестиком и снова нажал «Добавить» на той же точке — показываем
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

  debugEl.style.display = "none";
  panelEl.style.display = "block";
}

/** Создать карту при первом показе экрана карты. */
function ensureMap(): void {
  if (mapScreen) return;
  mapScreen = new MapScreen(mapEl, openFormForPoint);
  mapScreen.render();
}

// --- Навигация --------------------------------------------------------------

/** Какой основной экран лежит под оверлеем выхода. */
let baseScreen: "rating" | "map" = "rating";
/** Идёт переход между экранами — новые клики игнорируем, чтобы не рвать анимацию. */
let navigating = false;

function writeHash(hash: string): void {
  if (window.location.hash === hash) return;
  // replaceState не плодит историю: кнопка «назад» в приложении — это наши
  // кнопки, а не браузерные.
  window.history.replaceState(null, "", hash);
}

function parseRoute(): { screen: "rating" | "map" | "logout"; view: RatingViewKey } {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [screen, view] = raw.split("/");

  if (screen === "map") return { screen: "map", view: "table" };
  if (screen === "logout") return { screen: "logout", view: "table" };

  const known = (["table", "podium", "list"] as const).find((key) => key === view);
  return { screen: "rating", view: known ?? "table" };
}

/** Уйти на карту (кнопки «назад» и «карандаш» внизу). */
function goMap(): void {
  if (navigating || logoutOpen || baseScreen === "map") return;

  navigating = true;
  ensureMap();
  writeHash("#/map");

  void manager.show("map", { from: "right" }).then(() => {
    baseScreen = "map";
    navigating = false;
    // Leaflet измерял контейнер, пока экран был скрыт; после показа размеры
    // могли измениться — просим пересчитать, иначе карта «серые квадраты».
    mapScreen?.invalidateSize();
  });
}

/** Вернуться на рейтинг (кнопка «Рейтинг» на карте). */
function goRating(view: RatingViewKey = rating.view): void {
  if (navigating || logoutOpen) return;

  if (baseScreen === "rating") {
    rating.goTo(view);
    return;
  }

  navigating = true;
  // Вид переключаем ДО въезда экрана, чтобы карусель не дёргалась на глазах.
  rating.goTo(view, { animate: false });
  writeHash(`#/rating/${view}`);

  void manager.show("rating", { from: "left" }).then(() => {
    baseScreen = "rating";
    navigating = false;
  });
}

/** Открыть подтверждение выхода «шторкой» из кнопки профиля. */
function openLogout(origin?: { x: number; y: number }): void {
  if (leaving || logoutOpen) return;
  logoutOpen = true;
  writeHash("#/logout");
  logout.openAt(origin);
}

async function closeLogout(): Promise<void> {
  if (!logoutOpen) return;
  logoutOpen = false;
  writeHash(`#/rating/${rating.view}`);
  await logout.close();
}

/**
 * «Выйти» пока статичное: показываем крутилку, закрываем шторку и говорим
 * «вы вышли». Когда появится авторизация — здесь будет вызов бэкенда,
 * а анимации и экран останутся теми же.
 */
async function confirmLogout(): Promise<void> {
  if (!logoutOpen || leaving) return;

  leaving = true;
  logout.setBusy(true);
  await wait(650);

  logoutOpen = false;
  writeHash(`#/rating/${rating.view}`);
  await logout.close();
  leaving = false;

  showToast("Вы вышли из аккаунта");
}

// --- Обработчики -----------------------------------------------------------

for (const button of navButtons) {
  button.addEventListener("click", () => {
    // Волна от нажатия (CSS-анимация ::after).
    button.classList.add("is-pressed");
    window.setTimeout(() => button.classList.remove("is-pressed"), 520);

    const action = button.dataset.action;
    if (action === "back" || action === "add") {
      goMap();
      return;
    }

    if (action === "profile" && !logoutOpen) {
      const rect = button.getBoundingClientRect();
      openLogout({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
  });
}

mapRatingBtn.addEventListener("click", () => goRating());

saveBtn.addEventListener("click", () => {
  if (!shell || !shell.hasActiveSection()) {
    showMessage("Сначала выберите тип объекта и заполните форму.");
    return;
  }
  shell.save();
});

closeBtn.addEventListener("click", () => {
  panelEl.style.display = "none";
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && logoutOpen) {
    event.preventDefault();
    void closeLogout();
  }
});

// Клики по фону карты не должны закрывать шторку — она и так поверх всего.

// --- Старт -----------------------------------------------------------------

const initialRoute = parseRoute();

// Шторку выхода помечаем открытой ДО goTo — иначе смена вида перезапишет
// адрес #/logout на #/rating/...
if (initialRoute.screen === "logout") logoutOpen = true;

if (initialRoute.screen === "map") {
  ensureMap();
  baseScreen = "map";
  void manager.show("map", { animate: false }).then(() => {
    mapScreen?.invalidateSize();
  });
}

rating.goTo(initialRoute.view, { animate: false });

if (initialRoute.screen === "logout") {
  logout.openAt();
}
