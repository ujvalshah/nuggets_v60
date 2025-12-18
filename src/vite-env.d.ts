/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADAPTER_TYPE?: 'local' | 'rest';
  // Add other VITE_ prefixed env vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


