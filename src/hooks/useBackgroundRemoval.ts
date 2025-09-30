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

  return {
    removeImageBackground,
    isProcessing: state.isProcessing,
    progress: state.progress,
    error: state.error,
  };
};