import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ensureRemoteSpriteCached,
  isRemoteSpriteUrl,
} from './remote-cache.js'

/** 1x1 PNG（可解码） */
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

describe('isRemoteSpriteUrl', () => {
  it('识别 http(s)', () => {
    expect(isRemoteSpriteUrl('https://a.com/x.png')).toBe(true)
    expect(isRemoteSpriteUrl('  http://127.0.0.1/p ')).toBe(true)
    expect(isRemoteSpriteUrl('/abs/local.png')).toBe(false)
    expect(isRemoteSpriteUrl('./rel.png')).toBe(false)
  })
})

describe('ensureRemoteSpriteCached', () => {
  let tmpRoot: string

  afterEach(() => {
    if (tmpRoot && fs.existsSync(tmpRoot)) {
      fs.rmSync(tmpRoot, { recursive: true, force: true })
    }
    vi.unstubAllGlobals()
  })

  it('拉取并写入缓存，再次命中不请求', async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hyp-remote-'))
    const url = 'https://example.com/sprite.png'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => {
        const ab = new ArrayBuffer(tinyPng.length)
        new Uint8Array(ab).set(tinyPng)
        return ab
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    const p1 = await ensureRemoteSpriteCached(url, tmpRoot)
    expect(fs.existsSync(p1)).toBe(true)
    expect(fs.readFileSync(p1).equals(tinyPng)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const p2 = await ensureRemoteSpriteCached(url, tmpRoot)
    expect(p2).toBe(p1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('旧版无扩展名缓存会迁移为 .png 并复用', async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hyp-remote-'))
    const url = 'https://example.com/sprite.png'
    const hash = createHash('sha256').update(url).digest('hex')
    const cacheDir = path.join(
      tmpRoot,
      'node_modules',
      '.cache',
      'hyp-sprites-img'
    )
    fs.mkdirSync(cacheDir, { recursive: true })
    const legacy = path.join(cacheDir, hash)
    fs.writeFileSync(legacy, tinyPng)

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const p = await ensureRemoteSpriteCached(url, tmpRoot)
    expect(p.endsWith('.png')).toBe(true)
    expect(fs.readFileSync(p).equals(tinyPng)).toBe(true)
    expect(fs.existsSync(legacy)).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('非 2xx 抛错', async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hyp-remote-'))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })
    )
    await expect(
      ensureRemoteSpriteCached('https://example.com/missing.png', tmpRoot)
    ).rejects.toThrow(/404/)
  })
})
