import { useState, useCallback } from 'react';
import { removeBackground } from '@imgly/background-removal';

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

    try {
      // Check WebGPU support
      const supportsWebGPU = 'gpu' in navigator;
      const device = useWebGPU && supportsWebGPU ? 'gpu' : 'cpu';

      // Log the mode for debugging
      console.log(`[Background Removal] Using device: ${device} (WebGPU requested: ${useWebGPU}, supported: ${supportsWebGPU})`);

      // Convert File to Blob for processing
      const imageBlob = await removeBackground(file, {
        model: 'isnet', // 使用完整精度模型（非量化版），边缘更精确
        device: device as 'cpu' | 'gpu',
        progress: (key, current, total) => {
          const progressPercent = Math.round((current / total) * 100);
          setState(prev => ({ ...prev, progress: progressPercent }));
        },
        output: {
          format: 'image/png',
          quality: 0.9,
          type: 'foreground', // 输出前景（去背景后的图片）
        }
      });

      setState({ isProcessing: false, progress: 100, error: null });
      return imageBlob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove background';
      console.error('[Background Removal] Error:', errorMessage);

      // If WebGPU failed, suggest fallback
      if (useWebGPU && errorMessage.includes('gpu')) {
        setState({
          isProcessing: false,
          progress: 0,
          error: 'WebGPU 加速失败，请尝试关闭 GPU 加速选项'
        });
      } else {
        setState({ isProcessing: false, progress: 0, error: errorMessage });
      }
      return null;
    }
  }, []);

  const preloadModel = useCallback(async (useWebGPU: boolean = false): Promise<void> => {
    setState({ isProcessing: true, progress: 0, error: null });

    try {
      // Check WebGPU support
      const supportsWebGPU = 'gpu' in navigator;
      const device = useWebGPU && supportsWebGPU ? 'gpu' : 'cpu';

      console.log(`[Model Preload] Downloading AI model using device: ${device}`);

      // Create a 1x1 transparent PNG to trigger model download
      // Base64 of a minimal 1x1 transparent PNG
      const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const binaryString = atob(tinyPngBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const tinyImageBlob = new Blob([bytes], { type: 'image/png' });

      // Trigger model download by processing tiny image
      await removeBackground(tinyImageBlob, {
        model: 'isnet',
        device: device as 'cpu' | 'gpu',
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