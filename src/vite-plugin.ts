import fs from 'node:fs'
import path from 'node:path'
import { imageSize } from 'image-size'
import type { Plugin, ResolvedConfig } from 'vite'
import type { PluginContext } from 'rollup'
import { detectSpriteFramesFromFile } from './detectSprites.js'
import {
  computeFrames,
  resolveFrameNames,
  validateUniqueNames,
  type Layout,
  type SpriteGroupInput,
  type SpriteFrames,
} from './manifest.js'

export const VIRTUAL_ID = '\0virtual:hyp-sprites-img'
export const RESOLVED_VIRTUAL_ID = 'virtual:hyp-sprites-img'

export type HypSpritesImgOptions = SpriteGroupInput[]

function toImportPath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

function buildVirtualModule(
  groups: Array<{
    name: string
    importPath: string
    imageWidth: number
    imageHeight: number
    frames: SpriteFrames
  }>,
  defaultGroupName: string
): string {
  const imports = groups
    .map((g, i) => {
      const spec = `${g.importPath}?url`
      return `import _url${i} from ${JSON.stringify(spec)}`
    })
    .join('\n')

  const body = groups
    .map((g, i) => {
      return `  ${JSON.stringify(g.name)}: {
    imageWidth: ${g.imageWidth},
    imageHeight: ${g.imageHeight},
    frames: ${JSON.stringify(g.frames)},
    url: _url${i}
  }`
    })
    .join(',\n')

  return `${imports}
export const defaultGroupName = ${JSON.stringify(defaultGroupName)}
export const manifest = {
${body}
}
`
}

async function resolveSpriteFsPath(
  ctx: PluginContext,
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
  const resolved = await ctx.resolve(trimmed, importer)
  if (resolved?.id) {
    const id = resolved.id.split('?')[0]!
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

export function hypSpritesImg(
  options: HypSpritesImgOptions | (() => HypSpritesImgOptions)
): Plugin {
  let config: ResolvedConfig
  let lastDeps: string[] = []

  const getOptions = (): HypSpritesImgOptions =>
    typeof options === 'function' ? options() : options

  return {
    name: 'hyp-sprites-img',
    async configResolved(c) {
      config = c
    },
    resolveId(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        return VIRTUAL_ID
      }
      return undefined
    },
    async load(this: PluginContext, id) {
      if (id !== VIRTUAL_ID) {
        return undefined
      }

      const groups = getOptions()
      if (!groups.length) {
        throw new Error('[hyp-sprites-img] plugin options array is empty')
      }
      validateUniqueNames(groups)

      const root = config.root
      const built: Array<{
        name: string
        importPath: string
        imageWidth: number
        imageHeight: number
        frames: SpriteFrames
      }> = []

      const deps: string[] = []

      for (const g of groups) {
        const abs = await resolveSpriteFsPath(this, root, g.url)
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

      lastDeps = deps
      const defaultGroupName = groups[0]!.name
      return buildVirtualModule(built, defaultGroupName)
    },
    configureServer(server) {
      server.watcher.on('all', (_event, filePath) => {
        if (!lastDeps.length) return
        const norm = path.normalize(filePath)
        if (lastDeps.some((d) => path.normalize(d) === norm)) {
          const mod = server.moduleGraph.getModuleById(VIRTUAL_ID)
          if (mod) {
            server.moduleGraph.invalidateModule(mod)
          }
          server.ws.send({ type: 'full-reload', path: '*' })
        }
      })
    },
  }
}
