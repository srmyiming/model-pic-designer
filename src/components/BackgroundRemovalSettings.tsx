import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { BackgroundRemovalConfig } from '@/types/repair';
import { Info, Zap, AlertCircle } from 'lucide-react';

interface BackgroundRemovalSettingsProps {
  config: BackgroundRemovalConfig;
  onChange: (config: BackgroundRemovalConfig) => void;
}

const STORAGE_KEY = 'bgRemovalConfig';

export const BackgroundRemovalSettings = ({ config, onChange }: BackgroundRemovalSettingsProps) => {
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);

  // Check WebGPU support on mount
  useEffect(() => {
    const checkWebGPU = () => {
      const supported = 'gpu' in navigator;
      setWebGPUSupported(supported);
    };
    checkWebGPU();
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

          {/* Additional info */}
          {config.enabled && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-900 dark:text-blue-200">
                💡 <strong>提示：</strong>
                {config.useWebGPU
                  ? '已启用 GPU 加速，处理速度更快。如遇到问题可关闭此选项。'
                  : '使用 CPU 模式处理。如需更快速度，可尝试开启 GPU 加速。'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BackgroundRemovalSettings;
