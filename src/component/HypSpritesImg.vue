<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { manifest, defaultGroupName } from 'virtual:hyp-sprites-img'

const props = withDefaults(
  defineProps<{
    /** 与 vite 配置中某组的 `name` 对应；不传则使用配置中的第一组 */
    name?: string
    /** 小图名称或 index 字符串（如 `"0"`）；不传则展示第一帧 */
    spritesName?: string
    width?: string | number
    height?: string | number
  }>(),
  {
    spritesName: '0',
  }
)

function parsePx(v: string | number | undefined): number {
  if (v == null) return NaN
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = String(v).trim()
  if (s.endsWith('px')) return parseFloat(s)
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : NaN
}

const groupName = computed(() => props.name ?? defaultGroupName)

const group = computed(() => {
  const m = manifest[groupName.value]
  if (!m) {
    console.warn(`[hyp-sprites-img] unknown group: ${groupName.value}`)
    return null
  }
  return m
})

const frame = computed(() => {
  const g = group.value
  if (!g) return null
  const f = g.frames[props.spritesName!]
  if (!f) {
    console.warn(
      `[hyp-sprites-img] unknown frame "${props.spritesName}" in group "${groupName.value}"`
    )
    return null
  }
  return f
})

const style = computed((): CSSProperties => {
  const g = group.value
  const fr = frame.value
  if (!g || !fr) {
    return {
      display: 'inline-block',
      width: '0',
      height: '0',
      overflow: 'hidden',
    }
  }

  const fw = fr.width
  const fh = fr.height
  const iw = g.imageWidth
  const ih = g.imageHeight

  const hasW = props.width != null && props.width !== ''
  const hasH = props.height != null && props.height !== ''

  let cw: number
  let ch: number

  if (!hasW && !hasH) {
    cw = fw
    ch = fh
  } else if (hasW && !hasH) {
    cw = parsePx(props.width)
    if (!Number.isFinite(cw)) cw = fw
    ch = fh * (cw / fw)
  } else if (!hasW && hasH) {
    ch = parsePx(props.height)
    if (!Number.isFinite(ch)) ch = fh
    cw = fw * (ch / fh)
  } else {
    cw = parsePx(props.width)
    ch = parsePx(props.height)
    if (!Number.isFinite(cw)) cw = fw
    if (!Number.isFinite(ch)) ch = fh
  }

  const scaleX = cw / fw
  const scaleY = ch / fh

  const bgW = iw * scaleX
  const bgH = ih * scaleY
  const posX = -fr.x * scaleX
  const posY = -fr.y * scaleY

  return {
    display: 'inline-block',
    boxSizing: 'border-box' as const,
    lineHeight: 0,
    fontSize: 0,
    overflow: 'hidden',
    width: `${cw}px`,
    height: `${ch}px`,
    backgroundImage: `url(${g.url})`,
    backgroundRepeat: 'no-repeat',
    backgroundOrigin: 'border-box',
    backgroundClip: 'border-box',
    backgroundSize: `${bgW}px ${bgH}px`,
    backgroundPosition: `${posX}px ${posY}px`,
    verticalAlign: 'middle',
  }
})
</script>

<template>
  <span class="hyp-sprites-img" :style="style" role="img" aria-hidden="true" />
</template>
