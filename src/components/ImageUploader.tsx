import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import { DeviceImages } from '@/types/repair';
import { toast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  deviceImages: DeviceImages;
  onImagesChange: (images: DeviceImages) => void;
}

export const ImageUploader = ({ deviceImages, onImagesChange }: ImageUploaderProps) => {
  const [dragOver, setDragOver] = useState<'front' | 'back' | null>(null);
  const [validating, setValidating] = useState(false);

  const validateImage = useCallback(async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(false);
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Sample pixels to check for white background
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        
        let whitePixels = 0;
        const sampleSize = 1000; // Sample every 1000th pixel
        
        for (let i = 0; i < data.length; i += 4 * sampleSize) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Check if pixel is close to white
          if (r > 240 && g > 240 && b > 240) {
            whitePixels++;
          }
        }
        
        const totalSamples = Math.floor(data.length / (4 * sampleSize));
        const whitePercentage = (whitePixels / totalSamples) * 100;
        
        // At least 60% should be white for good background
        resolve(whitePercentage > 60);
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(async (file: File, type: 'front' | 'back') => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "错误",
        description: "请选择有效的图片文件。",
        variant: "destructive"
      });
      return;
    }

    setValidating(true);
    
    try {
      const isValidBackground = await validateImage(file);
      
      if (!isValidBackground) {
        toast({
          title: "背景无效",
          description: "图片必须有干净的白色背景。",
          variant: "destructive"
        });
        setValidating(false);
        return;
      }

      onImagesChange({
        ...deviceImages,
        [type]: file
      });

      toast({
        title: "图片已上传",
        description: `${type === 'front' ? '正面' : '背面'}图片上传成功。`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "错误",
        description: "验证图片时出错。",
        variant: "destructive"
      });
    }
    
    setValidating(false);
  }, [deviceImages, onImagesChange, validateImage]);

  const handleDrop = useCallback((e: React.DragEvent, type: 'front' | 'back') => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file, type);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeImage = useCallback((type: 'front' | 'back') => {
    onImagesChange({
      ...deviceImages,
      [type]: null
    });
  }, [deviceImages, onImagesChange]);

  const ImageUploadCard = ({ type, file }: { type: 'front' | 'back'; file: File | null }) => (
    <Card className={`relative transition-all duration-300 ${
      dragOver === type ? 'ring-2 ring-primary shadow-glow' : ''
    } ${file ? 'border-success' : 'border-dashed border-2'}`}>
      <CardContent className="p-6">
        {file ? (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={URL.createObjectURL(file)}
                alt={type === 'front' ? '正面图片' : '背面图片'}
                className="w-full h-48 object-contain rounded-lg bg-muted"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 rounded-full w-8 h-8 p-0"
                onClick={() => removeImage(type)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-success">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">
                {type === 'front' ? '正面' : '背面'}图片已上传
              </span>
            </div>
          </div>
        ) : (
          <div
            className="text-center space-y-4 py-8"
            onDrop={(e) => handleDrop(e, type)}
            onDragOver={handleDragOver}
            onDragEnter={() => setDragOver(type)}
            onDragLeave={() => setDragOver(null)}
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">
                {type === 'front' ? '正面' : '背面'}图片
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                拖拽图片到此处或点击选择
              </p>
              <div className="flex items-center gap-2 text-xs text-warning mb-4">
                <AlertCircle className="h-4 w-4" />
                <span>需要白色背景</span>
              </div>
              <input
                type="file"
                accept="image/*"
                id={`${type}-upload`}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file, type);
                }}
              />
              <Button
                variant="outline"
                className="w-full"
                asChild
                disabled={validating}
              >
                <label htmlFor={`${type}-upload`} className="cursor-pointer">
                  {validating ? '验证中...' : '选择图片'}
                </label>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">上传设备图片</h2>
        <p className="text-muted-foreground">
          上传设备的正面和背面图片，需要干净的白色背景
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <ImageUploadCard type="front" file={deviceImages.front} />
        <ImageUploadCard type="back" file={deviceImages.back} />
      </div>
    </div>
  );
};