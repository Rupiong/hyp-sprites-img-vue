import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const IMAGE_EXT = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'svg',
  'avif',
])

export function isRemoteSpriteUrl(url: string): boolean {
  const t = url.trim().toLowerCase()
  return t.startsWith('https://') || t.startsWith('http://')
}

function extFromUrl(urlStr: string): string | null {
  try {
    const u = new URL(urlStr)
    const base = path.basename(u.pathname)
    const m = base.match(/\.([a-zA-Z0-9]+)$/)
    if (m && IMAGE_EXT.has(m[1]!.toLowerCase())) {
      const e = m[1]!.toLowerCase()
      return e === 'jpeg' ? '.jpg' : `.${e}`
    }
  } catch {
    return null
  }
  return null
}

function extFromContentType(ct: string | null): string | null {
  if (!ct) return null
  const s = ct.split(';')[0]!.trim().toLowerCase()
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'image/avif': '.avif',
  }
  return map[s] ?? null
}

/** 已有缓存：`hash.xxx`；旧版无扩展名会迁移为 `hash.png`（否则 Vite 无法当资源解析） */
function findCachedFile(cacheDir: string, hash: string): string | null {
  const legacy = path.join(cacheDir, hash)
  if (fs.existsSync(legacy)) {
    const migrated = path.join(cacheDir, `${hash}.png`)
    if (!fs.existsSync(migrated)) {
      fs.copyFileSync(legacy, migrated)
      fs.unlinkSync(legacy)
    }
    return migrated
  }
  if (!fs.existsSync(cacheDir)) return null
  for (const name of fs.readdirSync(cacheDir)) {
    if (name.startsWith(`${hash}.`)) {
      return path.join(cacheDir, name)
    }
  }
  return null
}

/**
 * 将远程雪碧图缓存到 `root/node_modules/.cache/hyp-sprites-img/`。
 * 文件名：`sha256` + 扩展名（来自 URL、Content-Type，否则 `.png`），以便 Vite 对 `?url` 按静态资源处理。
 */
export async function ensureRemoteSpriteCached(
  remoteUrl: string,
  root: string
): Promise<string> {
  const trimmed = remoteUrl.trim()
  const hash = createHash('sha256').update(trimmed).digest('hex')
  const cacheDir = path.join(root, 'node_modules', '.cache', 'hyp-sprites-img')
  fs.mkdirSync(cacheDir, { recursive: true })

  const existing = findCachedFile(cacheDir, hash)
  if (existing) return existing

  const res = await fetch(trimmed)
  if (!res.ok) {
    throw new Error(
      `[hyp-sprites-img] Failed to fetch sprite url: ${trimmed} (${res.status} ${res.statusText})`
    )
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const ext =
    extFromUrl(trimmed) ??
    extFromContentType(res.headers.get('content-type')) ??
    '.png'
  const cacheFile = path.join(cacheDir, `${hash}${ext}`)
  fs.writeFileSync(cacheFile, buf)
  return cacheFile
}
