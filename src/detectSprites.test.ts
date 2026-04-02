import { describe, expect, it } from 'vitest'
import {
  buildForegroundMask,
  detectSpriteFramesFromRgba,
  labelConnectedComponents,
} from './detectSprites.js'

describe('labelConnectedComponents', () => {
  it('two separate 1x1 blobs get two labels', () => {
    const w = 5
    const h = 5
    const mask = new Uint8Array(w * h)
    mask[0] = 1
    mask[w * h - 1] = 1
    const { labels, numLabels } = labelConnectedComponents(mask, w, h)
    expect(numLabels).toBe(2)
    expect(labels[0]).toBe(1)
    expect(labels[w * h - 1]).toBe(2)
  })
})

describe('detectSpriteFramesFromRgba', () => {
  it('two horizontal opaque squares with gap', () => {
    const w = 10
    const h = 5
    const rgba = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < 3; x++) {
        const i = (y * w + x) * 4
        rgba[i + 3] = 255
      }
      for (let x = 6; x < 9; x++) {
        const i = (y * w + x) * 4
        rgba[i + 3] = 255
      }
    }
    const frames = detectSpriteFramesFromRgba(
      rgba,
      w,
      h,
      ['a', 'b'],
      { alphaThreshold: 128, minRegionArea: 1 }
    )
    expect(frames.a).toEqual({ x: 0, y: 0, width: 3, height: 5 })
    expect(frames.b).toEqual({ x: 6, y: 0, width: 3, height: 5 })
  })
})

describe('buildForegroundMask', () => {
  it('respects alpha threshold', () => {
    const rgba = new Uint8ClampedArray(4)
    rgba[3] = 100
    const m = buildForegroundMask(rgba, 1, 1, 128)
    expect(m[0]).toBe(0)
    rgba[3] = 200
    const m2 = buildForegroundMask(rgba, 1, 1, 128)
    expect(m2[0]).toBe(1)
  })
})
