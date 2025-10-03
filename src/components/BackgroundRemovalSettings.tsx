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
  // 精简版：仅保留“自动移除背景”开关；其余选项隐藏
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
    <Card className="mb-4 border-blue-200 dark:border-blue-800">
      <CardContent className="p-3">
        <div className="mb-2 flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold">背景移除</h3>
        </div>

        <div className="space-y-3">
          {/* Enable background removal */}
          <div className="flex items-start space-x-2">
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
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                上传时自动去除背景，提高抠图精度
              </p>
            </div>
          </div>
          {/* 其余选项隐藏（GPU / 高精度 / 预加载） */}

          {/* Additional info */}
          {/* 精简提示区域 */}
          {config.enabled && !isProcessing && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-[11px] text-blue-900 dark:text-blue-200">
                已开启自动移除背景。其它性能参数由系统自动选择。
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BackgroundRemovalSettings;
