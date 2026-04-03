import { describe, expect, it } from 'vitest'
import {
  buildForegroundMask,
  detectSpriteFramesFromRgba,
  dilateMaskChebyshev,
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
  it('empty names returns all regions as "0","1",…', () => {
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
    const frames = detectSpriteFramesFromRgba(rgba, w, h, [], {
      alphaThreshold: 128,
      minRegionArea: 1,
    })
    expect(Object.keys(frames).sort()).toEqual(['0', '1'])
    expect(frames['0']).toEqual({ x: 0, y: 0, width: 3, height: 5 })
    expect(frames['1']).toEqual({ x: 6, y: 0, width: 3, height: 5 })
  })

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

  it('detectMergeGap 1 merges two blobs separated by 1 transparent pixel', () => {
    const w = 5
    const h = 3
    const rgba = new Uint8ClampedArray(w * h * 4)
    for (const x of [0, 1, 3, 4]) {
      const i = (1 * w + x) * 4
      rgba[i + 3] = 255
    }
    const frames = detectSpriteFramesFromRgba(rgba, w, h, ['a'], {
      alphaThreshold: 128,
      minRegionArea: 1,
      detectMergeGap: 1,
    })
    expect(frames.a).toEqual({ x: 0, y: 1, width: 5, height: 1 })
  })

  it('detectMergeGap 0 keeps two blobs as two frames', () => {
    const w = 5
    const h = 3
    const rgba = new Uint8ClampedArray(w * h * 4)
    for (const x of [0, 1, 3, 4]) {
      const i = (1 * w + x) * 4
      rgba[i + 3] = 255
    }
    const frames = detectSpriteFramesFromRgba(rgba, w, h, ['left', 'right'], {
      alphaThreshold: 128,
      minRegionArea: 1,
      detectMergeGap: 0,
    })
    expect(frames.left).toEqual({ x: 0, y: 1, width: 2, height: 1 })
    expect(frames.right).toEqual({ x: 3, y: 1, width: 2, height: 1 })
  })
})

describe('dilateMaskChebyshev', () => {
  it('radius 0 copies mask', () => {
    const m = new Uint8Array([1, 0, 0, 0, 1])
    const d = dilateMaskChebyshev(m, 5, 1, 0)
    expect([...d]).toEqual([...m])
  })

  it('radius 1 bridges one-pixel gap between two adjacent runs', () => {
    const w = 5
    const m = new Uint8Array(w)
    m[0] = 1
    m[2] = 1
    const d = dilateMaskChebyshev(m, w, 1, 1)
    expect(d[1]).toBe(1)
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
