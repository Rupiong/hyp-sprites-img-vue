import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import PreviewApp from "./PreviewApp.vue";
import previewCss from "./preview-page.css?inline";
import type { PreviewSection } from "./preview-types.js";

function escapeJsonForHtml(json: string): string {
  return json.replace(/</g, "\\u003c");
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export type RenderPreviewHtmlDocumentOptions = {
  /** 浏览器请求的客户端水合脚本绝对路径（含 Vite base），如 `/app/__hyp-sprites-img-preview/preview-client.mjs` */
  clientScriptSrc: string;
};

/**
 * SSR 输出完整 HTML；客户端由 `preview-client.mjs` 水合 `#app`。
 */
export async function renderPreviewHtmlDocument(
  sections: PreviewSection[],
  options: RenderPreviewHtmlDocumentOptions,
): Promise<string> {
  const appHtml = await renderToString(
    createSSRApp(PreviewApp, { sections }),
  );
  const json = escapeJsonForHtml(JSON.stringify(sections));
  const src = escapeHtmlAttr(options.clientScriptSrc);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>hyp-sprites-img 预览</title>
  <style>${previewCss}</style>
</head>
<body>
  <div id="app">${appHtml}</div>
  <script type="application/json" id="hyp-sprites-preview-data">${json}</script>
  <script type="module" src="${src}"></script>
</body>
</html>`;
}
