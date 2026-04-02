import {
  frameBackgroundInlineStyle,
  inlineStyleToCssString,
} from './frame-preview-style.js'
import type { BuiltSpriteGroup } from './build-sprite-groups.js'
import { resolveFrameNames } from './manifest.js'
import type { SpriteGroupInput } from './manifest.js'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type PreviewPageGroupInput = {
  config: SpriteGroupInput
  built: BuiltSpriteGroup
  /** 浏览器可请求的整图 URL（相对或绝对） */
  imageUrl: string
}

function vueSnippet(groupName: string, frameKey: string): string {
  return `<hypSpritesImgCom
  name="${groupName}"
  sprites-name="${frameKey}"
/>`
}

export function buildPreviewSections(
  groups: PreviewPageGroupInput[]
): Array<{ name: string; items: Array<{ frameKey: string; styleAttr: string }> }> {
  const sections: Array<{
    name: string
    items: Array<{ frameKey: string; styleAttr: string }>
  }> = []

  for (const { config, built, imageUrl } of groups) {
    const order = resolveFrameNames(config)
    const items: Array<{ frameKey: string; styleAttr: string }> = []
    for (const frameKey of order) {
      const rect = built.frames[frameKey]
      if (!rect) continue
      const style = frameBackgroundInlineStyle(
        built.imageWidth,
        built.imageHeight,
        rect,
        imageUrl
      )
      items.push({
        frameKey,
        styleAttr: inlineStyleToCssString(style),
      })
    }
    sections.push({ name: built.name, items })
  }

  return sections
}

export function renderPreviewHtml(
  sections: ReturnType<typeof buildPreviewSections>
): string {
  const blocks = sections
    .map((sec) => {
      const framesHtml = sec.items
        .map((it) => {
          const rawSnippet = vueSnippet(sec.name, it.frameKey)
          return `
      <section class="frame">
        <h3 class="frame-title">${escapeHtml(it.frameKey)}</h3>
        <div class="row">
          <div class="thumb-wrap" role="img" aria-label="${escapeHtml(it.frameKey)}">
            <span class="thumb" style="${escapeHtml(it.styleAttr)}"></span>
          </div>
          <div class="actions">
            <button type="button" class="btn" data-copy-snippet>复制 Vue 组件代码</button>
            <button type="button" class="btn secondary" data-copy-name="${escapeHtml(it.frameKey)}">复制 spritesName</button>
          </div>
        </div>
        <pre class="snippet" hidden>${escapeHtml(rawSnippet)}</pre>
      </section>`
        })
        .join('\n')

      return `
  <article class="group">
    <h2 class="group-title">${escapeHtml(sec.name)}</h2>
    ${framesHtml}
  </article>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>hyp-sprites-img 预览</title>
  <style>
    :root { font-family: system-ui, sans-serif; color: #1a1a1a; background: #f6f7f9; }
    body { margin: 0; padding: 1.5rem; max-width: 960px; }
    h1 { font-size: 1.35rem; margin: 0 0 1rem; }
    .group { margin-bottom: 2rem; padding: 1rem 1.25rem; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .group-title { font-size: 1.15rem; margin: 0 0 1rem; border-bottom: 1px solid #e8eaed; padding-bottom: 0.5rem; }
    .frame { margin-bottom: 1.25rem; }
    .frame:last-child { margin-bottom: 0; }
    .frame-title { font-size: 1rem; font-weight: 600; margin: 0 0 0.5rem; color: #333; }
    .row { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start; }
    .thumb-wrap { padding: 8px; background: repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px; border-radius: 6px; border: 1px solid #ddd; }
    .thumb { display: inline-block; }
    .actions { display: flex; flex-direction: column; gap: 0.5rem; }
    .btn { cursor: pointer; padding: 0.4rem 0.75rem; font-size: 0.875rem; border-radius: 6px; border: 1px solid #2a6; background: #2a6; color: #fff; }
    .btn.secondary { background: #fff; color: #2a6; }
    .btn:hover { filter: brightness(1.05); }
    .hint { color: #666; font-size: 0.875rem; margin-bottom: 1rem; }
    #hyp-sprites-toast {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%) translateY(120%);
      padding: 0.6rem 1rem;
      background: #1a1a1a;
      color: #fff;
      border-radius: 8px;
      font-size: 0.875rem;
      opacity: 0;
      transition: opacity 0.2s, transform 0.2s;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,.15);
    }
    #hyp-sprites-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  </style>
</head>
<body>
  <h1>hyp-sprites-img — 雪碧图帧预览</h1>
  <p class="hint">一级标题为配置中的 <code>name</code>；二级标题为 <code>spritesName</code>（帧名）。</p>
  ${blocks}
  <div id="hyp-sprites-toast" role="status" aria-live="polite" aria-atomic="true"></div>
  <script>
    (function () {
      var toastEl = document.getElementById('hyp-sprites-toast');
      var toastTimer;
      function showToast(msg) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
          toastEl.classList.remove('show');
        }, 2200);
      }
      function copyText(text, okMsg) {
        if (!text) return Promise.resolve();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text).then(function () {
            showToast(okMsg || '复制成功！');
          }).catch(function () {
            prompt('复制失败，请手动复制：', text);
            showToast('请从对话框中复制');
          });
        }
        prompt('复制以下内容：', text);
        showToast('请从对话框中复制');
        return Promise.resolve();
      }
      document.querySelectorAll('button[data-copy-snippet]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var el = btn.closest('section.frame');
          var pre = el && el.querySelector('pre.snippet');
          var t = pre ? pre.textContent : '';
          if (t) copyText(t.trim(), '复制成功！');
        });
      });
      document.querySelectorAll('button[data-copy-name]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          copyText(btn.getAttribute('data-copy-name') || '', '复制成功！');
        });
      });
    })();
  </script>
</body>
</html>`
}
