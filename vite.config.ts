import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    // nodePolyfills()
  ],
  // resolve: {
  //   alias: {
  //     "node:fs/promises": "node-stdlib-browser/mock/empty",
  //     "node:path/posix": "node-stdlib-browser/mock/empty",
  //   },
  // },
});
