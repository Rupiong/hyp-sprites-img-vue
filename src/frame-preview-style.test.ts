import { describe, expect, it } from 'vitest'
import {
  computeFrameDisplaySize,
  frameBackgroundInlineStyle,
  inlineStyleToCssString,
} from './frame-preview-style.js'

describe('computeFrameDisplaySize', () => {
  it('matches default frame size when no width/height', () => {
    expect(computeFrameDisplaySize(32, 16)).toEqual({ cw: 32, ch: 16 })
  })

  it('scales height when only width given', () => {
    expect(computeFrameDisplaySize(32, 16, '64')).toEqual({ cw: 64, ch: 32 })
  })
})

describe('frameBackgroundInlineStyle', () => {
  it('matches HypSpritesImg default sizing for one frame', () => {
    const style = frameBackgroundInlineStyle(
      100,
      50,
      { x: 10, y: 5, width: 20, height: 15 },
      '/sprite.png'
    )
    expect(style.width).toBe('20px')
    expect(style.height).toBe('15px')
    expect(style['background-image']).toBe('url(/sprite.png)')
    expect(style['background-size']).toBe('100px 50px')
    expect(style['background-position']).toBe('-10px -5px')
  })
})

describe('inlineStyleToCssString', () => {
  it('joins entries with semicolons', () => {
    const s = inlineStyleToCssString({ width: '1px', height: '2px' })
    expect(s).toBe('width:1px;height:2px')
  })
})
