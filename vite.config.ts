import { defineConfig } from "vite";

// Корень приложения — папка с index.html (src/ui).
// Сборка складывается в dist/ в корне проекта.
export default defineConfig({
  root: "src/ui",
  server: {
    // Node резолвит "localhost" только в ::1 на этой машине, из-за чего
    // сервер не отвечал на 127.0.0.1 (ERR_CONNECTION_REFUSED в браузере).
    host: "0.0.0.0",
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
});
