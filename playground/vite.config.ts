import path from "node:path";
import { defineConfig, type PluginOption } from "vite";
import vue from "@vitejs/plugin-vue";
import { hypSpritesImg } from "hyp-sprites-img";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5179,
  },
  plugins: [
    vue(),
    hypSpritesImg(
      [
        {
          url: path.resolve(__dirname, "/src/assets/css_sprites2.png"),
          name: "sprites1",
          detect: true,
          // spritesName: ["button", "custom", "logo",'22'],
          alphaThreshold: 128,
          minRegionArea: 10,
          detectMergeGap:5
        },
        /**
         * 不写 count / spritesName：detect 自动导出全部连通块，帧名为 "0"…"n-1"。
         */
        {
          url: 'https://tdesign.gtimg.com/site/brand/wechat-pay.png',
          name: "sprites2",
          detect: true,
          alphaThreshold: 128,
          minRegionArea: 4,
          detectMergeGap: 20,
        },
        {
          url: path.resolve(__dirname, "/src/assets/css_sprites_icon.png"),
          name: "app_icon",
          detect: true,
          alphaThreshold: 128,
          minRegionArea: 4,
          detectMergeGap: 4,
        },
      ],
      { 
        preview: true,
        // path:'/__hyp-sprites-img-preview',
        // port: 5180,
       }
    ) as PluginOption,
  ],
});
