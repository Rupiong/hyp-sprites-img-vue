import { createSSRApp } from "vue";
import PreviewApp from "./PreviewApp.vue";
import type { PreviewSection } from "./preview-types.js";

const el = document.getElementById("hyp-sprites-preview-data");
const sections: PreviewSection[] = el?.textContent
  ? (JSON.parse(el.textContent) as PreviewSection[])
  : [];

createSSRApp(PreviewApp, { sections }).mount("#app", true);
