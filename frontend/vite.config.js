import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/design": "http://localhost:8000",
      "/products": "http://localhost:8000",
    },
  },
});
