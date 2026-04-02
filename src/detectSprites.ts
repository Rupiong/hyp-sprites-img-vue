import sharp from 'sharp'
import type { SpriteRect, SpriteFrames } from './manifest.js'

export interface DetectSpritesOptions {
  /** alpha > 阈值视为前景，默认 128 */
  alphaThreshold: number
  /** 面积小于此像素数的连通块丢弃，默认 4 */
  minRegionArea: number
}

const defaultDetect: DetectSpritesOptions = {
  alphaThreshold: 128,
  minRegionArea: 4,
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

function bboxForLabel(
  labels: Uint32Array,
  width: number,
  height: number,
  labelId: number
): BoundingBox | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let area = 0
  const n = width * height
  for (let i = 0; i < n; i++) {
    if (labels[i] !== labelId) continue
    area++
    const x = i % width
    const y = (i / width) | 0
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  if (area === 0) return null
  return { minX, minY, maxX, maxY, area }
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
  const opt = { ...defaultDetect, ...options }
  if (names.length === 0) {
    throw new Error('[hyp-sprites-img] detect: names list is empty')
  }

  const mask = buildForegroundMask(rgba, width, height, opt.alphaThreshold)
  const { labels, numLabels } = labelConnectedComponents(mask, width, height)

  const boxes: BoundingBox[] = []
  for (let id = 1; id <= numLabels; id++) {
    const b = bboxForLabel(labels, width, height, id)
    if (!b || b.area < opt.minRegionArea) continue
    boxes.push(b)
  }

  const sorted = sortBoxesTopLeft(boxes)
  if (sorted.length < names.length) {
    throw new Error(
      `[hyp-sprites-img] detect: found ${sorted.length} region(s) (after minRegionArea), need ${names.length} name(s). Try lowering alphaThreshold or minRegionArea.`
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
