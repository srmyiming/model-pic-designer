import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { BackgroundRemovalConfig } from '@/types/repair';
import { Info, Zap, AlertCircle, Download } from 'lucide-react';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';
import { toast } from '@/hooks/use-toast';

interface BackgroundRemovalSettingsProps {
  config: BackgroundRemovalConfig;
  onChange: (config: BackgroundRemovalConfig) => void;
}

const STORAGE_KEY = 'bgRemovalConfig';
const MODEL_LOADED_KEY = 'bgRemovalModelLoaded';

export const BackgroundRemovalSettings = ({ config, onChange }: BackgroundRemovalSettingsProps) => {
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const { preloadModel, isProcessing, progress } = useBackgroundRemoval();

  // Check WebGPU support on mount
  useEffect(() => {
    const checkWebGPU = () => {
      const supported = 'gpu' in navigator;
      setWebGPUSupported(supported);
    };
    checkWebGPU();

    // Check if model was already loaded in this session
    const loaded = sessionStorage.getItem(MODEL_LOADED_KEY) === 'true';
    setModelLoaded(loaded);
  }, []);

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as BackgroundRemovalConfig;
        onChange(parsed);
      }
    } catch (error) {
      console.warn('[BackgroundRemovalSettings] Failed to load config from localStorage:', error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save config to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('[BackgroundRemovalSettings] Failed to save config to localStorage:', error);
    }
  }, [config]);

  const handleEnabledChange = (checked: boolean) => {
    onChange({ ...config, enabled: checked });
  };

  const handleWebGPUChange = (checked: boolean) => {
    onChange({ ...config, useWebGPU: checked });
  };

  const handleHighQualityChange = (checked: boolean) => {
    onChange({ ...config, highQuality: !!checked });
  };

  const handlePreloadModel = async () => {
    try {
      const sizeText = config.highQuality
        ? (config.useWebGPU ? '约 80 MB 的高精度模型' : '约 150 MB 的高精度模型')
        : '约 40 MB 的量化模型';

      toast({
        title: "开始下载 AI 模型",
        description: `正在下载${sizeText}（${config.useWebGPU ? 'GPU 加速' : 'CPU 模式'}）...`,
      });

      await preloadModel(config.useWebGPU, !!config.highQuality);

      setModelLoaded(true);
      sessionStorage.setItem(MODEL_LOADED_KEY, 'true');

      toast({
        title: "✅ 模型已就绪",
        description: "现在可以快速处理图片了！模型已缓存到本地。",
      });
    } catch (error) {
      console.error('[Preload] Failed:', error);
      toast({
        title: "❌ 预加载失败",
        description: "上传图片时会自动重试加载模型",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="mb-6 border-blue-200 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600" />
          <h3 className="text-base font-semibold">背景移除设置</h3>
        </div>

        <div className="space-y-4">
          {/* Enable background removal */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="bg-removal-enabled"
              checked={config.enabled}
              onCheckedChange={handleEnabledChange}
            />
            <div className="flex-1 space-y-1">
              <label
                htmlFor="bg-removal-enabled"
                className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                自动移除背景（推荐用于白底图）
              </label>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                上传时自动去除背景，提高抠图精度
              </p>
            </div>
          </div>

          {/* Enable WebGPU acceleration */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="bg-removal-webgpu"
              checked={config.useWebGPU}
              onCheckedChange={handleWebGPUChange}
              disabled={!config.enabled || webGPUSupported === false}
            />
            <div className="flex-1 space-y-1">
              <label
                htmlFor="bg-removal-webgpu"
                className={`text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                  !config.enabled || webGPUSupported === false ? 'opacity-50' : ''
                }`}
              >
                启用 GPU 加速（实验性）
              </label>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  使用 WebGPU 加速，速度提升最高 20 倍
                </p>
                {webGPUSupported === false && (
                  <p className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                    <AlertCircle className="h-3 w-3" />
                    当前浏览器不支持 WebGPU
                  </p>
                )}
                {webGPUSupported === true && (
                  <p className="text-green-600 dark:text-green-400">
                    ✓ 浏览器支持 WebGPU（Chrome 113+, Edge 113+）
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* High Quality toggle */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="bg-removal-hq"
              checked={config.highQuality !== false}
              onCheckedChange={handleHighQualityChange}
              disabled={!config.enabled}
            />
            <div className="flex-1 space-y-1">
              <label
                htmlFor="bg-removal-hq"
                className={`text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70`}
              >
                高精度抠图（更好边缘，模型更大）
              </label>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  {config.highQuality !== false
                    ? (config.useWebGPU ? '使用 isnet_fp16（约80MB）' : '使用 isnet（约150MB）')
                    : '使用 isnet_quint8（约40MB）'}
                </p>
              </div>
            </div>
          </div>

          {/* Preload Model Button */}
          {config.enabled && (
            <div className="pt-2 border-t border-blue-100 dark:border-blue-900">
              <Button
                onClick={handlePreloadModel}
                disabled={isProcessing || modelLoaded}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <img
                      src="/assets/ui/loading.gif"
                      alt="loading"
                      className="h-5 w-5 mr-2 object-contain"
                    />
                    下载中... {progress}%
                  </>
                ) : modelLoaded ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 text-green-600" />
                    ✅ 模型已就绪
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    🚀 预加载 AI 模型（{config.highQuality !== false ? (config.useWebGPU ? '约 80 MB' : '约 150 MB') : '约 40 MB'}）
                  </>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                {modelLoaded
                  ? '模型已缓存，上传图片时可快速处理'
                  : '提前下载模型可避免首次处理时等待'}
              </p>
            </div>
          )}

          {/* Additional info */}
          {config.enabled && !isProcessing && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-900 dark:text-blue-200">
                💡 <strong>提示：</strong>
                {config.useWebGPU
                  ? '已启用 GPU 加速，处理速度更快。如遇到问题可关闭此选项。'
                  : '使用 CPU 模式处理。如需更快速度，可尝试开启 GPU 加速。'}
                {' '}
                {config.highQuality !== false
                  ? '已启用高精度模型，细节更好。'
                  : '已启用极速模型，下载更快。'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BackgroundRemovalSettings;
