import type { CapacitorConfig } from "@capacitor/cli";

// Конфиг Android-обёртки (Capacitor). Веб-код лежит в dist/ (сборка Vite)
// и упаковывается внутрь APK — приложению не нужен хостинг статики,
// в сеть оно ходит только за тайлами карты и в наш API.
const config: CapacitorConfig = {
  appId: "ru.gorodvseh.app",
  appName: "Город для всех",
  webDir: "dist",

  // Схема "http" (а не дефолтная "https"): страница внутри APK получает origin
  // http://localhost, иначе запросы к нашему API на http:// блокируются
  // WebView как смешанный контент (https-страница -> http-запрос).
  // http://localhost при этом остаётся "безопасным origin" — геолокация работает.
  server: {
    androidScheme: "http",
    cleartext: true,
  },
};

export default config;
