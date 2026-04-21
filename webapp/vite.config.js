import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // слушать 0.0.0.0 — нужно для ngrok / cloudflared
    port: 5173,
    // разрешаем сабдомены туннелей: Cloudflare / ngrok
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok.io"],
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
