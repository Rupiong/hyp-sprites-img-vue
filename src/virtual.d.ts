declare module 'virtual:hyp-sprites-img' {
  export interface HypSpriteRect {
    x: number
    y: number
    width: number
    height: number
  }

  export const defaultGroupName: string
  export const manifest: Record<
    string,
    {
      imageWidth: number
      imageHeight: number
      url: string
      frames: Record<string, HypSpriteRect>
    }
  >
}
