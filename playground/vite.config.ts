import path from "node:path";
import { defineConfig, type PluginOption } from "vite";
import vue from "@vitejs/plugin-vue";
import { hypSpritesImg } from "hyp-sprites-img";

export default defineConfig({
  server: {
    port: 5179,
  },
  plugins: [
    vue(),
    hypSpritesImg([
      {
        url: path.resolve(__dirname, "src/assets/sprite.png"),
        name: "sprites1",
        detect: true,
        spritesName: ["button", "custom", "logo"],
        alphaThreshold: 128,
        minRegionArea: 4,
      },
      /** 同一雪碧图：用 count 生成帧名 "0"、"1"…（与连通域顺序对应） */
      {
        url: path.resolve(__dirname, "src/assets/sprite.png"),
        name: "sprites2",
        detect: true,
        count: 2,
        alphaThreshold: 128,
        minRegionArea: 4,
      },
    ]) as PluginOption,
  ],
});
