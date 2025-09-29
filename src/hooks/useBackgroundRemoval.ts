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

  const removeImageBackground = useCallback(async (file: File): Promise<Blob | null> => {
    setState({ isProcessing: true, progress: 0, error: null });

    try {
      // Convert File to Blob for processing
      const imageBlob = await removeBackground(file, {
        progress: (key, current, total) => {
          const progressPercent = Math.round((current / total) * 100);
          setState(prev => ({ ...prev, progress: progressPercent }));
        },
        output: {
          format: 'image/png',
          quality: 0.9,
        }
      });

      setState({ isProcessing: false, progress: 100, error: null });
      return imageBlob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove background';
      setState({ isProcessing: false, progress: 0, error: errorMessage });
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