/**
 * Canvas 渲染工具
 *
 * 所有函数都是无状态的,只做绘制操作。
 * 不创建 Canvas,不管理资源,职责单一。
 */

import type { Rect } from './coordinates';

/**
 * 在指定矩形区域绘制图片(高质量)
 *
 * @param ctx Canvas 2D 上下文
 * @param image 图片源(HTMLImageElement | HTMLCanvasElement | ImageBitmap)
 * @param rect 目标矩形
 * @param options 可选配置
 */
export const drawImageInRect = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: Rect,
  options?: {
    smoothing?: boolean;     // 是否启用平滑(默认 true)
    quality?: 'low' | 'medium' | 'high'; // 平滑质量(默认 'high')
    blur?: number;            // 轻微模糊以减少锯齿(默认 0)
  }
): void => {
  const smoothing = options?.smoothing ?? true;
  const quality = options?.quality ?? 'high';
  const blur = options?.blur ?? 0;

  // 保存状态
  ctx.save();

  // 设置平滑
  ctx.imageSmoothingEnabled = smoothing;
  if (smoothing && 'imageSmoothingQuality' in ctx) {
    ctx.imageSmoothingQuality = quality;
  }

  // 应用模糊(如果需要)
  if (blur > 0 && 'filter' in ctx) {
    ctx.filter = `blur(${blur}px)`;
  }

  // 绘制
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);

  // 恢复状态
  ctx.restore();
};

/**
 * 绘制圆角矩形路径(不填充,不描边,只创建路径)
 *
 * @param ctx Canvas 2D 上下文
 * @param x 左上角 X
 * @param y 左上角 Y
 * @param width 宽度
 * @param height 高度
 * @param radius 圆角半径(可以是数字或 [左上,右上,右下,左下])
 */
export const createRoundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | [number, number, number, number]
): void => {
  const radii = typeof radius === 'number'
    ? [radius, radius, radius, radius]
    : radius;

  const [topLeft, topRight, bottomRight, bottomLeft] = radii;

  ctx.beginPath();
  ctx.moveTo(x + topLeft, y);
  ctx.lineTo(x + width - topRight, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + topRight);
  ctx.lineTo(x + width, y + height - bottomRight);
  ctx.quadraticCurveTo(x + width, y + height, x + width - bottomRight, y + height);
  ctx.lineTo(x + bottomLeft, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - bottomLeft);
  ctx.lineTo(x, y + topLeft);
  ctx.quadraticCurveTo(x, y, x + topLeft, y);
  ctx.closePath();
};

/**
 * 填充矩形区域(纯色)
 *
 * @param ctx Canvas 2D 上下文
 * @param rect 目标矩形
 * @param color 填充颜色
 */
export const fillRect = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  color: string
): void => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
};

/**
 * 清空矩形区域(透明)
 *
 * @param ctx Canvas 2D 上下文
 * @param rect 目标矩形
 */
export const clearRect = (
  ctx: CanvasRenderingContext2D,
  rect: Rect
): void => {
  ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
};

/**
 * 设置裁剪区域(矩形)
 *
 * @param ctx Canvas 2D 上下文
 * @param rect 裁剪矩形
 */
export const clipRect = (
  ctx: CanvasRenderingContext2D,
  rect: Rect
): void => {
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();
};

/**
 * 绘制文本(居中)
 *
 * @param ctx Canvas 2D 上下文
 * @param text 文本内容
 * @param x 中心点 X
 * @param y 中心点 Y (基线,不是真正的中心)
 * @param options 可选配置
 */
export const drawCenteredText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options?: {
    font?: string;
    color?: string;
    maxWidth?: number;
  }
): void => {
  ctx.save();

  if (options?.font) {
    ctx.font = options.font;
  }
  if (options?.color) {
    ctx.fillStyle = options.color;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (options?.maxWidth) {
    ctx.fillText(text, x, y, options.maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }

  ctx.restore();
};

/**
 * 应用全局 Alpha(透明度)
 *
 * @param ctx Canvas 2D 上下文
 * @param alpha 透明度(0~1)
 * @param drawFn 绘制函数(在此透明度下执行)
 */
export const withAlpha = (
  ctx: CanvasRenderingContext2D,
  alpha: number,
  drawFn: () => void
): void => {
  ctx.save();
  ctx.globalAlpha = alpha;
  drawFn();
  ctx.restore();
};

/**
 * 应用混合模式
 *
 * @param ctx Canvas 2D 上下文
 * @param mode 混合模式
 * @param drawFn 绘制函数(在此混合模式下执行)
 */
export const withCompositeOperation = (
  ctx: CanvasRenderingContext2D,
  mode: GlobalCompositeOperation,
  drawFn: () => void
): void => {
  ctx.save();
  ctx.globalCompositeOperation = mode;
  drawFn();
  ctx.restore();
};
