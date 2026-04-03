<script setup lang="ts">
import { hypSpritesImgCom } from "hyp-sprites-img/vue";
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>hyp-sprites-img</h1>
      <p class="lead">
        通过 Vite 插件生成 manifest，用组件按「组名
        <code>name</code>」+「帧名或序号
        <code>spritesName</code>」显示雪碧图局部。
      </p>
    </header>

    <section class="section">
      <h2>
        sprites1 — 命名帧（<code>spritesName: button | custom | logo</code>）
      </h2>
      <p class="hint">连通域自上而下、自左而右与配置中的名称一一对应。</p>
      <div class="row">
        <figure class="cell">
          <figcaption>button</figcaption>
          <hypSpritesImgCom
            name="sprites1"
            sprites-name="button"
            class="thumb bordered"
          />
        </figure>
        <figure class="cell">
          <figcaption>custom</figcaption>
          <hypSpritesImgCom
            name="sprites1"
            sprites-name="custom"
            class="thumb bordered"
          />
        </figure>
        <figure class="cell">
          <figcaption>logo</figcaption>
          <hypSpritesImgCom
            name="sprites1"
            sprites-name="logo"
            class="thumb bordered"
          />
        </figure>
      </div>
    </section>

    <section class="section">
      <h2>
        sprites2 — 自动检测全部帧（<code>sprites-name: "0"</code
        >、<code>"1"</code>…）
      </h2>
      <p class="hint">
        <code>detect: true</code> 且省略 <code>count</code> /
        <code>spritesName</code> 时，manifest 包含全部连通块。
      </p>
      <div class="row">
        <figure class="cell">
          <figcaption>spritesName="0"</figcaption>
          <hypSpritesImgCom
            name="sprites2"
            sprites-name="0"
            height="30px"
            class="thumb bordered"
          />
        </figure>
        <figure class="cell">
          <figcaption>spritesName="1"</figcaption>
          <hypSpritesImgCom
            name="sprites2"
            sprites-name="1"
            class="thumb bordered"
          />
        </figure>
      </div>
    </section>

    <section class="section">
      <h2>尺寸：仅宽 / 仅高 / 固定宽高</h2>
      <p class="hint">只传一侧会按比例缩放；两侧都传则拉伸到指定像素。</p>
      <div class="row">
        <figure class="cell">
          <figcaption>width="48"</figcaption>
          <hypSpritesImgCom
            name="sprites1"
            sprites-name="button"
            :width="48"
            class="bordered"
          />
        </figure>
        <figure class="cell">
          <figcaption>height="40"</figcaption>
          <hypSpritesImgCom
            name="sprites1"
            sprites-name="button"
            :height="40"
            class="bordered"
          />
        </figure>
        <figure class="cell">
          <figcaption>64×32</figcaption>
          <hypSpritesImgCom
            name="sprites1"
            sprites-name="button"
            :width="64"
            :height="32"
            class="bordered"
          />
        </figure>
      </div>
    </section>

    <section class="section">
      <h2>默认组</h2>
      <p class="hint">
        省略 <code>name</code> 时使用配置中的第一组（此处为
        <code>sprites1</code>）。
      </p>
      <hypSpritesImgCom sprites-name="logo" class="thumb bordered" />
    </section>

    <hypSpritesImgCom name="sprites2" sprites-name="0" />

    <div
      style="
        width: fit-content;
        height: 100px;
        border: 1px solid red;
        display: flex;
      "
    >
      <hypSpritesImgCom
        name="app_icon"
        sprites-name="17"
        height="100%"
      />
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  color: #1a1a1a;
  line-height: 1.5;
}

.header h1 {
  margin: 0 0 8px;
  font-size: 1.5rem;
  font-weight: 650;
}

.lead {
  margin: 0;
  color: #444;
  font-size: 0.95rem;
}

.lead code {
  font-size: 0.88em;
  padding: 0 4px;
  border-radius: 4px;
  background: #f0f0f0;
}

.section {
  margin-top: 32px;
}

.section h2 {
  margin: 0 0 6px;
  font-size: 1.05rem;
  font-weight: 600;
}

.hint {
  margin: 0 0 14px;
  font-size: 0.88rem;
  color: #666;
}

.hint code {
  font-size: 0.92em;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-end;
}

.cell {
  margin: 0;
}

.cell figcaption {
  margin-bottom: 6px;
  font-size: 0.8rem;
  color: #555;
}

.thumb {
  vertical-align: middle;
}

.bordered {
  border: 1px dashed #ccc;
  border-radius: 4px;
}
</style>
