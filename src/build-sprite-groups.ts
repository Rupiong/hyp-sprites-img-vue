import fs from 'node:fs'
import path from 'node:path'
import { imageSize } from 'image-size'
import { detectSpriteFramesFromFile } from './detectSprites.js'
import {
  computeFrames,
  resolveFrameNames,
  validateUniqueNames,
  type Layout,
  type SpriteGroupInput,
  type SpriteFrames,
} from './manifest.js'

export type BuiltSpriteGroup = {
  name: string
  importPath: string
  imageWidth: number
  imageHeight: number
  frames: SpriteFrames
}

/** 与 Rollup `resolve` / Vite `resolveId`（PartialResolvedId）兼容 */
export type ResolveSpriteUrlFn = (
  source: string,
  importer?: string
) => Promise<unknown>

function toImportPath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

function resolvedIdFrom(resolved: unknown): string | null {
  if (resolved == null) return null
  if (typeof resolved === 'string') return resolved.split('?')[0]!
  if (typeof resolved === 'object' && resolved !== null && 'id' in resolved) {
    const id = String((resolved as { id: string }).id).split('?')[0]!
    return id
  }
  return null
}

async function resolveSpriteFsPath(
  resolve: ResolveSpriteUrlFn,
  root: string,
  url: string
): Promise<string> {
  const trimmed = url.trim()
  const noQuery = trimmed.split('?')[0]!

  if (path.isAbsolute(noQuery) && fs.existsSync(noQuery)) {
    return noQuery
  }

  const fromRoot = path.resolve(root, noQuery)
  if (fs.existsSync(fromRoot)) {
    return fromRoot
  }

  const importer = fs.existsSync(path.join(root, 'index.html'))
    ? path.join(root, 'index.html')
    : path.join(root, 'package.json')
  const resolved = await resolve(trimmed, importer)
  const id = resolvedIdFrom(resolved)
  if (id) {
    if (id.startsWith('\0')) {
      throw new Error(
        `[hyp-sprites-img] Resolved to virtual id for url: ${JSON.stringify(url)}`
      )
    }
    return id
  }

  throw new Error(
    `[hyp-sprites-img] Cannot resolve sprite url: ${JSON.stringify(url)}`
  )
}

export async function buildSpriteGroups(
  resolve: ResolveSpriteUrlFn,
  root: string,
  groups: SpriteGroupInput[]
): Promise<{
  built: BuiltSpriteGroup[]
  deps: string[]
  defaultGroupName: string
}> {
  if (!groups.length) {
    throw new Error('[hyp-sprites-img] plugin options array is empty')
  }
  validateUniqueNames(groups)

  const built: BuiltSpriteGroup[] = []
  const deps: string[] = []

  for (const g of groups) {
    const abs = await resolveSpriteFsPath(resolve, root, g.url)
    deps.push(abs)

    const names = resolveFrameNames(g)

    let imageWidth: number
    let imageHeight: number
    let frames: SpriteFrames

    if (g.detect) {
      const d = await detectSpriteFramesFromFile(abs, names, {
        alphaThreshold: g.alphaThreshold,
        minRegionArea: g.minRegionArea,
      })
      imageWidth = d.width
      imageHeight = d.height
      frames = d.frames
    } else {
      const buf = fs.readFileSync(abs)
      const dim = imageSize(buf)
      if (!dim.width || !dim.height) {
        throw new Error(`[hyp-sprites-img] Cannot read dimensions: ${abs}`)
      }
      imageWidth = dim.width
      imageHeight = dim.height
      frames = computeFrames(
        dim.width,
        dim.height,
        names,
        g.layout as Layout | undefined
      )
    }

    built.push({
      name: g.name,
      importPath: toImportPath(abs),
      imageWidth,
      imageHeight,
      frames,
    })
  }

  return {
    built,
    deps,
    defaultGroupName: groups[0]!.name,
  }
}
