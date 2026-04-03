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
): Array<{
  name: string
  imageUrl: string
  imageWidth: number
  imageHeight: number
  items: Array<{ frameKey: string; styleAttr: string }>
}> {
  const sections: Array<{
    name: string
    imageUrl: string
    imageWidth: number
    imageHeight: number
    items: Array<{ frameKey: string; styleAttr: string }>
  }> = []

  for (const { config, built, imageUrl } of groups) {
    const order = resolveFrameNames(config, built)
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
    sections.push({
      name: built.name,
      imageUrl,
      imageWidth: built.imageWidth,
      imageHeight: built.imageHeight,
      items,
    })
  }

  return sections
}

export function renderPreviewHtml(
  sections: ReturnType<typeof buildPreviewSections>
): string {
  const blocks = sections
    .map((sec, secIdx) => {
      const initialNamesJson = JSON.stringify(sec.items.map((it) => it.frameKey))
      const framesHtml = sec.items
        .map((it, frameIdx) => {
          const rawSnippet = vueSnippet(sec.name, it.frameKey)
          const inputId = `hyp-sprites-frame-name-${secIdx}-${frameIdx}`
          return `
      <section class="frame">
        <div class="frame-head">
          <label class="frame-name-label" for="${inputId}">spritesName</label>
          <input type="text" id="${inputId}" class="frame-name-input" value="${escapeHtml(it.frameKey)}" spellcheck="false" autocomplete="off" />
          <button type="button" class="btn secondary btn-compact" data-copy-name="${escapeHtml(it.frameKey)}" title="复制当前帧名">复制</button>
        </div>
        <div class="row">
          <div class="thumb-wrap" role="img" aria-label="${escapeHtml(it.frameKey)}" data-thumb-label>
            <span class="thumb" style="${escapeHtml(it.styleAttr)}"></span>
          </div>
          <div class="actions">
            <button type="button" class="btn" data-copy-snippet>复制 Vue 组件代码</button>
            <pre class="snippet" role="region" aria-label="Vue 组件代码预览">${escapeHtml(rawSnippet)}</pre>
          </div>
        </div>
      </section>`
        })
        .join('\n')

      const sheetAlt = `${sec.name} 雪碧图整图`
      return `
  <article class="group" data-group-name="${escapeHtml(sec.name)}" data-sprites-names="${escapeHtml(initialNamesJson)}">
    <div class="group-body">
      <div class="group-main">
        <header class="group-head">
          <h2 class="group-title">${escapeHtml(sec.name)}</h2>
          <button type="button" class="btn secondary btn-compact" data-copy-sprites-array title="复制整组 spritesName，用于 Vite 配置">复制 spritesName</button>
        </header>
        ${framesHtml}
      </div>
      <aside class="group-sheet" aria-label="整图预览">
        <div class="sheet-label">整图预览</div>
        <div class="sheet-img-wrap">
          <img class="sprite-sheet-img" src="${escapeHtml(sec.imageUrl)}" alt="${escapeHtml(sheetAlt)}" width="${sec.imageWidth}" height="${sec.imageHeight}" loading="lazy" decoding="async" />
        </div>
        <div class="sheet-meta">${sec.imageWidth}×${sec.imageHeight}px</div>
      </aside>
    </div>
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
    body { margin: 0; padding: 1.5rem; max-width: 1100px; }
    h1 { font-size: 1.35rem; margin: 0 0 1rem; }
    .group { margin-bottom: 2rem; padding: 1rem 1.25rem; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .group-body { display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-start; }
    .group-main { flex: 1 1 18rem; min-width: 0; }
    .group-sheet { flex: 0 1 300px; max-width: 100%; align-self: flex-start; }
    .sheet-label { font-size: 0.75rem; font-weight: 600; color: #555; margin: 0 0 0.4rem; }
    .sheet-img-wrap { padding: 8px; background: repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px; border-radius: 6px; border: 1px solid #ddd; }
    .sprite-sheet-img { display: block; max-width: 100%; height: auto; vertical-align: top; }
    .sheet-meta { font-size: 0.75rem; color: #888; margin-top: 0.45rem; text-align: center; }
    .group-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; border-bottom: 1px solid #e8eaed; padding-bottom: 0.5rem; }
    .group-title { font-size: 1.15rem; margin: 0; flex: 1 1 auto; min-width: 0; }
    .frame { margin-bottom: 1.25rem; }
    .frame:last-child { margin-bottom: 0; }
    .frame-head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .frame-name-label { font-size: 0.75rem; font-weight: 600; color: #555; margin: 0; }
    .frame-name-input { flex: 1 1 12rem; min-width: 8rem; max-width: 100%; padding: 0.35rem 0.5rem; font-size: 0.95rem; font-weight: 600; color: #333; border: 1px solid #ccc; border-radius: 6px; background: #fff; }
    .frame-name-input:focus { outline: none; border-color: #2a6; box-shadow: 0 0 0 2px rgba(42,102,170,.2); }
    .btn-compact { padding: 0.35rem 0.65rem; font-size: 0.8125rem; white-space: nowrap; }
    .row { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start; }
    .thumb-wrap { padding: 8px; background: repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px; border-radius: 6px; border: 1px solid #ddd; }
    .thumb { display: inline-block; }
    .actions { display: flex; flex-direction: column; gap: 0.5rem; align-items: stretch; min-width: 0; flex: 1 1 14rem; max-width: 100%; }
    .snippet {
      margin: 0;
      padding: 0.65rem 0.75rem;
      font-size: 0.8125rem;
      line-height: 1.45;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #1e293b;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
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
  <p class="hint">一级标题为配置中的 <code>name</code>，右侧可复制整组 <code>spritesName</code> 供 Vite 配置；每组最右侧为<strong>整图雪碧图</strong>预览；帧名可在输入框中修改（仅预览，不写入磁盘），名称右侧可复制单帧名。</p>
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
      function vueSnippetJs(groupName, frameKey) {
        return '<hypSpritesImgCom\\n  name="' + groupName + '"\\n  sprites-name="' + frameKey + '"\\n/>';
      }
      function formatSpritesArrayForVite(names) {
        return '[' + names.map(function (n) { return JSON.stringify(n); }).join(', ') + ']';
      }
      function collectFrameNames(article) {
        var inputs = article.querySelectorAll('.frame-name-input');
        return Array.prototype.map.call(inputs, function (inp) {
          var v = (inp.value || '').trim();
          return v.length ? v : (inp.defaultValue || '').trim() || '0';
        });
      }
      function syncGroupSpritesData(article) {
        var names = collectFrameNames(article);
        article.setAttribute('data-sprites-names', JSON.stringify(names));
      }
      document.querySelectorAll('article.group').forEach(function (article) {
        syncGroupSpritesData(article);
      });
      document.querySelectorAll('.frame-name-input').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var frame = inp.closest('section.frame');
          var article = inp.closest('article.group');
          if (!frame || !article) return;
          var groupName = article.getAttribute('data-group-name') || '';
          var key = (inp.value || '').trim();
          var keyForSnippet = key.length ? key : (inp.defaultValue || '').trim() || '0';
          var copyBtn = frame.querySelector('button[data-copy-name]');
          if (copyBtn) copyBtn.setAttribute('data-copy-name', keyForSnippet);
          var pre = frame.querySelector('pre.snippet');
          if (pre) pre.textContent = vueSnippetJs(groupName, keyForSnippet);
          var thumb = frame.querySelector('[data-thumb-label]');
          if (thumb) thumb.setAttribute('aria-label', keyForSnippet);
          syncGroupSpritesData(article);
        });
      });
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
          var name = btn.getAttribute('data-copy-name') || '';
          copyText(name, '复制成功 ' + JSON.stringify(name));
        });
      });
      document.querySelectorAll('button[data-copy-sprites-array]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var article = btn.closest('article.group');
          if (!article) return;
          syncGroupSpritesData(article);
          var raw = article.getAttribute('data-sprites-names') || '[]';
          var names;
          try { names = JSON.parse(raw); } catch (e) { names = []; }
          var text = formatSpritesArrayForVite(names);
          copyText(text, '复制成功 ' + text);
        });
      });
    })();
  </script>
</body>
</html>`
}
