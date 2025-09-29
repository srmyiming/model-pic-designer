import { useState, useCallback } from 'react';
import { ProcessedImage, ServiceSelection, DeviceImages } from '@/types/repair';
import { toast } from '@/hooks/use-toast';

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
      for (const service of selectedServices) {
        // Simulate image processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Use custom image if available, otherwise use front device image
        const sourceImage = service.customImage || deviceImages.front;
        
        if (!sourceImage) continue;

        const originalImageUrl = URL.createObjectURL(sourceImage);
        
        // Simulate AI processing - in real app, this would call an AI service
        const processedImageUrl = await simulateImageProcessing(sourceImage);

        const processedImage: ProcessedImage = {
          serviceId: service.serviceId,
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

  const simulateImageProcessing = async (file: File): Promise<string> => {
    // In a real application, this would send the image to an AI service
    // For demo purposes, we'll just return the original image with some simulated processing
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Add a simple filter to simulate processing
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Add a watermark to show it's processed
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(0, 150, 255, 0.8)';
          ctx.font = '20px Arial';
          ctx.fillText('PROCESADO', 20, 40);
        }
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          }
        });
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

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