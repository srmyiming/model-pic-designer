import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { DeviceImages } from '@/types/repair';
import { toast } from '@/hooks/use-toast';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';

interface ImageUploaderProps {
  deviceImages: DeviceImages;
  onImagesChange: (images: DeviceImages) => void;
}

export const ImageUploader = ({ deviceImages, onImagesChange }: ImageUploaderProps) => {
  const [dragOver, setDragOver] = useState<'front' | 'back' | null>(null);
  const [validating, setValidating] = useState(false);
  const [processingSide, setProcessingSide] = useState<'front' | 'back' | null>(null);
  const { removeImageBackground, isProcessing, progress } = useBackgroundRemoval();

  // Cleanup object URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      if (deviceImages.front) {
        URL.revokeObjectURL(URL.createObjectURL(deviceImages.front));
      }
      if (deviceImages.back) {
        URL.revokeObjectURL(URL.createObjectURL(deviceImages.back));
      }
    };
  }, [deviceImages]);

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
    setProcessingSide(type);

    try {
      // Remove background automatically
      toast({
        title: "正在处理",
        description: "正在自动去除背景，请稍候...",
      });

      const processedBlob = await removeImageBackground(file);

      if (!processedBlob) {
        toast({
          title: "处理失败",
          description: "背景去除失败，请重试。",
          variant: "destructive"
        });
        setValidating(false);
        setProcessingSide(null);
        return;
      }

      // Convert Blob to File
      const processedFile = new File([processedBlob], file.name, { type: 'image/png' });

      onImagesChange({
        ...deviceImages,
        [type]: processedFile
      });

      toast({
        title: "图片已上传",
        description: `${type === 'front' ? '正面' : '背面'}图片已自动去除背景。`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "错误",
        description: "处理图片时出错。",
        variant: "destructive"
      });
    }

    setValidating(false);
    setProcessingSide(null);
  }, [deviceImages, onImagesChange, removeImageBackground]);

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

  const ImageUploadCard = ({ type, file }: { type: 'front' | 'back'; file: File | null }) => {
    const isProcessingThis = isProcessing && processingSide === type;

    return (
      <Card className={`relative transition-all duration-300 ${
        dragOver === type ? 'ring-2 ring-primary shadow-glow' : ''
      } ${file ? 'border-success' : 'border-dashed border-2'}`}>
        <CardContent className="p-6">
          {isProcessingThis ? (
            <div className="space-y-4 py-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold mb-2">正在处理图片</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  自动去除背景中，请稍候...
                </p>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
              </div>
            </div>
          ) : file ? (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt={type === 'front' ? '正面图片' : '背面图片'}
                  className="w-full h-48 object-contain rounded-lg"
                  style={{ backgroundColor: '#f0f0f0' }}
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
                  {type === 'front' ? '正面' : '背面'}模型图已上传（已去背景）
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
                手机{type === 'front' ? '正面' : '背面'}图
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                拖拽图片到此处或点击上传
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <AlertCircle className="h-4 w-4" />
                <span>上传后将自动去除背景</span>
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
                disabled={validating || isProcessing}
              >
                <label htmlFor={`${type}-upload`} className="cursor-pointer">
                  {isProcessing ? '处理中...' : '选择图片'}
                </label>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">上传手机模型图</h2>
        <p className="text-muted-foreground">
          上传手机的正面和背面白底图，用于后续生成产品展示图
        </p>
      </div>

      {/* 示例图展示 */}
      <div className="bg-muted/30 rounded-lg p-3 border border-dashed border-muted-foreground/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold">参考示例</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">正面示例（白底、居中）</p>
            <img
              src="/example-front.png"
              alt="正面示例"
              className="w-full h-32 object-contain rounded border bg-white"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">背面示例（白底、居中）</p>
            <img
              src="/example-back.png"
              alt="背面示例"
              className="w-full h-32 object-contain rounded border bg-white"
            />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ImageUploadCard type="front" file={deviceImages.front} />
        <ImageUploadCard type="back" file={deviceImages.back} />
      </div>
    </div>
  );
};