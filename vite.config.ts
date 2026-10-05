import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.MLOPS_ORIGIN || "http://127.0.0.1:8002";
  const host = env.VITE_DEV_HOST || "127.0.0.1";
  const port = Number(env.VITE_DEV_PORT || 5173);

  return {
    plugins: [react()],
    server: {
      host,
      port,
      proxy: {
        "/egp-mlops-microservice": {
          target,
          changeOrigin: true,
        },
        "/health": {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});
