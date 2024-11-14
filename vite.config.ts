import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      // TODO: These are acquired at runtime from the browser
      external: [/npm:.*/, /observablehq:.*/],
    },
  },
});
