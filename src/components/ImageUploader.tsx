import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import { DeviceImages, BackgroundRemovalConfig } from '@/types/repair';
import { toast } from '@/hooks/use-toast';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';
import { useObjectURLs } from '@/hooks/useObjectURLs';

interface ImageUploaderProps {
  deviceImages: DeviceImages;
  onImagesChange: (images: DeviceImages) => void;
  bgRemovalConfig: BackgroundRemovalConfig;
  compact?: boolean; // 紧凑模式：更小的间距与高度
}

export const ImageUploader = ({ deviceImages, onImagesChange, bgRemovalConfig, compact = false }: ImageUploaderProps) => {
  const [dragOver, setDragOver] = useState<'front' | 'back' | null>(null);
  const [validating, setValidating] = useState(false);
  const [processingSide, setProcessingSide] = useState<'front' | 'back' | null>(null);
  const { removeImageBackground, isProcessing, progress } = useBackgroundRemoval();

  // 使用 useObjectURLs 管理预览 URL，避免内存泄漏
  const { create, revoke, revokeAll } = useObjectURLs();
  const [previews, setPreviews] = useState<{ front?: string; back?: string }>({});

  // 组件卸载时清理所有 ObjectURL
  useEffect(() => {
    return () => revokeAll();
  }, [revokeAll]);

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
      let finalFile: File;

      if (bgRemovalConfig.enabled) {
        // Remove background automatically
        toast({
          title: "正在处理",
          description: `正在自动去除背景（${bgRemovalConfig.useWebGPU ? 'GPU加速' : 'CPU模式'}），请稍候...`,
        });

        const processedBlob = await removeImageBackground(
          file,
          bgRemovalConfig.useWebGPU,
          bgRemovalConfig.highQuality !== false
        );

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
        finalFile = new File([processedBlob], file.name, { type: 'image/png' });

        toast({
          title: "图片已上传",
          description: `${type === 'front' ? '正面' : '背面'}图片已自动去除背景。`,
          variant: "default"
        });
      } else {
        // Use original image without background removal
        finalFile = file;

        toast({
          title: "图片已上传",
          description: `${type === 'front' ? '正面' : '背面'}图片已上传（未处理背景）。`,
          variant: "default"
        });
      }

      onImagesChange({
        ...deviceImages,
        [type]: finalFile
      });

      // 创建并管理预览 URL
      setPreviews(prev => {
        const oldUrl = prev[type];
        if (oldUrl) revoke(oldUrl);
        const newUrl = create(finalFile);
        return { ...prev, [type]: newUrl };
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
  }, [deviceImages, onImagesChange, removeImageBackground, bgRemovalConfig, create, revoke]);

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
    // 清理预览 URL
    setPreviews(prev => {
      const oldUrl = prev[type];
      if (oldUrl) revoke(oldUrl);
      const newPreviews = { ...prev };
      delete newPreviews[type];
      return newPreviews;
    });

    onImagesChange({
      ...deviceImages,
      [type]: null
    });
  }, [deviceImages, onImagesChange, revoke]);

  const ImageUploadCard = ({ type, file }: { type: 'front' | 'back'; file: File | null }) => {
    const isProcessingThis = isProcessing && processingSide === type;
    const cardPadding = compact ? 'p-3' : 'p-6';
    const loaderHeight = compact ? 'h-40' : 'h-60';
    const previewHeight = compact ? 'h-36' : 'h-48';
    const emptyPaddingY = compact ? 'py-4' : 'py-8';
    const titleClass = compact ? 'text-sm' : 'font-semibold';
    const descClass = compact ? 'text-xs' : 'text-sm';

    return (
      <Card className={`relative transition-all duration-300 overflow-hidden ${
        dragOver === type ? 'ring-2 ring-primary shadow-glow' : ''
      } ${file ? 'border-success' : 'border-dashed border-2'}`}>
        <CardContent className={cardPadding}>
          {isProcessingThis ? (
            <div className={`relative ${loaderHeight} flex items-center justify-center`}>
              <div className="flex flex-col items-center justify-center gap-3">
                <img
                  src="/assets/ui/loading.gif"
                  alt="loading"
                  className="block mx-auto h-12 w-12 md:h-16 md:w-16 object-contain"
                />
                <div className="text-center">
                  <h3 className={`${titleClass} mb-1`}>正在处理图片</h3>
                  <p className={`${descClass} text-muted-foreground`}>自动去除背景中，请稍候...</p>
                </div>
              </div>
            </div>
          ) : file ? (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={previews[type] || ''}
                  alt={type === 'front' ? '正面图片' : '背面图片'}
                  className={`w-full ${previewHeight} object-contain rounded-lg`}
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
                <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium`}>
                  {type === 'front' ? '正面' : '背面'}模型图已上传
                  {bgRemovalConfig.enabled ? '（已去背景）' : '（原图）'}
                </span>
              </div>
            </div>
          ) : (
          <div
            className={`text-center space-y-3 ${emptyPaddingY}`}
            onDrop={(e) => handleDrop(e, type)}
            onDragOver={handleDragOver}
            onDragEnter={() => setDragOver(type)}
            onDragLeave={() => setDragOver(null)}
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className={`${titleClass} mb-1`}>
                手机{type === 'front' ? '正面' : '背面'}图
              </h3>
              <p className={`${descClass} text-muted-foreground mb-3`}>
                拖拽图片到此处或点击上传
              </p>
              <div className={`flex items-center gap-2 ${compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground mb-3`}>
                <AlertCircle className="h-4 w-4" />
                <span>
                  {bgRemovalConfig.enabled
                    ? `上传后将自动去除背景（${bgRemovalConfig.useWebGPU ? 'GPU加速' : 'CPU模式'}）`
                    : '上传后直接使用原图'}
                </span>
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
                className={`w-full ${compact ? 'h-8 text-xs' : ''}`}
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
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      {!compact && (
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">上传手机模型图</h2>
          <p className="text-muted-foreground">
            上传手机的正面和背面白底图，用于后续生成产品展示图
          </p>
        </div>
      )}

      {/* 重要提示 */}
      {!compact && (
      <details className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
        <summary className="flex items-center gap-2 cursor-pointer select-none">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
            ⚠️ 样机壁纸要求（点击查看）
          </span>
        </summary>
        <div className="mt-2 text-xs text-yellow-800 dark:text-yellow-300 space-y-1">
          <p>✅ <strong>推荐：</strong>使用深色壁纸（黑色/深灰色）的样机，抠图效果更好</p>
          <p>❌ <strong>不推荐：</strong>浅色系列壁纸（包括彩色渐变、亮色背景等）会影响后续处理</p>
        </div>
      </details>
      )}

      {/* 示例图展示（默认折叠，减少占用） */}
      {!compact && (
      <details className="bg-muted/30 rounded-lg p-4 border border-dashed border-muted-foreground/30">
        <summary className="flex items-center gap-2 cursor-pointer select-none">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold">推荐样机示例（点击展开）</span>
        </summary>
        <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto mt-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-green-600">✓ 正确示例（深色壁纸）</p>
            <img
              src="/assets/examples/example-dark-wallpaper.png"
              alt="推荐样机"
              className="w-full h-36 object-contain rounded-lg border-2 border-green-200 bg-white"
            />
            <p className="text-[10px] text-muted-foreground">黑/深灰色壁纸，边缘清晰，易于抠图</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-red-600">✗ 错误示例（彩色壁纸）</p>
            <img
              src="/assets/examples/example-front.png"
              alt="不推荐样机"
              className="w-full h-36 object-contain rounded-lg border-2 border-red-200 bg-white opacity-60"
            />
            <p className="text-[10px] text-muted-foreground">浅色系列壁纸，抠图效果差</p>
          </div>
        </div>
      </details>
      )}

      <div className={`grid md:grid-cols-2 ${compact ? 'gap-3' : 'gap-6'}`}>
        <ImageUploadCard type="front" file={deviceImages.front} />
        <ImageUploadCard type="back" file={deviceImages.back} />
      </div>
    </div>
  );
};
