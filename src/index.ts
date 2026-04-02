export {
  buildForegroundMask,
  detectSpriteFramesFromFile,
  detectSpriteFramesFromRgba,
  labelConnectedComponents,
  loadRgbaFromFile,
  sortBoxesTopLeft,
  type BoundingBox,
  type DetectSpritesOptions,
} from './detectSprites.js'

export {
  computeFrames,
  inferDefaultLayout,
  resolveFrameNames,
  validateUniqueNames,
  type Layout,
  type SpriteGroupInput,
  type SpriteRect,
  type SpriteFrames,
  type HypSpritesManifest,
} from './manifest.js'

export {
  hypSpritesImg,
  spriteUrlForDev,
  VIRTUAL_ID,
  RESOLVED_VIRTUAL_ID,
} from './vite-plugin.js'
export type { HypSpritesImgOptions, HypSpritesImgMeta } from './vite-plugin.js'
