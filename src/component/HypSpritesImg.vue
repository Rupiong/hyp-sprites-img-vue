<script setup lang="ts">
import {
  computed,
  ref,
  watchEffect,
  useAttrs,
  type CSSProperties,
} from 'vue'
import { manifest, defaultGroupName } from 'virtual:hyp-sprites-img'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 与 vite 配置中某组的 `name` 对应；不传则使用配置中的第一组 */
    name?: string
    /** 小图名称或 index 字符串（如 `"0"`）；不传则展示第一帧 */
    spritesName?: string
    /** 支持 `px`、`数字` 或百分比（如 `100%`），百分比时随父元素尺寸变化 */
    width?: string | number
    height?: string | number
    /**
     * 覆盖 background-position 的 X（px）。不传则使用 manifest 计算出的坐标。
     * 用于雪碧图坐标与展示有偏差时手动微调。
     */
    positionX?: string | number
    /**
     * 覆盖 background-position 的 Y（px）。不传则使用 manifest 计算出的坐标。
     */
    positionY?: string | number
  }>(),
  {
    spritesName: '0',
  }
)

const attrs = useAttrs()

const restAttrs = computed(() => {
  const a = attrs as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(a)) {
    if (key !== 'class' && key !== 'style') out[key] = a[key]
  }
  return out
})

function parsePx(v: string | number | undefined): number {
  if (v == null) return NaN
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = String(v).trim()
  if (s.endsWith('%')) return NaN
  if (s.endsWith('px')) return parseFloat(s)
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : NaN
}

function isPercent(v: string | number | undefined): boolean {
  if (v == null || v === '') return false
  return String(v).trim().endsWith('%')
}

/** 未传 override 时用 computed；传了但解析失败则回退 computed */
function resolveBackgroundPos(
  override: string | number | undefined,
  computed: number
): number {
  if (override === undefined) return computed
  const v = parsePx(override)
  return Number.isFinite(v) ? v : computed
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

const elRef = ref<HTMLElement | null>(null)
/** 元素在布局后的像素宽高，用于百分比 width/height 与背景换算 */
const measured = ref({ w: 0, h: 0 })

const needsMeasure = computed(() => {
  const hasW = props.width != null && props.width !== ''
  const hasH = props.height != null && props.height !== ''
  return (
    (hasW && isPercent(props.width)) || (hasH && isPercent(props.height))
  )
})

watchEffect((onCleanup) => {
  if (!needsMeasure.value) return
  const el = elRef.value
  if (!el) return
  const sync = () => {
    measured.value = { w: el.offsetWidth, h: el.offsetHeight }
  }
  sync()
  const ro = new ResizeObserver(sync)
  ro.observe(el)
  onCleanup(() => ro.disconnect())
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
  const wPct = hasW && isPercent(props.width)
  const hPct = hasH && isPercent(props.height)

  const mw = measured.value.w
  const mh = measured.value.h

  let cw: number
  let ch: number

  if (!hasW && !hasH) {
    cw = fw
    ch = fh
  } else if (hasW && !hasH) {
    if (wPct) {
      cw = mw > 0 ? mw : fw
      ch = fh * (cw / fw)
    } else {
      cw = parsePx(props.width)
      if (!Number.isFinite(cw)) cw = fw
      ch = fh * (cw / fw)
    }
  } else if (!hasW && hasH) {
    if (hPct) {
      ch = mh > 0 ? mh : fh
      cw = fw * (ch / fh)
    } else {
      ch = parsePx(props.height)
      if (!Number.isFinite(ch)) ch = fh
      cw = fw * (ch / fh)
    }
  } else if (wPct && hPct) {
    cw = mw > 0 ? mw : fw
    ch = mh > 0 ? mh : fh
  } else if (wPct && !hPct) {
    cw = mw > 0 ? mw : fw
    ch = parsePx(props.height)
    if (!Number.isFinite(ch)) ch = fh * (cw / fw)
  } else if (!wPct && hPct) {
    ch = mh > 0 ? mh : fh
    cw = parsePx(props.width)
    if (!Number.isFinite(cw)) cw = fw * (ch / fh)
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
  const posX = resolveBackgroundPos(props.positionX, -fr.x * scaleX)
  const posY = resolveBackgroundPos(props.positionY, -fr.y * scaleY)

  const layout: CSSProperties = {
    display: 'inline-block',
    boxSizing: 'border-box',
    lineHeight: 0,
    fontSize: 0,
    overflow: 'hidden',
    verticalAlign: 'middle',
  }

  if (wPct) layout.width = String(props.width)
  else layout.width = `${cw}px`

  if (hPct) layout.height = String(props.height)
  else layout.height = `${ch}px`

  return {
    ...layout,
    backgroundImage: `url(${g.url})`,
    backgroundRepeat: 'no-repeat',
    backgroundOrigin: 'border-box',
    backgroundClip: 'border-box',
    backgroundSize: `${bgW}px ${bgH}px`,
    backgroundPosition: `${posX}px ${posY}px`,
  }
})

/** 组件内部样式在前，透传的 style 在后以便覆盖 width/height 等 */
const mergedStyle = computed(() => {
  const user = attrs.style
  if (!user) return style.value
  return [style.value, user]
})
</script>

<template>
  <span
    ref="elRef"
    class="hyp-sprites-img"
    :class="attrs.class"
    :style="mergedStyle"
    role="img"
    aria-hidden="true"
    v-bind="restAttrs"
  />
</template>
