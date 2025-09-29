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

const renderBaseCanvas = (file: File, service: RepairService): Promise<HTMLCanvasElement> => {
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
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.restore();

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

      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

      if (service.overlayArea && service.fillColor) {
        const bounds = detectContentBounds(img) ?? {
          x: 0,
          y: 0,
          width: sourceWidth,
          height: sourceHeight,
        };

        const overlay = service.overlayArea;
        const screenX = offsetX + (bounds.x + bounds.width * overlay.x) * scale;
        const screenY = offsetY + (bounds.y + bounds.height * overlay.y) * scale;
        const screenWidth = bounds.width * overlay.width * scale;
        const screenHeight = bounds.height * overlay.height * scale;

        ctx.save();
        ctx.beginPath();
        ctx.rect(screenX, screenY, screenWidth, screenHeight);
        ctx.clip();

        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = service.fillColor;
        ctx.fillRect(screenX - screenWidth, screenY - screenHeight, screenWidth * 3, screenHeight * 3);
        ctx.globalCompositeOperation = 'source-over';

        const finishWithRestore = () => {
          ctx.restore();
          finalize();
        };

        if (service.overlayImage && service.crackPoints && service.crackPoints.length > 0) {
          const crackImg = new Image();
          crackImg.onload = () => {
            service.crackPoints!.forEach(crack => {
              const crackSize = screenWidth * crack.size;
              const crackX = screenX + (screenWidth * crack.x) - crackSize / 2;
              const crackY = screenY + (screenHeight * crack.y) - crackSize / 2;
              ctx.drawImage(crackImg, crackX, crackY, crackSize, crackSize);
            });
            finishWithRestore();
          };
          crackImg.onerror = finishWithRestore;
          crackImg.src = service.overlayImage;
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
  originalFile: File
): Promise<string> => {
  if (!service.layout || service.layout.type !== 'side-by-side') {
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

  const dividerWidth = Math.max(2, Math.round(OUTPUT_SIZE * (service.layout.dividerWidthRatio ?? 0.04)));
  const dividerColor = service.layout.dividerColor ?? '#111111';
  const columnWidth = (OUTPUT_SIZE - dividerWidth) / 2;

  const drawDrawable = (drawable: HTMLCanvasElement | HTMLImageElement, startX: number) => {
    const sourceWidth = drawable instanceof HTMLImageElement
      ? drawable.naturalWidth || drawable.width
      : drawable.width;
    const sourceHeight = drawable instanceof HTMLImageElement
      ? drawable.naturalHeight || drawable.height
      : drawable.height;

    if (sourceWidth === 0 || sourceHeight === 0) return;

    const scale = Math.min(columnWidth / sourceWidth, OUTPUT_SIZE / sourceHeight);
    const targetWidth = sourceWidth * scale;
    const targetHeight = sourceHeight * scale;
    const drawX = startX + (columnWidth - targetWidth) / 2;
    const drawY = (OUTPUT_SIZE - targetHeight) / 2;

    ctx.drawImage(drawable, drawX, drawY, targetWidth, targetHeight);
  };

  drawDrawable(baseCanvas, 0);

  ctx.fillStyle = dividerColor;
  ctx.fillRect(columnWidth, 0, dividerWidth, OUTPUT_SIZE);

  try {
    const originalImage = await loadImageFromFile(originalFile);
    drawDrawable(originalImage, columnWidth + dividerWidth);
  } catch {
    // If original image fails to load, leave the right side blank.
  }

  return canvasToObjectUrl(finalCanvas);
};

export const useImageProcessing = () => {
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processImages = useCallback(async (
    deviceImages: DeviceImages,
    selections: Record<string, ServiceSelection>
  ) => {
    setIsProcessing(true);
    setProcessedImages([]);

    const selectedServices = Object.values(selections).filter(s => s.isSelected);
    
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

        // Generate base effect and compose final layout if needed
        const baseCanvas = await renderBaseCanvas(sourceImage, serviceConfig);
        const processedImageUrl = await composeFinalLayout(serviceConfig, baseCanvas, sourceImage);

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
      toast({
        title: "Error en el procesamiento",
        description: "Hubo un error al procesar las imágenes.",
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
