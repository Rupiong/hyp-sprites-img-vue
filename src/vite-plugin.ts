import http from 'node:http'
import path from 'node:path'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import type { PluginContext } from 'rollup'
import {
  buildSpriteGroups,
  type BuiltSpriteGroup,
  type ResolveSpriteUrlFn,
} from './build-sprite-groups.js'
import { isRemoteSpriteUrl } from './remote-cache.js'
import {
  buildPreviewSections,
  renderPreviewHtml,
  type PreviewPageGroupInput,
} from './preview-page.js'
import type { SpriteGroupInput } from './manifest.js'

export const VIRTUAL_ID = '\0virtual:hyp-sprites-img'
export const RESOLVED_VIRTUAL_ID = 'virtual:hyp-sprites-img'

export type HypSpritesImgOptions = SpriteGroupInput[]

const DEFAULT_PREVIEW_PATH = '/__hyp-sprites-img-preview'

export type HypSpritesImgMeta = {
  /**
   * 开发服务器上的雪碧图帧预览。默认关闭。
   * - `true`：启用，路径为 `/__hyp-sprites-img-preview`
   * - 对象：可自定义 `path`、`port`（独立端口，整图仍从主 dev 加载）
   */
  preview?:
    | boolean
    | {
        /** 默认 `/__hyp-sprites-img-preview` */
        path?: string
        /** 若设置，在此端口额外提供同一预览页（需主 dev 已启动以加载图片） */
        port?: number
      }
}

function normalizePreviewMeta(
  meta: HypSpritesImgMeta | undefined
): {
  enabled: boolean
  path: string
  port?: number
} {
  if (meta?.preview == null || meta.preview === false) {
    return { enabled: false, path: DEFAULT_PREVIEW_PATH }
  }
  if (meta.preview === true) {
    return { enabled: true, path: DEFAULT_PREVIEW_PATH }
  }
  return {
    enabled: true,
    path: meta.preview.path ?? DEFAULT_PREVIEW_PATH,
    port: meta.preview.port,
  }
}

function normalizeBasePath(base: string): string {
  if (!base || base === '/') return ''
  return base.endsWith('/') ? base.slice(0, -1) : base
}

/** 与 Vite `req.url`（base 前缀未剥离时）及日志 URL 一致 */
function previewPathWithBase(base: string, previewPath: string): string {
  const p = previewPath.startsWith('/') ? previewPath : `/${previewPath}`
  const b = normalizeBasePath(base)
  if (!b) return p
  return `${b}${p}`.replace(/\/+/g, '/')
}

/** 开发态浏览器可请求的整图路径；若雪碧图在项目根外则返回 null */
export function spriteUrlForDev(options: {
  root: string
  absPath: string
  base: string
  /** 独立预览端口时使用，例如 http://127.0.0.1:5179 */
  origin?: string
}): string | null {
  const { root, absPath, base, origin } = options
  const rel = path.relative(root, absPath)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return null
  }
  const posix = rel.split(path.sep).join('/')
  const b = normalizeBasePath(base)
  const pathPart = b ? `${b}/${posix}` : `/${posix}`
  const normalized = pathPart.replace(/\/+/g, '/')
  if (origin) {
    return `${origin.replace(/\/$/, '')}${normalized}`
  }
  return normalized
}

function buildVirtualModule(
  built: BuiltSpriteGroup[],
  inputs: SpriteGroupInput[],
  defaultGroupName: string
): string {
  if (built.length !== inputs.length) {
    throw new Error('[hyp-sprites-img] internal: sprite groups length mismatch')
  }

  const importLines: string[] = []
  let localImportIndex = 0
  const urlExprs: string[] = []

  for (let i = 0; i < built.length; i++) {
    const b = built[i]!
    const cfg = inputs[i]!
    const trimmed = cfg.url.trim()
    if (isRemoteSpriteUrl(trimmed)) {
      urlExprs.push(JSON.stringify(trimmed))
    } else {
      const spec = `${b.importPath}?url`
      importLines.push(
        `import _url${localImportIndex} from ${JSON.stringify(spec)}`
      )
      urlExprs.push(`_url${localImportIndex}`)
      localImportIndex += 1
    }
  }

  const imports = importLines.join('\n')
  const importBlock = imports ? `${imports}\n` : ''

  const body = built
    .map((g, i) => {
      return `  ${JSON.stringify(g.name)}: {
    imageWidth: ${g.imageWidth},
    imageHeight: ${g.imageHeight},
    frames: ${JSON.stringify(g.frames)},
    url: ${urlExprs[i]}
  }`
    })
    .join(',\n')

  return `${importBlock}export const defaultGroupName = ${JSON.stringify(defaultGroupName)}
export const manifest = {
${body}
}
`
}

function createServerResolve(server: ViteDevServer): ResolveSpriteUrlFn {
  return async function resolve(source, importer) {
    return server.pluginContainer.resolveId(
      source,
      importer ?? undefined
    )
  }
}

function previewUrlForLog(
  server: ViteDevServer,
  previewPath: string
): string {
  const cfg = server.config
  const pathname = previewPathWithBase(cfg.base, previewPath)
  const addr = server.httpServer?.address()
  const port =
    addr && typeof addr === 'object' && 'port' in addr
      ? (addr as { port: number }).port
      : cfg.server.port ?? 5173
  const protocol = cfg.server.https ? 'https' : 'http'
  const host =
    cfg.server.host === true || cfg.server.host === '0.0.0.0'
      ? 'localhost'
      : (cfg.server.host as string) || 'localhost'
  return `${protocol}://${host}:${port}${pathname}`
}

export function hypSpritesImg(
  options: HypSpritesImgOptions | (() => HypSpritesImgOptions),
  meta?: HypSpritesImgMeta
): Plugin {
  let config: ResolvedConfig
  let lastDeps: string[] = []
  let previewHtmlCache: string | null = null
  let previewCacheKey = ''

  const getOptions = (): HypSpritesImgOptions =>
    typeof options === 'function' ? options() : options

  const previewCfg = normalizePreviewMeta(meta)

  return {
    name: 'hyp-sprites-img',
    config() {
      return {
        optimizeDeps: {
          // 避免预构建时固化错误的 virtual 模块；子路径也需排除
          exclude: ['hyp-sprites-img', 'hyp-sprites-img/vue'],
        },
      }
    },
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
      const { built, deps, defaultGroupName } = await buildSpriteGroups(
        this.resolve.bind(this) as ResolveSpriteUrlFn,
        config.root,
        groups
      )

      lastDeps = deps
      previewHtmlCache = null
      return buildVirtualModule(built, groups, defaultGroupName)
    },
    configureServer(server) {
      let previewServer: http.Server | undefined

      const invalidatePreviewCache = () => {
        previewHtmlCache = null
        previewCacheKey = ''
      }

      server.watcher.on('all', (_event, filePath) => {
        if (!lastDeps.length) return
        const norm = path.normalize(filePath)
        if (lastDeps.some((d) => path.normalize(d) === norm)) {
          invalidatePreviewCache()
          const mod = server.moduleGraph.getModuleById(VIRTUAL_ID)
          if (mod) {
            server.moduleGraph.invalidateModule(mod)
          }
          server.ws.send({ type: 'full-reload', path: '*' })
        }
      })

      if (!previewCfg.enabled) {
        return
      }

      const previewPathRel = previewCfg.path.startsWith('/')
        ? previewCfg.path
        : `/${previewCfg.path}`
      const previewPathFull = previewPathWithBase(config.base, previewPathRel)

      async function renderPreviewHtmlForServer(
        assetOrigin?: string
      ): Promise<string> {
        const groups = getOptions()
        const resolve = createServerResolve(server)
        const { built, deps } = await buildSpriteGroups(
          resolve,
          config.root,
          groups
        )
        lastDeps = deps
        const key = `${deps.join('|')}|${assetOrigin ?? ''}|${config.base}`
        if (previewHtmlCache && previewCacheKey === key) {
          return previewHtmlCache
        }

        const pageInputs: PreviewPageGroupInput[] = []
        for (let i = 0; i < groups.length; i++) {
          const g = groups[i]!
          const b = built[i]!
          let imageUrl: string
          if (isRemoteSpriteUrl(g.url.trim())) {
            imageUrl = g.url.trim()
          } else {
            const absFs = path.resolve(b.importPath)
            const u = spriteUrlForDev({
              root: config.root,
              absPath: absFs,
              base: config.base,
              origin: assetOrigin,
            })
            if (u == null) {
              throw new Error(
                `[hyp-sprites-img] preview: sprite file is outside project root: ${absFs}`
              )
            }
            imageUrl = u
          }
          pageInputs.push({ config: g, built: b, imageUrl })
        }

        const sections = buildPreviewSections(pageInputs)
        const html = renderPreviewHtml(sections)
        previewHtmlCache = html
        previewCacheKey = key
        return html
      }

      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (req.method !== 'GET' || url !== previewPathFull) {
          return next()
        }
        void (async () => {
          try {
            const html = await renderPreviewHtmlForServer()
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(html)
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(
              e instanceof Error ? e.message : '[hyp-sprites-img] preview error'
            )
          }
        })()
      })

      const logPreview = () => {
        try {
          const u = previewUrlForLog(server, previewPathRel)
          console.log(`[hyp-sprites-img] 雪碧图预览: ${u}`)
        } catch {
          // ignore
        }
      }

      server.httpServer?.once('listening', () => {
        logPreview()

        const port = previewCfg.port
        if (port == null || !Number.isFinite(port)) {
          return
        }

        const addr = server.httpServer?.address()
        const mainPort =
          addr && typeof addr === 'object' && 'port' in addr
            ? (addr as { port: number }).port
            : server.config.server.port ?? 5173
        const protocol = server.config.server.https ? 'https' : 'http'
        const origin = `${protocol}://127.0.0.1:${mainPort}`

        previewServer = http.createServer((req, res) => {
          if (req.method !== 'GET' || req.url?.split('?')[0] !== '/') {
            res.statusCode = 404
            res.end()
            return
          }
          void (async () => {
            try {
              const html = await renderPreviewHtmlForServer(origin)
              res.statusCode = 200
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end(html)
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'text/plain; charset=utf-8')
              res.end(
                e instanceof Error
                  ? e.message
                  : '[hyp-sprites-img] preview error'
              )
            }
          })()
        })

        previewServer.listen(port, () => {
          console.log(
            `[hyp-sprites-img] 雪碧图预览（独立端口）: ${protocol}://127.0.0.1:${port}/`
          )
        })

        server.httpServer?.on('close', () => {
          previewServer?.close()
        })
      })
    },
  }
}
