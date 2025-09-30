import { useState, useCallback } from 'react';
import { ProcessedImage, ServiceSelection, DeviceImages, RepairService } from '@/types/repair';
import { toast } from '@/hooks/use-toast';
import { ALL_SERVICES } from '@/data/services';

const OUTPUT_SIZE = 800;

interface ContentBounds {
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

const canvasToObjectUrl = (canvas: HTMLCanvasElement): Promise<string> => {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob));
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

const detectContentBounds = (img: HTMLImageElement): ContentBounds | null => {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  if (width === 0 || height === 0) return null;

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

      if (alpha > 10) {
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

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
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

      if (service.overlayArea) {
        const computedBounds = detectContentBounds(img) ?? {
          x: 0,
          y: 0,
          width: sourceWidth,
          height: sourceHeight,
        };

        const normalizedComputed = normalizeBounds(computedBounds, sourceWidth, sourceHeight);
        const activeNormalized = onBoundsReady
          ? onBoundsReady(normalizedComputed)
          : normalizedBounds ?? normalizedComputed;

        const bounds = activeNormalized
          ? denormalizeBounds(activeNormalized, sourceWidth, sourceHeight)
          : computedBounds;

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
        if (service.centerOverlayImage) {
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

const composeFinalLayout = async (
  service: RepairService,
  baseCanvas: HTMLCanvasElement,
  originalFile: File,
  normalizedBounds: NormalizedBounds | null
): Promise<string> => {
  if (!service.layout) {
    return canvasToObjectUrl(baseCanvas);
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = OUTPUT_SIZE;
  finalCanvas.height = OUTPUT_SIZE;
  const ctx = finalCanvas.getContext('2d');

  if (!ctx) {
    return canvasToObjectUrl(baseCanvas);
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  // Single-centered layout: draw only processed phone centered, then edge badges
  if (service.layout.type === 'single-centered') {
    const targetH = Math.floor(OUTPUT_SIZE * ((service.layout as any).targetHeightRatio ?? 0.8));

    const getBoundsSingle = (drawable: HTMLCanvasElement | HTMLImageElement): ContentBounds => {
      const sw = drawable instanceof HTMLImageElement ? (drawable.naturalWidth || drawable.width) : drawable.width;
      const sh = drawable instanceof HTMLImageElement ? (drawable.naturalHeight || drawable.height) : drawable.height;
      if (normalizedBounds) {
        return denormalizeBounds(normalizedBounds, sw, sh);
      }
      return { x: 0, y: 0, width: sw, height: sh };
    };

    const drawCentered = (drawable: HTMLCanvasElement | HTMLImageElement) => {
      const sw = drawable instanceof HTMLImageElement ? (drawable.naturalWidth || drawable.width) : drawable.width;
      const sh = drawable instanceof HTMLImageElement ? (drawable.naturalHeight || drawable.height) : drawable.height;
      if (sw === 0 || sh === 0) return;
      const b = getBoundsSingle(drawable);
      const scaleH = targetH / b.height;
      const scaledW = b.width * scaleH;
      const scaledH = targetH;

      (ctx as any).imageSmoothingEnabled = true;
      try { (ctx as any).imageSmoothingQuality = 'high'; } catch {}
      const prev = (ctx as any).filter ?? 'none';
      (ctx as any).filter = 'blur(0.15px)';

      if (scaledW <= OUTPUT_SIZE) {
        const dx = (OUTPUT_SIZE - scaledW) / 2;
        const dy = (OUTPUT_SIZE - scaledH) / 2;
        ctx.drawImage(drawable, b.x, b.y, b.width, b.height, dx, dy, scaledW, scaledH);
      } else {
        const ratio = OUTPUT_SIZE / scaledW;
        const cropW = b.width * ratio;
        const sx = b.x + (b.width - cropW) / 2;
        const sy = b.y;
        const dx = 0;
        const dy = (OUTPUT_SIZE - scaledH) / 2;
        ctx.drawImage(drawable, sx, sy, cropW, b.height, dx, dy, OUTPUT_SIZE, scaledH);
      }

      (ctx as any).filter = prev || 'none';
    };

    drawCentered(baseCanvas);

    const loadImageFromUrl = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; });
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

    return canvasToObjectUrl(finalCanvas);
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

    return canvasToObjectUrl(finalCanvas);
  }

  // side-by-side (默认并排布局)
  const targetHeight = defaultTargetHeight;
  drawDrawable(baseCanvas, 0, columnWidth, targetHeight);

  try {
    const originalImage = await loadImageFromFile(originalFile);
    drawDrawable(originalImage, columnWidth + dividerWidth, columnWidth, targetHeight);
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

  return canvasToObjectUrl(finalCanvas);
};

export const useImageProcessing = () => {
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [normalizedBounds, setNormalizedBounds] = useState<NormalizedBounds | null>(null);

  const processImages = useCallback(async (
    deviceImages: DeviceImages,
    selections: Record<string, ServiceSelection>
  ) => {
    setIsProcessing(true);
    setProcessedImages([]);
    setNormalizedBounds(null);

    const selectedServices = Object.values(selections).filter(s => s.isSelected);
    let boundsRef: NormalizedBounds | null = null;
    
    try {
      for (const selection of selectedServices) {
        // Simulate image processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Find service config
        const serviceConfig = ALL_SERVICES.find(s => s.id === selection.serviceId);
        if (!serviceConfig) continue;

        // Determine source image based on service config
        let sourceImage: File | null = null;
        if (serviceConfig.needsPartImage && selection.customImage) {
          sourceImage = selection.customImage;
        } else if (serviceConfig.useModelSide === 'front') {
          sourceImage = deviceImages.front;
        } else if (serviceConfig.useModelSide === 'back') {
          sourceImage = deviceImages.back;
        }

        if (!sourceImage) continue;

        const originalImageUrl = URL.createObjectURL(sourceImage);

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
        const processedImageUrl = await composeFinalLayout(
          serviceConfig,
          baseCanvas,
          sourceImage,
          boundsRef,
        );

        const processedImage: ProcessedImage = {
          serviceId: selection.serviceId,
          originalImage: originalImageUrl,
          processedImage: processedImageUrl,
          approved: false,
        };

        setProcessedImages(prev => [...prev, processedImage]);
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
  }, []);

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
    const approvedImages = processedImages.filter(img => img.approved);
    
    if (approvedImages.length === 0) {
      toast({
        title: "Sin imágenes aprobadas",
        description: "No hay imágenes aprobadas para descargar.",
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real application, this would create a proper ZIP file
      // For demo purposes, we'll simulate the download
      toast({
        title: "Descarga iniciada",
        description: `Descargando ${approvedImages.length} imágenes como ${sku}.zip`,
      });

      // Simulate download delay
      setTimeout(() => {
        toast({
          title: "Descarga completada",
          description: `${sku}.zip descargado correctamente.`,
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Error en la descarga",
        description: "Hubo un error al generar el archivo ZIP.",
        variant: "destructive"
      });
    }
  }, [processedImages]);

  return {
    processedImages,
    isProcessing,
    processImages,
    updateImageApproval,
    downloadApprovedImages,
  };
};
