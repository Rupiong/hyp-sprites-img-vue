export type Layout =
  | 'vertical'
  | 'horizontal'
  | { type: 'grid'; rows: number; cols: number }

export interface SpriteGroupInput {
  /**
   * 雪碧图整图地址。
   * - 本地：绝对路径、相对项目根路径，或可被 Vite/Rollup `resolve` 的模块路径（如 `./assets/s.png`）
   * - 网络：`http://` / `https://`，构建时用缓存读尺寸/检测帧；**打包后 manifest 的 `url` 仍为远程地址**，不把缓存图打进产物
   */
  url: string
  name: string
  spritesName?: string[]
  count?: number
  layout?: Layout
  /**
   * 为 true 时：用 RGBA + alpha 阈值做四连通域，外接矩形得到每帧 x/y/width/height，
   * 再按「先上后下、先左后右」与 `spritesName` / `count` 顺序对应（忽略 `layout` 与等分逻辑）。
   */
  detect?: boolean
  /** `detect` 时：alpha > 阈值视为前景，默认 128 */
  alphaThreshold?: number
  /** `detect` 时：面积小于此像素数的连通块丢弃，默认 4 */
  minRegionArea?: number
}

export interface SpriteRect {
  x: number
  y: number
  width: number
  height: number
}

/** 每组雪碧图：帧名 -> 矩形（像素，基于整图左上角） */
export type SpriteFrames = Record<string, SpriteRect>

/** name（组 id）-> 帧数据 */
export type HypSpritesManifest = Record<string, SpriteFrames>

export interface SpriteGroupMeta {
  /** 整图宽度 */
  imageWidth: number
  /** 整图高度 */
  imageHeight: number
  /** 解析后的资源 import id（供虚拟模块生成 import … from id） */
  resolvedImportId: string
  frames: SpriteFrames
}

/**
 * 未显式指定 `layout` 时，根据整图宽高比推断常见排布（与「等分」假设一致）：
 * - **宽 ≥ 高**（含正方形）：`horizontal`（从左到右等分宽度，每帧高度为整图高），适合横排图标条、一行多图。
 * - **高 > 宽**：`vertical`（从上到下等分高度，每帧宽度为整图宽），适合竖向长图、多行叠放。
 *
 * 若你的图是正方形但小图是**纵向叠放**，请显式设置 `layout: 'vertical'`。
 */
export function inferDefaultLayout(
  imageW: number,
  imageH: number,
  frameCount: number
): Layout {
  if (frameCount <= 1) return 'vertical'
  if (imageW >= imageH) return 'horizontal'
  return 'vertical'
}

/**
 * 根据整图尺寸与布局，将 N 帧等分为矩形（与 spritesName 顺序一致）。
 */
export function computeFrames(
  imageW: number,
  imageH: number,
  names: string[],
  layout: Layout | undefined
): SpriteFrames {
  const N = names.length
  if (N === 0) {
    throw new Error('[hyp-sprites-img] frames list is empty')
  }
  if (imageW <= 0 || imageH <= 0) {
    throw new Error('[hyp-sprites-img] invalid image dimensions')
  }

  const lay: Layout = layout ?? inferDefaultLayout(imageW, imageH, N)
  const out: SpriteFrames = {}

  if (lay === 'vertical') {
    for (let i = 0; i < N; i++) {
      const y0 = (i * imageH) / N
      const y1 = ((i + 1) * imageH) / N
      out[names[i]] = {
        x: 0,
        y: y0,
        width: imageW,
        height: y1 - y0,
      }
    }
    return out
  }

  if (lay === 'horizontal') {
    for (let i = 0; i < N; i++) {
      const x0 = (i * imageW) / N
      const x1 = ((i + 1) * imageW) / N
      out[names[i]] = {
        x: x0,
        y: 0,
        width: x1 - x0,
        height: imageH,
      }
    }
    return out
  }

  const { rows, cols } = lay
  if (rows < 1 || cols < 1) {
    throw new Error('[hyp-sprites-img] grid rows/cols must be >= 1')
  }
  if (rows * cols < N) {
    throw new Error(
      `[hyp-sprites-img] grid ${rows}x${cols} cannot hold ${N} frames`
    )
  }
  /** 先行后列：第 i 个在第 floor(i/cols) 行、第 i%cols 列；边界用比例避免累加误差 */
  for (let i = 0; i < N; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols
    const x0 = (col * imageW) / cols
    const x1 = ((col + 1) * imageW) / cols
    const y0 = (row * imageH) / rows
    const y1 = ((row + 1) * imageH) / rows
    out[names[i]] = {
      x: x0,
      y: y0,
      width: x1 - x0,
      height: y1 - y0,
    }
  }
  return out
}

/**
 * 从配置得到帧名列表：有 spritesName 用其长度；否则用 count 生成 "0".."n-1"。
 */
export function resolveFrameNames(input: SpriteGroupInput): string[] {
  if (input.spritesName != null && input.spritesName.length > 0) {
    return [...input.spritesName]
  }
  const count = input.count
  if (count == null || !Number.isFinite(count) || count < 1) {
    throw new Error(
      '[hyp-sprites-img] Provide `spritesName` (non-empty) or `count` (>= 1)'
    )
  }
  return Array.from({ length: Math.floor(count) }, (_, i) => String(i))
}

export function validateUniqueNames(groups: SpriteGroupInput[]): void {
  const seen = new Set<string>()
  for (const g of groups) {
    if (seen.has(g.name)) {
      throw new Error(`[hyp-sprites-img] duplicate sprite group name: "${g.name}"`)
    }
    seen.add(g.name)
  }
}
