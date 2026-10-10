/// <reference types="vite/client" />

// Переменные окружения из .env (см. .env.example).
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
