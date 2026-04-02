import { describe, expect, it } from 'vitest'
import {
  computeFrames,
  inferDefaultLayout,
  resolveFrameNames,
} from './manifest.js'

describe('computeFrames', () => {
  it('vertical equal split', () => {
    const f = computeFrames(100, 200, ['a', 'b'], 'vertical')
    expect(f.a).toEqual({ x: 0, y: 0, width: 100, height: 100 })
    expect(f.b).toEqual({ x: 0, y: 100, width: 100, height: 100 })
  })

  it('horizontal equal split', () => {
    const f = computeFrames(200, 100, ['x', 'y'], 'horizontal')
    expect(f.x).toEqual({ x: 0, y: 0, width: 100, height: 100 })
    expect(f.y).toEqual({ x: 100, y: 0, width: 100, height: 100 })
  })

  it('grid row-major', () => {
    const f = computeFrames(
      200,
      200,
      ['a', 'b', 'c', 'd'],
      { type: 'grid', rows: 2, cols: 2 }
    )
    expect(f.a).toEqual({ x: 0, y: 0, width: 100, height: 100 })
    expect(f.b).toEqual({ x: 100, y: 0, width: 100, height: 100 })
    expect(f.c).toEqual({ x: 0, y: 100, width: 100, height: 100 })
    expect(f.d).toEqual({ x: 100, y: 100, width: 100, height: 100 })
  })

  it('infers horizontal for square when layout omitted', () => {
    const f = computeFrames(100, 100, ['a', 'b', 'c'], undefined)
    expect(f.a).toBeDefined()
    expect(f.a!.width).toBeCloseTo(100 / 3, 5)
    expect(f.a!.height).toBe(100)
  })
})

describe('inferDefaultLayout', () => {
  it('square or landscape uses horizontal', () => {
    expect(inferDefaultLayout(1000, 1000, 3)).toBe('horizontal')
    expect(inferDefaultLayout(200, 100, 2)).toBe('horizontal')
  })

  it('portrait uses vertical', () => {
    expect(inferDefaultLayout(100, 300, 3)).toBe('vertical')
  })

  it('single frame is vertical', () => {
    expect(inferDefaultLayout(100, 100, 1)).toBe('vertical')
  })
})

describe('resolveFrameNames', () => {
  it('uses spritesName when provided', () => {
    expect(
      resolveFrameNames({
        url: 'x',
        name: 'g',
        spritesName: ['one', 'two'],
      })
    ).toEqual(['one', 'two'])
  })

  it('uses count for index names', () => {
    expect(
      resolveFrameNames({
        url: 'x',
        name: 'g',
        count: 3,
      })
    ).toEqual(['0', '1', '2'])
  })
})
