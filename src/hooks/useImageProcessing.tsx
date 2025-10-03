import { useState, useCallback } from 'react';
import { ProcessedImage, ServiceSelection, DeviceImages, RepairService } from '@/types/repair';
import { toast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { ALL_SERVICES } from '@/data/services';
import { useObjectURLs } from '@/hooks/useObjectURLs';

const OUTPUT_SIZE = 800;

export interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NormalizedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const canvasToObjectUrl = (
  canvas: HTMLCanvasElement,
  createURL: (blob: Blob) => string
): Promise<string> => {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(createURL(blob));
      } else {
        resolve(canvas.toDataURL('image/png'));
      }
    }, 'image/png');
  });
};

// Feather the alpha channel inside a ROI with a tiny blur and a slight boost.
// This preserves soft edges while sealing tiny pinholes from imperfect cutouts.
const featherAlpha = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 1,
  boost: number = 1.05
) => {
  if (w <= 0 || h <= 0) return;
  const img = ctx.getImageData(x, y, w, h);
  const data = img.data;

  const src = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) src[i] = data[i * 4 + 3];

  // Separable box blur on alpha channel
  const tmp = new Float32Array(w * h);
  const dst = new Float32Array(w * h);
  const win = radius * 2 + 1;
  const norm = 1 / win;

  // Horizontal pass (sliding window)
  for (let yy = 0; yy < h; yy++) {
    let acc = 0;
    let base = yy * w;
    for (let k = -radius; k <= radius; k++) {
      const xx = Math.min(w - 1, Math.max(0, k));
      acc += src[base + xx];
    }
    for (let xx = 0; xx < w; xx++) {
      tmp[base + xx] = acc * norm;
      const xOut = xx - radius;
      const xIn = xx + radius + 1;
      acc -= src[base + (xOut >= 0 ? xOut : 0)];
      acc += src[base + (xIn < w ? xIn : w - 1)];
    }
  }

  // Vertical pass (sliding window)
  for (let xx = 0; xx < w; xx++) {
    let acc = 0;
    for (let k = -radius; k <= radius; k++) {
      const yy = Math.min(h - 1, Math.max(0, k));
      acc += tmp[yy * w + xx];
    }
    for (let yy = 0; yy < h; yy++) {
      dst[yy * w + xx] = acc * norm;
      const yOut = yy - radius;
      const yIn = yy + radius + 1;
      acc -= tmp[(yOut >= 0 ? yOut : 0) * w + xx];
      acc += tmp[(yIn < h ? yIn : h - 1) * w + xx];
    }
  }

  for (let i = 0; i < w * h; i++) {
    const a = Math.min(255, Math.max(0, Math.round(dst[i] * boost)));
    data[i * 4 + 3] = a;
  }

  ctx.putImageData(img, x, y);
};

interface DetectContentBoundsOptions {
  alphaThreshold?: number;
  padding?: number;
}

const detectContentBounds = (
  img: HTMLImageElement,
  options: DetectContentBoundsOptions = {},
): ContentBounds | null => {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  if (width === 0 || height === 0) return null;

  const { alphaThreshold = 10, padding = 0 } = options;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctx = tempCanvas.getContext('2d');

  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];

      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1 || maxY === -1) {
    return null;
  }

  const paddedMinX = Math.max(0, minX - padding);
  const paddedMinY = Math.max(0, minY - padding);
  const paddedMaxX = Math.min(width - 1, maxX + padding);
  const paddedMaxY = Math.min(height - 1, maxY + padding);

  return {
    x: paddedMinX,
    y: paddedMinY,
    width: paddedMaxX - paddedMinX + 1,
    height: paddedMaxY - paddedMinY + 1,
  };
};

const normalizeBounds = (bounds: ContentBounds, width: number, height: number): NormalizedBounds => ({
  x: bounds.x / width,
  y: bounds.y / height,
  width: bounds.width / width,
  height: bounds.height / height,
});

const denormalizeBounds = (bounds: NormalizedBounds, width: number, height: number): ContentBounds => ({
  x: bounds.x * width,
  y: bounds.y * height,
  width: bounds.width * width,
  height: bounds.height * height,
});

// Detect alpha bounds from any drawable (Image or Canvas)
const detectDrawableBounds = (drawable: HTMLCanvasElement | HTMLImageElement, alphaThreshold = 2): ContentBounds | null => {
  const sw = drawable instanceof HTMLImageElement ? (drawable.naturalWidth || drawable.width) : drawable.width;
  const sh = drawable instanceof HTMLImageElement ? (drawable.naturalHeight || drawable.height) : drawable.height;
  if (sw === 0 || sh === 0) return null;

  const tmp = document.createElement('canvas');
  tmp.width = sw;
  tmp.height = sh;
  const c = tmp.getContext('2d');
  if (!c) return null;
  c.drawImage(drawable, 0, 0, sw, sh);
  const { data } = c.getImageData(0, 0, sw, sh);

  let minX = sw, minY = sh, maxX = -1, maxY = -1;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const a = data[(y * sw + x) * 4 + 3];
      if (a > alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX === -1 || maxY === -1) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

// Detect bounds on opaque white background images by thresholding RGB.
export const computeWhiteBgBoundsFromImageData = (
  data: Uint8ClampedArray,
  sw: number,
  sh: number,
  threshold: number = 240,
): ContentBounds | null => {
  let minX = sw, minY = sh, maxX = -1, maxY = -1;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const idx = (y * sw + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const a = data[idx + 3];
      const isWhite = (r >= threshold && g >= threshold && b >= threshold);
      const isContent = (a > 10) && !isWhite;
      if (isContent) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX === -1 || maxY === -1) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

const detectWhiteBgBounds = (
  drawable: HTMLCanvasElement | HTMLImageElement,
  threshold: number = 240,
  pad: number = 0,
): ContentBounds | null => {
  const sw = drawable instanceof HTMLImageElement ? (drawable.naturalWidth || drawable.width) : drawable.width;
  const sh = drawable instanceof HTMLImageElement ? (drawable.naturalHeight || drawable.height) : drawable.height;
  if (sw === 0 || sh === 0) return null;

  const tmp = document.createElement('canvas');
  tmp.width = sw;
  tmp.height = sh;
  const ctx = tmp.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(drawable, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);
  const core = computeWhiteBgBoundsFromImageData(data, sw, sh, threshold);
  if (!core) return null;
  let { x: minX, y: minY, width, height } = core;
  let maxX = minX + width - 1, maxY = minY + height - 1;
  if (pad >= 0) {
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(sw - 1, maxX + pad);
    maxY = Math.min(sh - 1, maxY + pad);
  } else {
    const shrink = -pad;
    minX = Math.min(Math.max(0, minX + shrink), sw - 2);
    minY = Math.min(Math.max(0, minY + shrink), sh - 2);
    maxX = Math.max(1, Math.min(sw - 1, maxX - shrink));
    maxY = Math.max(1, Math.min(sh - 1, maxY - shrink));
    if (maxX <= minX) maxX = Math.min(sw - 1, minX + 1);
    if (maxY <= minY) maxY = Math.min(sh - 1, minY + 1);
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

const mergeNormalizedBounds = (a: NormalizedBounds, b: NormalizedBounds): NormalizedBounds => {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return {
    x: Math.max(0, minX),
    y: Math.max(0, minY),
    width: Math.min(1, maxX) - Math.max(0, minX),
    height: Math.min(1, maxY) - Math.max(0, minY),
  };
};

const renderBaseCanvas = (
  file: File,
  service: RepairService,
  normalizedBounds: NormalizedBounds | null,
  onBoundsReady?: (bounds: NormalizedBounds) => NormalizedBounds,
): Promise<HTMLCanvasElement> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      resolve(canvas);
      return;
    }

    const finalize = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(canvas);
    };

    img.onload = () => {
      const sourceWidth = img.naturalWidth || img.width;
      const sourceHeight = img.naturalHeight || img.height;

      if (sourceWidth === 0 || sourceHeight === 0) {
        finalize();
        return;
      }

      const scale = Math.min(OUTPUT_SIZE / sourceWidth, OUTPUT_SIZE / sourceHeight);
      const scaledWidth = sourceWidth * scale;
      const scaledHeight = sourceHeight * scale;

      const offsetX = (OUTPUT_SIZE - scaledWidth) / 2;
      const offsetY = (OUTPUT_SIZE - scaledHeight) / 2;

      // High-quality draw + slight blur to minimize aliasing
      (ctx as any).imageSmoothingEnabled = true;
      try { (ctx as any).imageSmoothingQuality = 'high'; } catch {}
      const prevFilterImg = (ctx as any).filter ?? 'none';
      (ctx as any).filter = 'blur(0.2px)';
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      (ctx as any).filter = prevFilterImg || 'none';

      // Feather the alpha to seal tiny holes without hardening edges
      try {
        const ix = Math.max(0, Math.floor(offsetX));
        const iy = Math.max(0, Math.floor(offsetY));
        const iw = Math.min(OUTPUT_SIZE - ix, Math.ceil(scaledWidth));
        const ih = Math.min(OUTPUT_SIZE - iy, Math.ceil(scaledHeight));
        featherAlpha(ctx, ix, iy, iw, ih, 1, 1.06);
      } catch {}

      // Always compute device content bounds and publish them, even if there's no overlay.
      const computedBounds = detectContentBounds(img) ?? {
        x: 0,
        y: 0,
        width: sourceWidth,
        height: sourceHeight,
      };

      const normalizedComputed = normalizeBounds(computedBounds, sourceWidth, sourceHeight);
      // 只有“使用模型图”的服务（非配件图）才会发布设备轮廓，避免配件图污染全局 bounds。
      const shouldPublishBounds = !service.needsPartImage;
      const published = shouldPublishBounds && onBoundsReady
        ? onBoundsReady(normalizedComputed)
        : (shouldPublishBounds ? (normalizedBounds ?? normalizedComputed) : null);
      const activeNormalized = published ?? null;

      const bounds = activeNormalized
        ? denormalizeBounds(activeNormalized, sourceWidth, sourceHeight)
        : computedBounds;

      if (service.overlayArea) {

        const overlay = service.overlayArea;
        const screenX = offsetX + (bounds.x + bounds.width * overlay.x) * scale;
        const screenY = offsetY + (bounds.y + bounds.height * overlay.y) * scale;
        const screenWidth = bounds.width * overlay.width * scale;
        const screenHeight = bounds.height * overlay.height * scale;

        // Clip to the overlay area
        ctx.save();
        ctx.beginPath();
        ctx.rect(screenX, screenY, screenWidth, screenHeight);
        ctx.clip();

        if (service.fillColor) {
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = service.fillColor;
          ctx.fillRect(screenX - screenWidth, screenY - screenHeight, screenWidth * 3, screenHeight * 3);
          ctx.globalCompositeOperation = 'source-over';
        }

        const finishWithRestore = () => {
          ctx.restore();
          finalize();
        };

        if (service.overlayImage && service.crackPoints && service.crackPoints.length > 0) {
          const crackImg = new Image();
          crackImg.onload = () => {
            service.crackPoints!.forEach(crack => {
              const crackSize = screenWidth * crack.size; // size relative to screen width
              const centerX = screenX + (screenWidth * crack.x);
              const centerY = screenY + (screenHeight * crack.y);
              const drawX = centerX - crackSize / 2;
              const drawY = centerY - crackSize / 2;

              // Clip to a circle to avoid any white halo in the PNG edges
              ctx.save();
              ctx.beginPath();
              ctx.arc(centerX, centerY, crackSize * 0.52, 0, Math.PI * 2);
              ctx.clip();
              // High-quality sampling + micro blur to smooth jaggies
              // Note: filter must be set before drawImage
              const prevFilter = (ctx as any).filter ?? 'none';
              (ctx as any).imageSmoothingEnabled = true;
              try { (ctx as any).imageSmoothingQuality = 'high'; } catch {}
              (ctx as any).filter = 'blur(0.3px)';
              ctx.drawImage(crackImg, drawX, drawY, crackSize, crackSize);
              (ctx as any).filter = prevFilter || 'none';
              ctx.restore();
            });
            finishWithRestore();
          };
          crackImg.onerror = finishWithRestore;
          crackImg.src = service.overlayImage;
          return;
        }

        // Center overlay image (e.g., no-power warning) without circular clip
        // Skip for glass protector as it's handled in composeFinalLayout
        if (service.centerOverlayImage && service.id !== 'screen-protector-glass') {
          const icon = new Image();
          icon.onload = () => {
            const ratio = Math.max(0.05, Math.min(1, service.centerOverlayRatio ?? 0.5));
            const targetW = screenWidth * ratio;
            const aspect = icon.naturalHeight && icon.naturalWidth ? icon.naturalHeight / icon.naturalWidth : 1;
            const targetH = targetW * aspect;
            const cx = screenX + screenWidth / 2;
            const cy = screenY + screenHeight / 2;
            const dx = Math.round(cx - targetW / 2);
            const dy = Math.round(cy - targetH / 2);
            ctx.drawImage(icon, dx, dy, targetW, targetH);
            finishWithRestore();
          };
          icon.onerror = finishWithRestore;
          icon.src = service.centerOverlayImage;
          return;
        }

        finishWithRestore();
        return;
      }

      finalize();
    };

    img.onerror = finalize;
    img.src = objectUrl;
  });
};

const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

// Helper function to draw SKU text at the top
const drawSkuText = (ctx: CanvasRenderingContext2D, sku: string) => {
  const topAreaHeight = OUTPUT_SIZE * 0.05; // Top 5% area
  const margin = OUTPUT_SIZE * 0.05; // 5% margin on left and right
  const maxTextWidth = OUTPUT_SIZE - margin * 2;

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Auto-fit font size: start large, shrink until text fits
  let fontSize = 32;
  const minFontSize = 12;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;

  while (fontSize > minFontSize && ctx.measureText(sku).width > maxTextWidth) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  }

  const textY = topAreaHeight / 2;
  ctx.fillText(sku, OUTPUT_SIZE / 2, textY);
};

const composeFinalLayout = async (
  service: RepairService,
  baseCanvas: HTMLCanvasElement,
  originalFile: File,
  normalizedBounds: NormalizedBounds | null,
  createURL: (blob: Blob) => string,
  sku?: string,
  showSkuOnImage?: boolean
): Promise<string> => {
  if (!service.layout) {
    return canvasToObjectUrl(baseCanvas, createURL);
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = OUTPUT_SIZE;
  finalCanvas.height = OUTPUT_SIZE;
  const ctx = finalCanvas.getContext('2d');

  if (!ctx) {
    return canvasToObjectUrl(baseCanvas, createURL);
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  // Single-centered layout: draw only processed phone centered, then edge badges
  if (service.layout.type === 'single-centered') {
    const targetH = Math.floor(OUTPUT_SIZE * ((service.layout as any).targetHeightRatio ?? 0.8));
    const centerOffsetX = OUTPUT_SIZE * (((service.layout as any).centerOffsetRatioX ?? 0));

    const getBoundsSingle = (drawable: HTMLCanvasElement | HTMLImageElement): ContentBounds => {
      const sw = drawable instanceof HTMLImageElement ? (drawable.naturalWidth || drawable.width) : drawable.width;
      const sh = drawable instanceof HTMLImageElement ? (drawable.naturalHeight || drawable.height) : drawable.height;
      if (normalizedBounds) {
        return denormalizeBounds(normalizedBounds, sw, sh);
      }
      return { x: 0, y: 0, width: sw, height: sh };
    };

    type DrawablePlacement = {
      sx: number;
      sy: number;
      sWidth: number;
      sHeight: number;
      drawX: number;
      drawY: number;
      drawWidth: number;
      drawHeight: number;
      intrinsicWidth: number;
      isCropped: boolean;
    };

    const measureDrawable = (
      drawable: HTMLCanvasElement | HTMLImageElement,
    ): DrawablePlacement | null => {
      const sw = drawable instanceof HTMLImageElement ? (drawable.naturalWidth || drawable.width) : drawable.width;
      const sh = drawable instanceof HTMLImageElement ? (drawable.naturalHeight || drawable.height) : drawable.height;
      if (sw === 0 || sh === 0) return null;

      const bounds = getBoundsSingle(drawable);
      const scaleH = targetH / bounds.height;
      const scaledW = bounds.width * scaleH;
      const scaledH = targetH;
      const drawY = (OUTPUT_SIZE - scaledH) / 2;

      if (scaledW <= OUTPUT_SIZE) {
        return {
          sx: bounds.x,
          sy: bounds.y,
          sWidth: bounds.width,
          sHeight: bounds.height,
          drawX: (OUTPUT_SIZE - scaledW) / 2,
          drawY,
          drawWidth: scaledW,
          drawHeight: scaledH,
          intrinsicWidth: scaledW,
          isCropped: false,
        };
      }

      const ratio = OUTPUT_SIZE / scaledW;
      const cropW = bounds.width * ratio;
      return {
        sx: bounds.x + (bounds.width - cropW) / 2,
        sy: bounds.y,
        sWidth: cropW,
        sHeight: bounds.height,
        drawX: 0,
        drawY,
        drawWidth: OUTPUT_SIZE,
        drawHeight: scaledH,
        intrinsicWidth: scaledW,
        isCropped: true,
      };
    };

    const drawMeasured = (
      drawable: HTMLCanvasElement | HTMLImageElement,
      placement: DrawablePlacement | null,
    ) => {
      if (!placement) return;

      (ctx as any).imageSmoothingEnabled = true;
      try { (ctx as any).imageSmoothingQuality = 'high'; } catch {}
      const prev = (ctx as any).filter ?? 'none';
      (ctx as any).filter = 'blur(0.15px)';

      ctx.drawImage(
        drawable,
        placement.sx,
        placement.sy,
        placement.sWidth,
        placement.sHeight,
        placement.drawX,
        placement.drawY,
        placement.drawWidth,
        placement.drawHeight,
      );

      (ctx as any).filter = prev || 'none';
    };

    const phonePlacement = measureDrawable(baseCanvas);
    if (!phonePlacement) {
      return canvasToObjectUrl(finalCanvas, createURL);
    }

    const loadImageFromUrl = (url: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; });

    let overlayPlacement: {
      img: HTMLImageElement;
      sx: number;
      sy: number;
      sWidth: number;
      sHeight: number;
      dx: number;
      dy: number;
      dWidth: number;
      dHeight: number;
    } | null = null;

    // Special handling for glass protector: overlay glass protector image offset to the left
    if (service.id === 'screen-protector-glass' && service.centerOverlayImage) {
      try {
        const glassImg = await loadImageFromUrl(service.centerOverlayImage);

        // Get glass protector's content bounds
        const glassBounds = detectContentBounds(glassImg, {
          // Use a high alpha threshold to catch the opaque bezel only,
          // ignoring faint semi-transparent haze that expands the bounds.
          alphaThreshold: 160,
          padding: 2,
        });
        if (glassBounds) {
          const glassScaleH = phonePlacement.drawHeight / glassBounds.height;
          const glassW = glassBounds.width * glassScaleH;
          const glassH = phonePlacement.drawHeight;

          // 至少要有的重叠像素，避免任何“缝隙”。
          const minOverlap = Math.max(12, Math.min(glassW * 0.5, phonePlacement.drawWidth * 0.55));

          // 组合宽度（按最小重叠计算）
          const comboWidth = phonePlacement.drawWidth + glassW - minOverlap;

          // 优先整体居中；如果太宽放不下，就退化为“贴着手机左侧”，仍保证最小重叠
          if (!phonePlacement.isCropped && comboWidth <= OUTPUT_SIZE) {
            const baseLeft = (OUTPUT_SIZE - comboWidth) / 2 + centerOffsetX;
            const comboLeft = Math.max(0, Math.min(OUTPUT_SIZE - comboWidth, baseLeft));
            const phoneLeft = comboLeft + glassW - minOverlap;
            phonePlacement.drawX = phoneLeft;
            overlayPlacement = {
              img: glassImg,
              sx: glassBounds.x,
              sy: glassBounds.y,
              sWidth: glassBounds.width,
              sHeight: glassBounds.height,
              dx: comboLeft,
              dy: phonePlacement.drawY,
              dWidth: glassW,
              dHeight: glassH,
            };
          } else {
            // 居中放不下：把手机保持原位，玻璃靠到手机左侧，强制最小重叠
            const glassDx = phonePlacement.drawX - (glassW - minOverlap);
            overlayPlacement = {
              img: glassImg,
              sx: glassBounds.x,
              sy: glassBounds.y,
              sWidth: glassBounds.width,
              sHeight: glassBounds.height,
              dx: glassDx,
              dy: phonePlacement.drawY,
              dWidth: glassW,
              dHeight: glassH,
            };
          }
        }
      } catch {}
    }

    // Special handling for hydrogel protector: mirrored to the RIGHT side
    if (service.id === 'screen-protector-hydrogel' && service.centerOverlayImage) {
      try {
        const gelImg = await loadImageFromUrl(service.centerOverlayImage);

        const gelBounds = detectContentBounds(gelImg, {
          // 水凝膜整体透明度较低，最高 alpha 仅 ~54/255，因此要用低阈值
          alphaThreshold: 2,
          padding: 2,
        });
        if (gelBounds) {
          const gelScaleH = phonePlacement.drawHeight / gelBounds.height;
          const gelW = gelBounds.width * gelScaleH;
          const gelH = phonePlacement.drawHeight;

          const minOverlap = Math.max(12, Math.min(gelW * 0.5, phonePlacement.drawWidth * 0.55));
          const comboWidth = phonePlacement.drawWidth + gelW - minOverlap;

          if (!phonePlacement.isCropped && comboWidth <= OUTPUT_SIZE) {
            const baseLeft = (OUTPUT_SIZE - comboWidth) / 2 + centerOffsetX;
            const comboLeft = Math.max(0, Math.min(OUTPUT_SIZE - comboWidth, baseLeft));
            // phone stays at left within combo, overlay at right
            const phoneLeft = comboLeft;
            const gelLeft = comboLeft + phonePlacement.drawWidth - minOverlap;
            phonePlacement.drawX = phoneLeft;
            overlayPlacement = {
              img: gelImg,
              sx: gelBounds.x,
              sy: gelBounds.y,
              sWidth: gelBounds.width,
              sHeight: gelBounds.height,
              dx: gelLeft,
              dy: phonePlacement.drawY,
              dWidth: gelW,
              dHeight: gelH,
            };
          } else {
            // Fallback: phone fixed, overlay on the right with required overlap
            const gelDx = phonePlacement.drawX + phonePlacement.drawWidth - minOverlap;
            overlayPlacement = {
              img: gelImg,
              sx: gelBounds.x,
              sy: gelBounds.y,
              sWidth: gelBounds.width,
              sHeight: gelBounds.height,
              dx: gelDx,
              dy: phonePlacement.drawY,
              dWidth: gelW,
              dHeight: gelH,
            };
          }
        }
      } catch {}
    }

    // Draw the phone first (may have updated X when overlay is present)
    drawMeasured(baseCanvas, phonePlacement);

    if (overlayPlacement) {
      (ctx as any).imageSmoothingEnabled = true;
      try { (ctx as any).imageSmoothingQuality = 'high'; } catch {}
      const prev = (ctx as any).filter ?? 'none';
      (ctx as any).filter = 'blur(0.15px)';

      ctx.drawImage(
        overlayPlacement.img,
        overlayPlacement.sx,
        overlayPlacement.sy,
        overlayPlacement.sWidth,
        overlayPlacement.sHeight,
        overlayPlacement.dx,
        overlayPlacement.dy,
        overlayPlacement.dWidth,
        overlayPlacement.dHeight,
      );

      (ctx as any).filter = prev || 'none';
    }

    const badges = (service.layout as any).edgeBadges as { src: string; widthRatio: number; yRatio: number; side: 'left'|'right' }[] | undefined;
    if (badges && badges.length) {
      for (const badge of badges) {
        try {
          const img = await loadImageFromUrl(badge.src);
          const badgeW = Math.max(8, Math.min(OUTPUT_SIZE, OUTPUT_SIZE * (badge.widthRatio ?? 0.06)));
          const aspect = img.naturalHeight && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
          const badgeH = badgeW * aspect;
          const margin = 12;
          const dx = badge.side === 'left' ? margin : OUTPUT_SIZE - badgeW - margin;
          const dy = Math.round(OUTPUT_SIZE * (badge.yRatio ?? 0.85) - badgeH / 2);
          ctx.drawImage(img, dx, dy, badgeW, badgeH);
        } catch {}
      }
    }

    // Draw SKU text before returning
    if (showSkuOnImage && sku && sku.trim()) {
      drawSkuText(ctx, sku);
    }

    return canvasToObjectUrl(finalCanvas, createURL);
  }

  const loadImageFromUrl = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const asset = new Image();
      asset.onload = () => resolve(asset);
      asset.onerror = reject;
      asset.src = url;
    });

  const drawDrawable = (
    drawable: HTMLCanvasElement | HTMLImageElement,
    regionX: number,
    regionWidth: number,
    targetHeight: number,
  ) => {
    const sw = drawable instanceof HTMLImageElement ? (drawable.naturalWidth || drawable.width) : drawable.width;
    const sh = drawable instanceof HTMLImageElement ? (drawable.naturalHeight || drawable.height) : drawable.height;
    if (sw === 0 || sh === 0) return;

    const bounds = normalizedBounds
      ? denormalizeBounds(normalizedBounds, sw, sh)
      : { x: 0, y: 0, width: sw, height: sh };

    const scaleH = targetHeight / bounds.height;
    const scaledW = bounds.width * scaleH;
    const scaledH = targetHeight;

    (ctx as any).imageSmoothingEnabled = true;
    try { (ctx as any).imageSmoothingQuality = 'high'; } catch {}
    const prev = (ctx as any).filter ?? 'none';
    (ctx as any).filter = 'blur(0.15px)';

    if (scaledW <= regionWidth) {
      const dx = regionX + (regionWidth - scaledW) / 2;
      const dy = (OUTPUT_SIZE - scaledH) / 2;
      ctx.drawImage(drawable, bounds.x, bounds.y, bounds.width, bounds.height, dx, dy, scaledW, scaledH);
    } else {
      const ratio = regionWidth / scaledW;
      const cropW = bounds.width * ratio;
      const sx = bounds.x + (bounds.width - cropW) / 2;
      const dy = (OUTPUT_SIZE - scaledH) / 2;
      ctx.drawImage(drawable, sx, bounds.y, cropW, bounds.height, regionX, dy, regionWidth, scaledH);
    }

    (ctx as any).filter = prev || 'none';
  };

  // Draw left-side part by absolute target width and left offset (in canvas coordinates),
  // while clamping into the left column region.
const expandBoundsPx = (b: ContentBounds, padPx: number, sw: number, sh: number): ContentBounds => {
  if (!padPx) return b;
  if (padPx > 0) {
    const minX = Math.max(0, b.x - padPx);
    const minY = Math.max(0, b.y - padPx);
    const maxX = Math.min(sw - 1, b.x + b.width - 1 + padPx);
    const maxY = Math.min(sh - 1, b.y + b.height - 1 + padPx);
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  } else {
    const s = -padPx;
    const minX = Math.min(Math.max(0, b.x + s), sw - 2);
    const minY = Math.min(Math.max(0, b.y + s), sh - 2);
    const maxX = Math.max(1, Math.min(sw - 1, b.x + b.width - 1 - s));
    const maxY = Math.max(1, Math.min(sh - 1, b.y + b.height - 1 - s));
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }
};

const drawDrawableByWidth = (
  drawable: HTMLCanvasElement | HTMLImageElement,
  regionX: number,
  regionWidth: number,
  targetWidth: number,
  desiredCanvasDx: number,
  opts?: { whiteBgCrop?: boolean; whiteThreshold?: number; whitePad?: number; cropPadPx?: number }
) => {
  const sw = drawable instanceof HTMLImageElement ? (drawable.naturalWidth || drawable.width) : drawable.width;
  const sh = drawable instanceof HTMLImageElement ? (drawable.naturalHeight || drawable.height) : drawable.height;
  if (sw === 0 || sh === 0) return;

  let bounds = (opts?.whiteBgCrop ? (detectWhiteBgBounds(drawable, opts?.whiteThreshold ?? 240, opts?.whitePad ?? 0) || null) : null)
    ?? detectDrawableBounds(drawable)
    ?? { x: 0, y: 0, width: sw, height: sh };

  if (opts?.cropPadPx) {
    bounds = expandBoundsPx(bounds, opts.cropPadPx, sw, sh);
  }

    const scaleW = targetWidth / bounds.width;
    const scaledW = targetWidth;
    const scaledH = bounds.height * scaleW;

    (ctx as any).imageSmoothingEnabled = true;
    try { (ctx as any).imageSmoothingQuality = 'high'; } catch {}
    const prev = (ctx as any).filter ?? 'none';
    (ctx as any).filter = 'blur(0.15px)';

    const minX = regionX;
    const maxX = regionX + regionWidth - scaledW;
    const dx = Math.max(minX, Math.min(maxX, desiredCanvasDx));

    if (scaledH <= OUTPUT_SIZE) {
      const dy = (OUTPUT_SIZE - scaledH) / 2;
      ctx.drawImage(drawable, bounds.x, bounds.y, bounds.width, bounds.height, dx, dy, scaledW, scaledH);
    } else {
      // Crop vertically to fit canvas
      const ratio = OUTPUT_SIZE / scaledH;
      const cropH = bounds.height * ratio;
      const sy = bounds.y + (bounds.height - cropH) / 2;
      const dy = 0;
      ctx.drawImage(drawable, bounds.x, sy, bounds.width, cropH, dx, dy, scaledW, OUTPUT_SIZE);
    }

    (ctx as any).filter = prev || 'none';
  };

  if (service.layout.type === 'single-centered') {
    const targetH = Math.floor(OUTPUT_SIZE * ((service.layout as any).targetHeightRatio ?? 0.8));
    drawDrawable(baseCanvas, 0, OUTPUT_SIZE, targetH);

    const badges = (service.layout as any).edgeBadges as { src: string; widthRatio: number; yRatio: number; side: 'left' | 'right' }[] | undefined;
    if (badges && badges.length) {
      for (const badge of badges) {
        try {
          const img = await loadImageFromUrl(badge.src);
          const badgeW = Math.max(8, Math.min(OUTPUT_SIZE, OUTPUT_SIZE * (badge.widthRatio ?? 0.06)));
          const aspect = img.naturalHeight && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
          const badgeH = badgeW * aspect;
          const margin = 12;
          const dx = badge.side === 'left' ? margin : OUTPUT_SIZE - badgeW - margin;
          const dy = Math.round(OUTPUT_SIZE * (badge.yRatio ?? 0.85) - badgeH / 2);
          ctx.drawImage(img, dx, dy, badgeW, badgeH);
        } catch {}
      }
    }

    // Draw SKU text before returning
    if (showSkuOnImage && sku && sku.trim()) {
      drawSkuText(ctx, sku);
    }

    return canvasToObjectUrl(finalCanvas, createURL);
  }

  // side-by-side (默认并排布局)
  const dividerWidth = 0;
  const columnWidth = OUTPUT_SIZE / 2;
  const sLayout: any = service.layout as any;
  const rightTargetHeight = Math.floor(OUTPUT_SIZE * (sLayout.rightHeightRatio ?? 0.80));

  // 左侧：若为配件类，优先使用“按画布宽度 + 左边距”的摆放规则
  if (service.needsPartImage) {
    const widthCanvasRatio = Math.max(0.05, Math.min(1, sLayout.leftWidthCanvasRatio ?? 0.38));
    const offsetCanvasRatio = Math.max(0, Math.min(1, sLayout.leftCanvasOffsetRatioX ?? 0.10));
    const targetW = Math.floor(OUTPUT_SIZE * widthCanvasRatio);
    const desiredDx = Math.floor(OUTPUT_SIZE * offsetCanvasRatio);
    const isDual = service.id.startsWith('dual-preview-front') || service.id.startsWith('dual-preview-back');
    const leftWhiteBgCropFlag = typeof sLayout.leftWhiteBgCrop === 'boolean'
      ? sLayout.leftWhiteBgCrop
      : isDual;
    const whiteCropOptions = leftWhiteBgCropFlag
      ? {
          whiteBgCrop: true,
          whiteThreshold: sLayout.leftWhiteBgCropThreshold ?? 248,
          whitePad: sLayout.leftWhiteBgCropPad ?? 0,
          cropPadPx: sLayout.leftWhiteBgCropPadPx ?? 10,
        }
      : undefined;

    drawDrawableByWidth(
      baseCanvas,
      0,
      columnWidth,
      targetW,
      desiredDx,
      whiteCropOptions
    );
  } else {
    const leftHeightRatio = Math.max(0.05, Math.min(1, sLayout.leftHeightRatio ?? 0.80));
    const leftTargetHeight = Math.floor(OUTPUT_SIZE * leftHeightRatio);
    drawDrawable(baseCanvas, 0, columnWidth, leftTargetHeight);
  }

  try {
    const originalImage = await loadImageFromFile(originalFile);
    drawDrawable(originalImage, columnWidth + dividerWidth, columnWidth, rightTargetHeight);
  } catch {}

  if ((service.layout as any).badges && (service.layout as any).badges.length > 0) {
    for (const badge of (service.layout as any).badges) {
      try {
        const img = await loadImageFromUrl(badge.src);
        const badgeW = Math.max(8, Math.min(OUTPUT_SIZE, OUTPUT_SIZE * (badge.widthRatio ?? 0.06)));
        const aspect = img.naturalHeight && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
        const badgeH = badgeW * aspect;
        const cx = columnWidth;
        const cy = OUTPUT_SIZE * (badge.yRatio ?? 0.5);
        const dx = Math.round(cx - badgeW / 2);
        const dy = Math.round(cy - badgeH / 2);
        ctx.drawImage(img, dx, dy, badgeW, badgeH);
      } catch {}
    }
  }

  // Draw center badges (bottom center, side by side)
  if ((service.layout as any).centerBadges && (service.layout as any).centerBadges.length > 0) {
    const centerBadges = (service.layout as any).centerBadges as { src: string; widthRatio: number; yRatio: number }[];
    const spacing = 16; // Space between badges

    // Load all badges first to calculate total width
    const loadedBadges: { img: HTMLImageElement; width: number; height: number }[] = [];
    for (const badge of centerBadges) {
      try {
        const img = await loadImageFromUrl(badge.src);
        const badgeW = Math.max(8, Math.min(OUTPUT_SIZE, OUTPUT_SIZE * (badge.widthRatio ?? 0.06)));
        const aspect = img.naturalHeight && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
        const badgeH = badgeW * aspect;
        loadedBadges.push({ img, width: badgeW, height: badgeH });
      } catch {}
    }

    // Calculate total width including spacing
    const totalWidth = loadedBadges.reduce((sum, b) => sum + b.width, 0) + spacing * (loadedBadges.length - 1);

    // Starting X position (centered)
    let currentX = (OUTPUT_SIZE - totalWidth) / 2;
    const yPos = OUTPUT_SIZE * (centerBadges[0]?.yRatio ?? 0.86);

    // Draw each badge
    for (const badge of loadedBadges) {
      const dy = Math.round(yPos - badge.height / 2);
      ctx.drawImage(badge.img, currentX, dy, badge.width, badge.height);
      currentX += badge.width + spacing;
    }
  }

  // Draw SKU text at the top if enabled
  if (showSkuOnImage && sku && sku.trim()) {
    drawSkuText(ctx, sku);
  }

  return canvasToObjectUrl(finalCanvas, createURL);
};

export const useImageProcessing = () => {
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [normalizedBounds, setNormalizedBounds] = useState<NormalizedBounds | null>(null);
  const { create: createObjectURL, revokeAll } = useObjectURLs();

  const processImages = useCallback(async (
    deviceImages: DeviceImages,
    selections: Record<string, ServiceSelection>,
    sku?: string,
    showSkuOnImage?: boolean
  ) => {
    // 清理之前的 ObjectURLs，避免内存泄漏
    revokeAll();

    setIsProcessing(true);
    setProcessedImages([]);
    setNormalizedBounds(null);

    const selectedServices = Object.values(selections).filter(s => s.isSelected);
    let boundsRef: NormalizedBounds | null = null;
    
    try {
      for (const selection of selectedServices) {
        // Simulate image processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Find service config (support dynamic instance ids like dual-preview-front-xxxx)
        const baseId = selection.serviceId.startsWith('dual-preview-front')
          ? 'dual-preview-front'
          : selection.serviceId.startsWith('dual-preview-back')
          ? 'dual-preview-back'
          : selection.serviceId;
        const serviceConfig = ALL_SERVICES.find(s => s.id === baseId);
        if (!serviceConfig) continue;

        // Determine source image based on service config
        let sourceImage: File | null = null;
        let useDefaultImage = false;

        if (serviceConfig.needsPartImage) {
          if (selection.customImage) {
            sourceImage = selection.customImage;
          } else if (serviceConfig.defaultPartImage) {
            // Will load from URL later
            useDefaultImage = true;
          }
        } else if (serviceConfig.useModelSide === 'front') {
          sourceImage = deviceImages.front;
        } else if (serviceConfig.useModelSide === 'back') {
          sourceImage = deviceImages.back;
        }

        if (!sourceImage && !useDefaultImage) {
          console.warn('⚠️ No source image for service:', {
            serviceId: selection.serviceId,
            title: serviceConfig.titleCN,
            needsPartImage: serviceConfig.needsPartImage,
            useModelSide: serviceConfig.useModelSide,
            hasFront: !!deviceImages.front,
            hasBack: !!deviceImages.back,
            hasCustom: !!selection.customImage
          });
          continue;
        }

        // If using default image, fetch it and convert to File
        if (useDefaultImage && serviceConfig.defaultPartImage) {
          const response = await fetch(serviceConfig.defaultPartImage);
          const blob = await response.blob();
          sourceImage = new File([blob], 'default-part.png', { type: blob.type });
          console.log('✅ Loaded default image:', serviceConfig.defaultPartImage, 'for service:', serviceConfig.titleCN);
        }

        if (!sourceImage) {
          console.error('❌ Failed to get source image for service:', serviceConfig.titleCN);
          continue;
        }

        const originalImageUrl = createObjectURL(sourceImage);
        console.log('✅ Created originalImageUrl:', originalImageUrl, 'for service:', serviceConfig.titleCN);

        // Generate base effect and compose final layout using cached device bounds
        const baseCanvas = await renderBaseCanvas(
          sourceImage,
          serviceConfig,
          boundsRef,
          (bounds) => {
            boundsRef = boundsRef ? mergeNormalizedBounds(boundsRef, bounds) : bounds;
            setNormalizedBounds(boundsRef);
            return boundsRef;
          },
        );
        // Choose the right-side reference image:
        // - For services with part images, the right panel should show the phone model (front/back);
        // - Otherwise, default to the same source image.
        let rightSideFile: File = sourceImage;
        if (serviceConfig.needsPartImage) {
          const preferFront = serviceConfig.useModelSide === 'front';
          const preferBack = serviceConfig.useModelSide === 'back';
          const front = deviceImages.front ?? null;
          const back = deviceImages.back ?? null;
          if (preferFront && front) rightSideFile = front;
          else if (preferBack && back) rightSideFile = back;
          else if (front || back) rightSideFile = (front ?? back)!; // fall back to any available model image
        }

        const processedImageUrl = await composeFinalLayout(
          serviceConfig,
          baseCanvas,
          rightSideFile,
          boundsRef,
          createObjectURL,
          sku,
          showSkuOnImage
        );
        console.log('✅ Created processedImageUrl:', processedImageUrl, 'for service:', serviceConfig.titleCN);

        const processedImage: ProcessedImage = {
          serviceId: selection.serviceId,
          originalImage: originalImageUrl,
          processedImage: processedImageUrl,
          approved: false,
        };

        console.log('📦 Adding to processedImages:', {
          serviceId: selection.serviceId,
          title: serviceConfig.titleCN,
          originalUrl: originalImageUrl.substring(0, 50) + '...',
          processedUrl: processedImageUrl.substring(0, 50) + '...',
        });

        setProcessedImages(prev => {
          const newImages = [...prev, processedImage];
          console.log('🔄 Updated processedImages count:', newImages.length, 'services:', newImages.map(i => i.serviceId));
          return newImages;
        });
      }

      toast({
        title: "Procesamiento completado",
        description: `${selectedServices.length} imágenes procesadas correctamente.`,
      });
    } catch (error) {
      console.error('❌ Processing error:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error en el procesamiento",
        description: `Error: ${errorMsg}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [createObjectURL, revokeAll]);

  const updateImageApproval = useCallback((serviceId: string, approved: boolean) => {
    setProcessedImages(prev => 
      prev.map(img => 
        img.serviceId === serviceId 
          ? { ...img, approved }
          : img
      )
    );
  }, []);

  const downloadApprovedImages = useCallback(async (sku: string) => {
    const chosen = processedImages.filter(img => img.approved);
    const images = chosen.length > 0 ? chosen : processedImages;

    if (images.length === 0) {
      toast({
        title: '没有可下载的图片',
        description: '请先生成或勾选需要下载的图片。',
        variant: 'destructive'
      });
      return;
    }

    try {
      const zip = new JSZip();
      const folder = zip.folder(sku && sku.trim() ? sku.trim() : 'images')!;

      // fetch each objectURL into Blob and add to zip
      await Promise.all(images.map(async (img, idx) => {
        try {
          const res = await fetch(img.processedImage);
          const blob = await res.blob();
          const fname = `${String(idx + 1).padStart(2, '0')}_${img.serviceId.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
          folder.file(fname, blob);
        } catch (e) {
          console.warn('Skip adding image due to fetch error', img.serviceId, e);
        }
      }));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sku && sku.trim() ? sku.trim() : 'images'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: '打包完成',
        description: `已下载 ${images.length} 张图片`,
      });
    } catch (error) {
      console.error('Zip error', error);
      toast({
        title: '压缩失败',
        description: '生成 ZIP 时出现问题。',
        variant: 'destructive'
      });
    }
  }, [processedImages]);

  // 双图别管模式：根据 pairs 与参数批量生成
  const processDualFreePairs = useCallback(async (
    pairs: { left: File; right: File }[],
    params: {
      leftWidth: number;
      leftOffset: number;
      rightHeight: number;
      whiteCrop: boolean;
      cutoutLeft: boolean;
      cutoutRight: boolean;
      useBack?: boolean;
    },
    sku?: string,
    showSkuOnImage?: boolean
  ) => {
    revokeAll();
    setIsProcessing(true);
    setProcessedImages([]);
    setNormalizedBounds(null);

    try {
      const baseServiceModule = params.useBack
        ? await import('@/data/services/dualPreviewBackService')
        : await import('@/data/services/dualPreviewService');
      const baseService: RepairService = params.useBack
        ? baseServiceModule.dualPreviewBackService
        : baseServiceModule.dualPreviewService;
      const baseId = params.useBack ? 'dual-preview-back' : 'dual-preview-front';

      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];

        const runtimeService: RepairService = {
          ...baseService,
          id: `${baseId}-dual-free-${i + 1}`,
          layout: {
            ...(baseService.layout as any),
            type: 'side-by-side',
            leftWidthCanvasRatio: params.leftWidth,
            leftCanvasOffsetRatioX: params.leftOffset,
            rightHeightRatio: params.rightHeight,
            leftWhiteBgCrop: !params.cutoutLeft && params.whiteCrop,
            leftWhiteBgCropThreshold: (baseService.layout as any)?.leftWhiteBgCropThreshold ?? 248,
            leftWhiteBgCropPad: (baseService.layout as any)?.leftWhiteBgCropPad ?? 0,
            leftWhiteBgCropPadPx: (baseService.layout as any)?.leftWhiteBgCropPadPx ?? 10,
          } as any,
        } as RepairService;

        const baseCanvas = await renderBaseCanvas(
          pair.left,
          runtimeService,
          null,
          (b) => b
        );

        const processedImageUrl = await composeFinalLayout(
          runtimeService,
          baseCanvas,
          pair.right,
          null,
          createObjectURL,
          sku,
          showSkuOnImage
        );

        const originalLeftUrl = createObjectURL(pair.left);
        setProcessedImages(prev => ([...prev, {
          serviceId: runtimeService.id,
          originalImage: originalLeftUrl,
          processedImage: processedImageUrl,
          approved: false,
        }]));
      }
      toast({ title: '生成完成', description: `已生成 ${pairs.length} 张图片。` });
    } catch (e) {
      console.error('dual-free generate error', e);
      toast({ title: '生成失败', description: '双图别管模式生成出现问题。', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  }, [revokeAll, createObjectURL]);

  return {
    processedImages,
    isProcessing,
    processImages,
    processDualFreePairs,
    updateImageApproval,
    downloadApprovedImages,
  };
};
