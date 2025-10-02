import { useState, useCallback } from 'react';
import { removeBackground } from '@imgly/background-removal';

// 环境变量配置：使用量化模型减少体积（40 MB vs 150 MB）
// 可选模型：isnet (150MB) | isnet_fp16 (80MB) | isnet_quint8 (40MB)
const MODEL = (import.meta.env.VITE_IMGLY_MODEL as 'isnet' | 'isnet_fp16' | 'isnet_quint8') || 'isnet_quint8';
const DEFAULT_PUBLIC_PATH = '/vendor/imgly/';
const RAW_PUBLIC_PATH = import.meta.env.VITE_IMGLY_PUBLIC_PATH || DEFAULT_PUBLIC_PATH;
const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;
// 硬编码官方 CDN（与 @imgly/background-removal 版本对齐）。
// 如需固定其他版本，只需修改版本号即可。
const FORCED_PUBLIC_PATH = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

const resolvePublicPath = (): string => {
  // 直接使用硬编码 CDN，规避 .env 和本地相对路径问题
  return ensureTrailingSlash(FORCED_PUBLIC_PATH);
};

interface BackgroundRemovalState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

export const useBackgroundRemoval = () => {
  const [state, setState] = useState<BackgroundRemovalState>({
    isProcessing: false,
    progress: 0,
    error: null,
  });

  const removeImageBackground = useCallback(async (
    file: File,
    useWebGPU: boolean = false
  ): Promise<Blob | null> => {
    setState({ isProcessing: true, progress: 0, error: null });

    // 工具函数：执行背景移除
    const publicPath = resolvePublicPath();

    const run = (blobOrFile: Blob | File, device: 'cpu' | 'gpu') => {
      return removeBackground(blobOrFile, {
        model: MODEL,
        device,
        ...(publicPath ? { publicPath } : {}),
        progress: (key, current, total) => {
          const progressPercent = Math.round((current / total) * 100);
          setState(prev => ({ ...prev, progress: progressPercent }));
        },
        output: {
          format: 'image/png',
          quality: 0.9,
          type: 'foreground',
        }
      });
    };

    try {
      // Check WebGPU support
      const supportsWebGPU = 'gpu' in navigator;
      let device: 'cpu' | 'gpu' = useWebGPU && supportsWebGPU ? 'gpu' : 'cpu';

      const displayPublicPath = publicPath ?? '(forced CDN default)';
      console.log(`[Background Removal] Using model: ${MODEL}, device: ${device}, publicPath: ${displayPublicPath}`);

      try {
        // 尝试使用首选设备
        const imageBlob = await run(file, device);
        setState({ isProcessing: false, progress: 100, error: null });
        return imageBlob;
      } catch (error) {
        // GPU 失败时自动回退到 CPU（但仍使用量化模型）
        if (device === 'gpu') {
          console.warn('[Background Removal] GPU failed, falling back to CPU:', error);
          const imageBlob = await run(file, 'cpu');
          setState({ isProcessing: false, progress: 100, error: null });
          return imageBlob;
        }
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove background';
      console.error('[Background Removal] Error:', errorMessage);

      setState({
        isProcessing: false,
        progress: 0,
        error: errorMessage.includes('gpu') ? 'GPU 加速失败，CPU 模式也失败' : errorMessage
      });
      return null;
    }
  }, []);

  const preloadModel = useCallback(async (useWebGPU: boolean = false): Promise<void> => {
    setState({ isProcessing: true, progress: 0, error: null });

    try {
      // Check WebGPU support
      const supportsWebGPU = 'gpu' in navigator;
      const device = useWebGPU && supportsWebGPU ? 'gpu' : 'cpu';
      const publicPath = resolvePublicPath();

      const displayPreloadPath = publicPath ?? '(forced CDN default)';
      console.log(`[Model Preload] Downloading model: ${MODEL}, device: ${device}, publicPath: ${displayPreloadPath}`);

      // Create a 1x1 transparent PNG to trigger model download
      const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const binaryString = atob(tinyPngBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const tinyImageBlob = new Blob([bytes], { type: 'image/png' });

      // Trigger model download by processing tiny image
      await removeBackground(tinyImageBlob, {
        model: MODEL,
        device: device as 'cpu' | 'gpu',
        ...(publicPath ? { publicPath } : {}),
        progress: (key, current, total) => {
          const progressPercent = Math.round((current / total) * 100);
          setState(prev => ({ ...prev, progress: progressPercent }));
          console.log(`[Model Preload] ${key}: ${progressPercent}%`);
        },
        output: {
          format: 'image/png',
          quality: 0.8,
          type: 'foreground',
        }
      });

      console.log('[Model Preload] Model loaded and cached successfully');
      setState({ isProcessing: false, progress: 100, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to preload model';
      console.error('[Model Preload] Error:', errorMessage);

      setState({
        isProcessing: false,
        progress: 0,
        error: useWebGPU && errorMessage.includes('gpu')
          ? 'WebGPU 预加载失败，请尝试关闭 GPU 加速'
          : '模型预加载失败'
      });

      throw error;
    }
  }, []);

  return {
    removeImageBackground,
    preloadModel,
    isProcessing: state.isProcessing,
    progress: state.progress,
    error: state.error,
  };
};
