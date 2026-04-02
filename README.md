# hyp-sprites-img

基于 **Vite** 与 **Vue 3** 的雪碧图（精灵图）工具：在构建期根据整图尺寸与布局规则生成**静态**的每帧 `x / y / width / height`，运行时通过 Vue 组件用 `background-position` / `background-size` 展示单帧。

## 安装

```bash
npm install hyp-sprites-img
```

对等依赖：`vite`（5 或 6）、`vue`（3）。

## 为什么组件从 `hyp-sprites-img/vue` 导入？

主入口 `hyp-sprites-img` 仅包含 **Vite 插件**与**布局计算工具**，这样在 `vite.config.ts` 里 `import { hypSpritesImg } from 'hyp-sprites-img'` 时，Node 不会去解析 `virtual:hyp-sprites-img`。  
Vue 组件依赖该虚拟模块，因此请从子路径导入：

```ts
import { hypSpritesImgCom } from 'hyp-sprites-img/vue'
```

## Vite 配置

```ts
import { hypSpritesImg } from 'hyp-sprites-img'

export default defineConfig({
  plugins: [
    hypSpritesImg([
      {
        url: 'src/assets/sprites.png',
        name: 'sprites1',
        spritesName: ['button', 'custom'],
      },
      {
        url: 'src/assets/other.png',
        name: 'sprites2',
        count: 4,
        layout: 'horizontal',
      },
    ]),
  ],
})
```

### 配置项说明

| 字段 | 说明 |
|------|------|
| `url` | 雪碧图路径（相对项目根或可被 Vite 解析的路径；也支持绝对路径） |
| `name` | 组 id，在组件里用 `name` 对应；**全局唯一** |
| `spritesName` | 可选。每帧名称数组，顺序与切分顺序一致；**帧数 N = 数组长度** |
| `count` | 未提供 `spritesName` 时**必填**。帧名自动为 `"0"`, `"1"`, … |
| `layout` | 可选。省略时按整图比例**自动推断**：宽 ≥ 高（含正方形）为 `horizontal`；高 > 宽为 `vertical`。也可显式写 `horizontal` / `vertical` / `{ type: 'grid', rows, cols }`（网格**先行后列**） |
| `detect` | 为 `true` 时启用**连通域检测**（见下文），不再使用 `layout` 等分 |
| `alphaThreshold` | 仅 `detect`：`alpha > 阈值` 视为前景，默认 `128` |
| `minRegionArea` | 仅 `detect`：面积小于该像素数的连通块忽略，默认 `4`（过滤噪点） |

### 连通域自动检测（`detect: true`）

构建期用 [sharp](https://sharp.pixelplumbing.com/) 将整图解码为 **RGBA** 缓冲（等价于浏览器里 `Image` + `Canvas` + `getImageData` 得到的像素）。

1. 对 **alpha** 做阈值，得到二值前景 mask。  
2. **四连通** flood fill 标记每个连通域。  
3. 对每个连通域计算**外接矩形**（`x, y, width, height`）。  
4. 按**先上后下、再先左后右**（外接矩形左上角 `(y, x)`）排序。  
5. 与 `spritesName`（或 `count` 生成的 `"0"…`）**按顺序一一对应**；检测到的有效连通块数量必须 **≥** 名称个数。

适用于小图之间**透明背景**分隔的雪碧图；整张不透明、或块之间像素相连会连成一个大域，需改图或仍用等分 `layout`。

### 布局规则（等分，`detect` 未开启时）

- **未写 `layout` 时**：`inferDefaultLayout` — 横图/方图默认按**从左到右**切宽度；竖图默认按**从上到下**切高度。若方图里实际是纵向叠放小图，请写 `layout: 'vertical'`。
- **`vertical`**：整宽为每帧宽度，高度按 N 等分，自上而下第 `i` 帧（从 0 起）。
- **`horizontal`**：整高为每帧高度，宽度按 N 等分，自左而右。
- **`grid`**：`rows × cols` 个格子，每格等大；帧按先行后列排列，前 N 个名称对应前 N 格。

## 页面中使用

```vue
<script setup lang="ts">
import { hypSpritesImgCom } from 'hyp-sprites-img/vue'
</script>

<template>
  <hypSpritesImgCom name="sprites1" spritesName="button" width="100px" height="100px" />
</template>
```

### 组件属性

| 属性 | 说明 |
|------|------|
| `name` | 对应配置里的 `name`；**不传则使用配置数组中的第一组** |
| `spritesName` | 小图名称，或 index 字符串（如 `"0"`）；**不传则默认为 `"0"`（第一帧）** |
| `width` / `height` | 可选。不传则使用 manifest 中该帧的宽高；只传一边时按比例缩放另一边；都传则按给定值拉伸 |

## TypeScript

在项目 `env.d.ts`（或 `vite-env.d.ts`）中加入对虚拟模块类型的引用：

```ts
/// <reference types="hyp-sprites-img/virtual" />
```

## 限制与说明

- **等分模式**：按 `layout` / 默认推断切矩形。  
- **`detect` 模式**：依赖透明分隔与阈值，极端抗锯齿可能导致边缘碎块，可调 `alphaThreshold` / `minRegionArea`。  
- 构建期仅解析**本地可解析**的 `url`。

## 许可证

MIT，见 [LICENSE](./LICENSE)。
