/**
 * Canvas 坐标计算工具
 *
 * 所有函数都是纯函数,无副作用,容易测试。
 * 坐标计算与 Canvas 绘制分离,符合单一职责原则。
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 计算图片适配到目标区域的位置和大小
 *
 * @param imageWidth 图片原始宽度
 * @param imageHeight 图片原始高度
 * @param targetWidth 目标区域宽度
 * @param targetHeight 目标区域高度
 * @param mode 'contain' = 完整显示,留白; 'cover' = 填满,裁剪
 * @returns 图片在目标区域的位置和大小
 */
export const calculateFitRect = (
  imageWidth: number,
  imageHeight: number,
  targetWidth: number,
  targetHeight: number,
  mode: 'contain' | 'cover' = 'contain'
): Rect => {
  const imageRatio = imageWidth / imageHeight;
  const targetRatio = targetWidth / targetHeight;

  let width: number;
  let height: number;

  if (mode === 'contain') {
    // 完整显示 - 长边适配
    if (imageRatio > targetRatio) {
      width = targetWidth;
      height = targetWidth / imageRatio;
    } else {
      height = targetHeight;
      width = targetHeight * imageRatio;
    }
  } else {
    // 填满 - 短边适配
    if (imageRatio > targetRatio) {
      height = targetHeight;
      width = targetHeight * imageRatio;
    } else {
      width = targetWidth;
      height = targetWidth / imageRatio;
    }
  }

  // 居中
  const x = (targetWidth - width) / 2;
  const y = (targetHeight - height) / 2;

  return { x, y, width, height };
};

/**
 * 计算居中位置
 *
 * @param contentSize 内容大小(宽或高)
 * @param containerSize 容器大小(宽或高)
 * @returns 居中偏移量
 */
export const calculateCenterOffset = (
  contentSize: number,
  containerSize: number
): number => {
  return (containerSize - contentSize) / 2;
};

/**
 * 计算缩放比例(保持宽高比)
 *
 * @param sourceWidth 源宽度
 * @param sourceHeight 源高度
 * @param targetWidth 目标宽度
 * @param targetHeight 目标高度
 * @param mode 'fit' = 完整显示; 'fill' = 填满
 * @returns 缩放比例
 */
export const calculateScale = (
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  mode: 'fit' | 'fill' = 'fit'
): number => {
  const scaleX = targetWidth / sourceWidth;
  const scaleY = targetHeight / sourceHeight;

  return mode === 'fit'
    ? Math.min(scaleX, scaleY)
    : Math.max(scaleX, scaleY);
};

/**
 * 将相对坐标(0~1)转换为绝对坐标(像素)
 *
 * @param relativeRect 相对坐标(0~1)
 * @param containerWidth 容器宽度
 * @param containerHeight 容器高度
 * @returns 绝对坐标(像素)
 */
export const relativeToAbsolute = (
  relativeRect: Rect,
  containerWidth: number,
  containerHeight: number
): Rect => {
  return {
    x: relativeRect.x * containerWidth,
    y: relativeRect.y * containerHeight,
    width: relativeRect.width * containerWidth,
    height: relativeRect.height * containerHeight,
  };
};

/**
 * 将绝对坐标(像素)转换为相对坐标(0~1)
 *
 * @param absoluteRect 绝对坐标(像素)
 * @param containerWidth 容器宽度
 * @param containerHeight 容器高度
 * @returns 相对坐标(0~1)
 */
export const absoluteToRelative = (
  absoluteRect: Rect,
  containerWidth: number,
  containerHeight: number
): Rect => {
  return {
    x: absoluteRect.x / containerWidth,
    y: absoluteRect.y / containerHeight,
    width: absoluteRect.width / containerWidth,
    height: absoluteRect.height / containerHeight,
  };
};

/**
 * 限制矩形在边界内
 *
 * @param rect 要限制的矩形
 * @param minX 最小 X
 * @param minY 最小 Y
 * @param maxX 最大 X
 * @param maxY 最大 Y
 * @returns 限制后的矩形
 */
export const clampRect = (
  rect: Rect,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): Rect => {
  const x = Math.max(minX, Math.min(rect.x, maxX - rect.width));
  const y = Math.max(minY, Math.min(rect.y, maxY - rect.height));
  const width = Math.min(rect.width, maxX - x);
  const height = Math.min(rect.height, maxY - y);

  return { x, y, width, height };
};
