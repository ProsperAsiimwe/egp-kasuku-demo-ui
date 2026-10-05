/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_HOST?: string;
  readonly VITE_DEV_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.png" {
  const src: string;
  export default src;
}
