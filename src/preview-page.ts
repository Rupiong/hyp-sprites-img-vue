import {
  frameBackgroundInlineStyle,
  inlineStyleToCssString,
} from "./frame-preview-style.js";
import type { BuiltSpriteGroup } from "./build-sprite-groups.js";
import { resolveFrameNames } from "./manifest.js";
import type { SpriteGroupInput } from "./manifest.js";
import type { PreviewSection, PreviewSectionItem } from "./preview/preview-types.js";

export type { PreviewSection, PreviewSectionItem };

export type PreviewPageGroupInput = {
  config: SpriteGroupInput;
  built: BuiltSpriteGroup;
  /** 浏览器可请求的整图 URL（相对或绝对） */
  imageUrl: string;
};

export function buildPreviewSections(
  groups: PreviewPageGroupInput[],
): PreviewSection[] {
  const sections: PreviewSection[] = [];

  for (const { config, built, imageUrl } of groups) {
    const order = resolveFrameNames(config, built);
    const items: PreviewSection["items"] = [];
    for (const frameKey of order) {
      const rect = built.frames[frameKey];
      if (!rect) continue;
      const style = frameBackgroundInlineStyle(
        built.imageWidth,
        built.imageHeight,
        rect,
        imageUrl,
      );
      /** 与组件不传 width/height 时一致：scale=1 → background-position 为 -x、-y（px） */
      const defaultPosX = -rect.x;
      const defaultPosY = -rect.y;
      items.push({
        frameKey,
        styleAttr: inlineStyleToCssString(style),
        defaultPosX,
        defaultPosY,
      });
    }
    sections.push({
      name: built.name,
      imageUrl,
      imageWidth: built.imageWidth,
      imageHeight: built.imageHeight,
      items,
    });
  }

  return sections;
}
