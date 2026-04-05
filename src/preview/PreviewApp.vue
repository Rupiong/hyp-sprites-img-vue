<script setup lang="ts">
import { ref, watch } from "vue";
import type { PreviewSection } from "./preview-types.js";
import { vueSnippet } from "./vue-snippet.js";

const props = defineProps<{
  sections: PreviewSection[];
}>();

type FrameRow = {
  frameKey: string;
  styleAttr: string;
  posX: number;
  posY: number;
};

type GroupRow = {
  name: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  items: FrameRow[];
};

function cloneSections(sections: PreviewSection[]): GroupRow[] {
  return sections.map((sec) => ({
    name: sec.name,
    imageUrl: sec.imageUrl,
    imageWidth: sec.imageWidth,
    imageHeight: sec.imageHeight,
    items: sec.items.map((it) => ({
      frameKey: it.frameKey,
      styleAttr: it.styleAttr,
      posX: it.defaultPosX,
      posY: it.defaultPosY,
    })),
  }));
}

const groups = ref<GroupRow[]>(cloneSections(props.sections));

watch(
  () => props.sections,
  (next) => {
    groups.value = cloneSections(next);
  },
  { deep: true },
);

const toastMsg = ref("");
const toastVisible = ref(false);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(msg: string) {
  toastMsg.value = msg;
  toastVisible.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 2200);
}

function copyText(text: string, okMsg?: string) {
  if (!text) return Promise.resolve();
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => {
        showToast(okMsg ?? "复制成功！");
      },
      () => {
        prompt("复制失败，请手动复制：", text);
        showToast("请从对话框中复制");
      },
    );
  }
  prompt("复制以下内容：", text);
  showToast("请从对话框中复制");
  return Promise.resolve();
}

/** 供 :style 对象绑定；覆盖 background-position */
function thumbStyleRecord(
  styleAttr: string,
  posX: number,
  posY: number,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of styleAttr.split(";")) {
    const p = part.trim();
    if (!p) continue;
    const idx = p.indexOf(":");
    if (idx < 0) continue;
    const key = p.slice(0, idx).trim();
    const val = p.slice(idx + 1).trim();
    if (key.toLowerCase() === "background-position") continue;
    out[key] = val;
  }
  out["background-position"] = `${posX}px ${posY}px`;
  return out;
}

function keyForSnippet(frameKey: string): string {
  const k = frameKey.trim();
  return k.length ? k : "0";
}

function formatSpritesArrayForVite(names: string[]): string {
  return `[${names.map((n) => JSON.stringify(n)).join(", ")}]`;
}

function spritesNamesJson(g: GroupRow): string {
  return JSON.stringify(
    g.items.map((it) => {
      const v = it.frameKey.trim();
      return v.length ? v : "0";
    }),
  );
}

function stepPos(
  gIdx: number,
  fIdx: number,
  axis: "posX" | "posY",
  delta: number,
) {
  const row = groups.value[gIdx]?.items[fIdx];
  if (!row) return;
  const cur = row[axis];
  const n = Number.isFinite(cur) ? cur + delta : 0;
  row[axis] = n;
}

function copySnippet(gIdx: number, fIdx: number) {
  const g = groups.value[gIdx];
  const it = g?.items[fIdx];
  if (!g || !it) return;
  const text = vueSnippet(g.name, keyForSnippet(it.frameKey), it.posX, it.posY);
  void copyText(text.trim(), "复制成功！");
}

function copyFrameName(gIdx: number, fIdx: number) {
  const it = groups.value[gIdx]?.items[fIdx];
  if (!it) return;
  const name = keyForSnippet(it.frameKey);
  void copyText(name, `复制成功 ${JSON.stringify(name)}`);
}

function copySpritesArray(gIdx: number) {
  const g = groups.value[gIdx];
  if (!g) return;
  const names = g.items.map((it) => {
    const v = it.frameKey.trim();
    return v.length ? v : "0";
  });
  const text = formatSpritesArrayForVite(names);
  void copyText(text, `复制成功 ${text}`);
}

const sheetAlt = (name: string) => `${name} 雪碧图整图`;

const githubRepoUrl = "https://github.com/Rupiong/hyp-sprites-img-vue";
</script>

<template>
  <div class="hyp-preview-root">
    <header class="hyp-preview-top">
      <h1>hyp-sprites-img — 雪碧图帧预览</h1>
      <a
        class="hyp-preview-github"
        :href="githubRepoUrl"
        target="_blank"
        rel="noopener noreferrer"
        title="GitHub 仓库"
        aria-label="在 GitHub 上查看 hyp-sprites-img-vue"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          class="hyp-preview-github-icon"
          viewBox="0 0 24 24"
          width="32"
          height="32"
          fill="currentColor"
        >
          <path
            d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943"
          />
        </svg>
        GitHub
      </a>
    </header>
    <p class="hint">
      一级标题为配置中的 <code>name</code>，组标题旁可复制整组
      <code>spritesName</code> 供 Vite
      配置；每组最右侧为<strong>整图雪碧图</strong>预览；左侧为帧缩略图，右侧为帧名与坐标、代码。帧名可在输入框中修改（仅预览，不写入磁盘），名称旁可复制单帧名。<code
        >positionX</code
      >
      /
      <code>positionY</code>
      为与组件一致的背景坐标（px），默认对应当前帧；可用步进器微调，缩略图与复制的
      Vue 片段会同步。
    </p>

    <article
      v-for="(sec, secIdx) in groups"
      :key="sec.name + '-' + secIdx"
      class="group"
      :data-group-name="sec.name"
      :data-sprites-names="spritesNamesJson(sec)"
    >
      <div class="group-body">
        <div class="group-main">
          <header class="group-head">
            <h2 class="group-title">{{ sec.name }}</h2>
            <button
              type="button"
              class="btn secondary btn-compact"
              title="复制整组 spritesName，用于 Vite 配置"
              @click="copySpritesArray(secIdx)"
            >
              复制 spritesName
            </button>
          </header>

          <section
            v-for="(it, frameIdx) in sec.items"
            :key="secIdx + '-' + frameIdx + '-' + it.frameKey"
            class="frame"
          >
            <div class="frame-row">
              <div class="frame-detail">
                <div>
                  <div
                    style="width: fit-content"
                    class="thumb-wrap"
                    role="img"
                    :aria-label="keyForSnippet(it.frameKey)"
                  >
                    <span
                      class="thumb"
                      :style="thumbStyleRecord(it.styleAttr, it.posX, it.posY)"
                    />
                  </div>
                </div>
                <div class="frame-head">
                  <label
                    class="frame-name-label"
                    :for="`hyp-sprites-frame-name-${secIdx}-${frameIdx}`"
                    >spritesName</label
                  >
                  <input
                    :id="`hyp-sprites-frame-name-${secIdx}-${frameIdx}`"
                    v-model="it.frameKey"
                    type="text"
                    class="frame-name-input"
                    spellcheck="false"
                    autocomplete="off"
                  />
                  <button
                    type="button"
                    class="btn secondary btn-compact"
                    title="复制当前帧名"
                    @click="copyFrameName(secIdx, frameIdx)"
                  >
                    复制
                  </button>
                </div>
                <div class="frame-pos-row">
                  <div class="frame-pos-field">
                    <label
                      class="frame-pos-label"
                      :for="`hyp-sprites-pos-x-${secIdx}-${frameIdx}`"
                      >positionX</label
                    >
                    <div class="stepper">
                      <button
                        type="button"
                        class="btn secondary btn-compact btn-step"
                        aria-label="positionX 减 1"
                        @click="stepPos(secIdx, frameIdx, 'posX', -1)"
                      >
                        −
                      </button>
                      <input
                        :id="`hyp-sprites-pos-x-${secIdx}-${frameIdx}`"
                        v-model.number="it.posX"
                        type="number"
                        class="position-x-input"
                        step="any"
                      />
                      <button
                        type="button"
                        class="btn secondary btn-compact btn-step"
                        aria-label="positionX 加 1"
                        @click="stepPos(secIdx, frameIdx, 'posX', 1)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div class="frame-pos-field">
                    <label
                      class="frame-pos-label"
                      :for="`hyp-sprites-pos-y-${secIdx}-${frameIdx}`"
                      >positionY</label
                    >
                    <div class="stepper">
                      <button
                        type="button"
                        class="btn secondary btn-compact btn-step"
                        aria-label="positionY 减 1"
                        @click="stepPos(secIdx, frameIdx, 'posY', -1)"
                      >
                        −
                      </button>
                      <input
                        :id="`hyp-sprites-pos-y-${secIdx}-${frameIdx}`"
                        v-model.number="it.posY"
                        type="number"
                        class="position-y-input"
                        step="any"
                      />
                      <button
                        type="button"
                        class="btn secondary btn-compact btn-step"
                        aria-label="positionY 加 1"
                        @click="stepPos(secIdx, frameIdx, 'posY', 1)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                <div class="actions">
                  <button
                    type="button"
                    class="btn"
                    @click="copySnippet(secIdx, frameIdx)"
                  >
                    复制 Vue 组件代码
                  </button>
                  <pre
                    class="snippet"
                    role="region"
                    aria-label="Vue 组件代码预览"
                    >{{
                      vueSnippet(
                        sec.name,
                        keyForSnippet(it.frameKey),
                        it.posX,
                        it.posY,
                      )
                    }}</pre
                  >
                </div>
              </div>
            </div>
          </section>
        </div>
        <aside class="group-sheet" aria-label="整图预览">
          <div class="sheet-label">整图预览</div>
          <div class="sheet-img-wrap">
            <img
              class="sprite-sheet-img"
              :src="sec.imageUrl"
              :alt="sheetAlt(sec.name)"
              :width="sec.imageWidth"
              :height="sec.imageHeight"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div class="sheet-meta">
            {{ sec.imageWidth }}×{{ sec.imageHeight }}px
          </div>
        </aside>
      </div>
    </article>

    <div
      id="hyp-sprites-toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      :class="{ show: toastVisible }"
    >
      {{ toastMsg }}
    </div>
  </div>
</template>
