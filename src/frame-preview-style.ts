import type { SpriteRect } from './manifest.js'

function parsePx(v: string | number | undefined): number {
  if (v == null) return NaN
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = String(v).trim()
  if (s.endsWith('px')) return parseFloat(s)
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : NaN
}

/**
 * 与 `HypSpritesImg.vue` 中 `style` 计算一致：默认不传 width/height 时使用帧原始像素。
 */
export function computeFrameDisplaySize(
  fw: number,
  fh: number,
  width?: string | number,
  height?: string | number
): { cw: number; ch: number } {
  const hasW = width != null && width !== ''
  const hasH = height != null && height !== ''

  let cw: number
  let ch: number

  if (!hasW && !hasH) {
    cw = fw
    ch = fh
  } else if (hasW && !hasH) {
    cw = parsePx(width)
    if (!Number.isFinite(cw)) cw = fw
    ch = fh * (cw / fw)
  } else if (!hasW && hasH) {
    ch = parsePx(height)
    if (!Number.isFinite(ch)) ch = fh
    cw = fw * (ch / fh)
  } else {
    cw = parsePx(width)
    ch = parsePx(height)
    if (!Number.isFinite(cw)) cw = fw
    if (!Number.isFinite(ch)) ch = fh
  }

  return { cw, ch }
}

export function frameBackgroundInlineStyle(
  imageWidth: number,
  imageHeight: number,
  frame: SpriteRect,
  imageUrl: string,
  width?: string | number,
  height?: string | number
): Record<string, string> {
  const fw = frame.width
  const fh = frame.height
  const { cw, ch } = computeFrameDisplaySize(fw, fh, width, height)

  const scaleX = cw / fw
  const scaleY = ch / fh
  const bgW = imageWidth * scaleX
  const bgH = imageHeight * scaleY
  const posX = -frame.x * scaleX
  const posY = -frame.y * scaleY

  return {
    display: 'inline-block',
    'box-sizing': 'border-box',
    'line-height': '0',
    'font-size': '0',
    overflow: 'hidden',
    width: `${cw}px`,
    height: `${ch}px`,
    'background-image': `url(${imageUrl})`,
    'background-repeat': 'no-repeat',
    'background-origin': 'border-box',
    'background-clip': 'border-box',
    'background-size': `${bgW}px ${bgH}px`,
    'background-position': `${posX}px ${posY}px`,
    'vertical-align': 'middle',
  }
}

export function inlineStyleToCssString(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
}
