import { useState, useCallback } from 'react';
import { removeBackground, Config } from '@imgly/background-removal';

// 环境变量配置：使用量化模型减少体积（40 MB vs 150 MB）
const MODEL = (import.meta.env.VITE_IMGLY_MODEL as 'isnet-quant' | 'isnet') || 'isnet-quant';
const PUBLIC_PATH = import.meta.env.VITE_IMGLY_PUBLIC_PATH || '/vendor/imgly/';

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
    const run = (blobOrFile: Blob | File, device: 'cpu' | 'gpu') => {
      return removeBackground(blobOrFile, {
        model: MODEL,
        device,
        publicPath: PUBLIC_PATH,
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

      console.log(`[Background Removal] Using model: ${MODEL}, device: ${device}, publicPath: ${PUBLIC_PATH}`);

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

      console.log(`[Model Preload] Downloading model: ${MODEL}, device: ${device}, publicPath: ${PUBLIC_PATH}`);

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
        publicPath: PUBLIC_PATH,
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