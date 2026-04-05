/** 与预览页「复制 Vue 组件代码」片段一致 */
export function vueSnippet(
  groupName: string,
  frameKey: string,
  posX: number,
  posY: number,
): string {
  return `<hypSpritesImgCom
  name="${groupName}"
  sprites-name="${frameKey}"
  :positionX="${posX}"
  :positionY="${posY}"
/>`;
}
