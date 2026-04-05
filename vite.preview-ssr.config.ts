import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  build: {
    emptyOutDir: false,
    ssr: true,
    rollupOptions: {
      input: resolve(__dirname, "src/preview/ssr-entry.ts"),
      output: {
        format: "es",
        entryFileNames: "preview-ssr.mjs",
        dir: "dist",
      },
      external: ["vue", "@vue/server-renderer"],
    },
  },
});
