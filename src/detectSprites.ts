import sharp from 'sharp'
import type { SpriteRect, SpriteFrames } from './manifest.js'

export interface DetectSpritesOptions {
  /** alpha > 阈值视为前景，默认 128 */
  alphaThreshold: number
  /** 面积小于此像素数的连通块丢弃，默认 4 */
  minRegionArea: number
  /**
   * 合并「同一帧内被缝隙拆开」的块：对前景二值图做 Chebyshev 半径 `k` 的膨胀后再做连通域，
   * 原前景像素按膨胀后的连通域聚成一块外接矩形。`0` 表示不膨胀（纯四连通）。
   * 例如两坨前景相隔 1 个透明像素时，通常需 `k >= 1` 才能并成一块。
   */
  detectMergeGap: number
}

const defaultDetect: DetectSpritesOptions = {
  alphaThreshold: 128,
  minRegionArea: 4,
  detectMergeGap: 0,
}

function mergeDetectOptions(
  partial?: Partial<DetectSpritesOptions>
): DetectSpritesOptions {
  const o = partial ?? {}
  return {
    alphaThreshold: o.alphaThreshold ?? defaultDetect.alphaThreshold,
    minRegionArea: o.minRegionArea ?? defaultDetect.minRegionArea,
    detectMergeGap: o.detectMergeGap ?? defaultDetect.detectMergeGap,
  }
}

/**
 * Chebyshev 半径 r 的形态学膨胀：dst[p]=1 当且仅当 src 在 p 的「正方形邻域」max(|dx|,|dy|)≤r 内存在 1。
 * r=0 时与 src 相同。
 */
export function dilateMaskChebyshev(
  src: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array {
  if (radius <= 0) {
    return Uint8Array.from(src)
  }
  const dst = new Uint8Array(src.length)
  const r = radius
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0
      for (let dy = -r; dy <= r && !v; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= height) continue
        const row = yy * width
        for (let dx = -r; dx <= r && !v; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= width) continue
          if (Math.max(Math.abs(dx), Math.abs(dy)) <= r && src[row + xx]) {
            v = 1
          }
        }
      }
      dst[y * width + x] = v
    }
  }
  return dst
}

/** 按连通域面积过滤：仅保留面积 >= minArea 的前景像素 */
function maskKeepLargeComponents(
  labels: Uint32Array,
  width: number,
  height: number,
  numLabels: number,
  minArea: number
): Uint8Array {
  const areas = new Uint32Array(numLabels + 1)
  const n = width * height
  for (let i = 0; i < n; i++) {
    const L = labels[i]!
    if (L) areas[L]++
  }
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const L = labels[i]!
    if (L && areas[L] >= minArea) {
      out[i] = 1
    }
  }
  return out
}

function collectBoxesByDilatedGroups(
  mClean: Uint8Array,
  dilatedLabels: Uint32Array,
  width: number,
  height: number
): BoundingBox[] {
  const n = width * height
  const map = new Map<number, BoundingBox>()
  for (let i = 0; i < n; i++) {
    if (!mClean[i]) continue
    const gid = dilatedLabels[i]!
    if (!gid) continue
    const x = i % width
    const y = (i / width) | 0
    const cur = map.get(gid)
    if (!cur) {
      map.set(gid, {
        minX: x,
        minY: y,
        maxX: x,
        maxY: y,
        area: 1,
      })
    } else {
      if (x < cur.minX) cur.minX = x
      if (y < cur.minY) cur.minY = y
      if (x > cur.maxX) cur.maxX = x
      if (y > cur.maxY) cur.maxY = y
      cur.area++
    }
  }
  return sortBoxesTopLeft([...map.values()])
}

/**
 * 用 sharp 解码整图并输出与 Canvas getImageData 等价的 RGBA 逐行缓冲。
 */
export async function loadRgbaFromFile(
  filePath: string
): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  if (info.channels !== 4) {
    throw new Error(
      `[hyp-sprites-img] detect: expected 4 channels (RGBA), got ${info.channels}`
    )
  }

  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(
      data.buffer,
      data.byteOffset,
      data.byteLength
    ),
  }
}

/** 前景 mask：1 为前景，0 为背景 */
export function buildForegroundMask(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number
): Uint8Array {
  const n = width * height
  const mask = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const a = rgba[i * 4 + 3]
    mask[i] = a > alphaThreshold ? 1 : 0
  }
  return mask
}

export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  area: number
}

/**
 * 四连通 flood fill：为每个连通域分配 1..numLabels。
 */
export function labelConnectedComponents(
  mask: Uint8Array,
  width: number,
  height: number
): { labels: Uint32Array; numLabels: number } {
  const n = width * height
  const labels = new Uint32Array(n)
  let label = 0
  const stack: number[] = []

  for (let i = 0; i < n; i++) {
    if (!mask[i] || labels[i]) continue
    label++
    stack.push(i)
    while (stack.length) {
      const cur = stack.pop()!
      if (!mask[cur] || labels[cur]) continue
      labels[cur] = label
      const x = cur % width
      const y = (cur / width) | 0
      if (x > 0) stack.push(cur - 1)
      if (x + 1 < width) stack.push(cur + 1)
      if (y > 0) stack.push(cur - width)
      if (y + 1 < height) stack.push(cur + width)
    }
  }

  return { labels, numLabels: label }
}

/** 先上后下、先左后右：按外接矩形左上角 (minY, minX) 排序 */
export function sortBoxesTopLeft(boxes: BoundingBox[]): BoundingBox[] {
  return [...boxes].sort((a, b) => {
    if (a.minY !== b.minY) return a.minY - b.minY
    return a.minX - b.minX
  })
}

function boxToSpriteRect(b: BoundingBox): SpriteRect {
  return {
    x: b.minX,
    y: b.minY,
    width: b.maxX - b.minX + 1,
    height: b.maxY - b.minY + 1,
  }
}

/**
 * 从 RGBA 缓冲检测连通域外接矩形，并按名称列表映射为 SpriteFrames。
 */
export function detectSpriteFramesFromRgba(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  names: string[],
  options?: Partial<DetectSpritesOptions>
): SpriteFrames {
  const opt = mergeDetectOptions(options)

  const mask = buildForegroundMask(rgba, width, height, opt.alphaThreshold)
  const { labels, numLabels } = labelConnectedComponents(mask, width, height)

  const mClean = maskKeepLargeComponents(
    labels,
    width,
    height,
    numLabels,
    opt.minRegionArea
  )

  const dilated = dilateMaskChebyshev(
    mClean,
    width,
    height,
    opt.detectMergeGap
  )
  const { labels: dilatedLabels } = labelConnectedComponents(
    dilated,
    width,
    height
  )

  const sorted = collectBoxesByDilatedGroups(
    mClean,
    dilatedLabels,
    width,
    height
  )

  if (names.length === 0) {
    if (sorted.length === 0) {
      throw new Error(
        '[hyp-sprites-img] detect: no foreground regions (after minRegionArea & merge)'
      )
    }
    const out: SpriteFrames = {}
    for (let i = 0; i < sorted.length; i++) {
      out[String(i)] = boxToSpriteRect(sorted[i]!)
    }
    return out
  }

  if (sorted.length < names.length) {
    throw new Error(
      `[hyp-sprites-img] detect: found ${sorted.length} region(s) (after minRegionArea & merge), need ${names.length} name(s). ` +
        `Try lowering alphaThreshold or minRegionArea, or raise detectMergeGap (Chebyshev dilation radius). ` +
        `If detectMergeGap is too large, separate sprites may merge — try lowering it. ` +
        `Or omit count/spritesName to use all detected regions.`
    )
  }

  const out: SpriteFrames = {}
  for (let i = 0; i < names.length; i++) {
    out[names[i]!] = boxToSpriteRect(sorted[i]!)
  }
  return out
}

export async function detectSpriteFramesFromFile(
  filePath: string,
  names: string[],
  options?: Partial<DetectSpritesOptions>
): Promise<{ width: number; height: number; frames: SpriteFrames }> {
  const { width, height, data } = await loadRgbaFromFile(filePath)
  const frames = detectSpriteFramesFromRgba(data, width, height, names, options)
  return { width, height, frames }
}
