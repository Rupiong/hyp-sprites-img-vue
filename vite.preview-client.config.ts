import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "src/preview/client-entry.ts"),
      output: {
        format: "es",
        entryFileNames: "preview-client.mjs",
        dir: "dist",
        inlineDynamicImports: true,
      },
    },
  },
});
