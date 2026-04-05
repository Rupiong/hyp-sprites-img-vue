/** 预览页单帧（与 buildPreviewSections 输出一致） */
export type PreviewSectionItem = {
  frameKey: string;
  styleAttr: string;
  defaultPosX: number;
  defaultPosY: number;
};

export type PreviewSection = {
  name: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  items: PreviewSectionItem[];
};
