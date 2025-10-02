import { useState, useCallback } from 'react';
import { removeBackground } from '@imgly/background-removal';

// 模型选择：isnet (150MB) | isnet_fp16 (80MB) | isnet_quint8 (40MB)
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
    useWebGPU: boolean = false,
    highQuality: boolean = true
  ): Promise<Blob | null> => {
    setState({ isProcessing: true, progress: 0, error: null });

    // 工具函数：执行背景移除
    const publicPath = resolvePublicPath();

    const selectModel = (useGpu: boolean, hq: boolean): 'isnet' | 'isnet_fp16' | 'isnet_quint8' => {
      if (hq) return useGpu ? 'isnet_fp16' : 'isnet';
      return 'isnet_quint8';
    };

    const run = (blobOrFile: Blob | File, device: 'cpu' | 'gpu', model: 'isnet' | 'isnet_fp16' | 'isnet_quint8') => {
      return removeBackground(blobOrFile, {
        model,
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

    // 对抠图结果的 Alpha 做轻量后处理，尽量保留内部小的白色区域
    const refineAlpha = async (pngBlob: Blob): Promise<Blob> => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return pngBlob;

        if ('createImageBitmap' in window) {
          const bitmap = await createImageBitmap(pngBlob);
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          ctx.drawImage(bitmap, 0, 0);
        } else {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject as any;
            el.src = URL.createObjectURL(pngBlob);
          });
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        }
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = imageData;

        // 提取 alpha 通道
        const size = width * height;
        const alpha = new Uint8ClampedArray(size);
        for (let i = 0, j = 0; i < size; i += 1, j += 4) {
          alpha[i] = data[j + 3];
        }

        // 1) 形态学闭运算：膨胀后腐蚀（3x3 核，半径=1），填充小洞
        const tmp = new Uint8ClampedArray(size);
        // 膨胀：取邻域最大值
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let maxv = 0;
            for (let dy = -1; dy <= 1; dy++) {
              const yy = y + dy;
              if (yy < 0 || yy >= height) continue;
              const row = yy * width;
              for (let dx = -1; dx <= 1; dx++) {
                const xx = x + dx;
                if (xx < 0 || xx >= width) continue;
                const v = alpha[row + xx];
                if (v > maxv) maxv = v;
              }
            }
            tmp[y * width + x] = maxv;
          }
        }
        // 腐蚀：取邻域最小值
        const closed = new Uint8ClampedArray(size);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let minv = 255;
            for (let dy = -1; dy <= 1; dy++) {
              const yy = y + dy;
              if (yy < 0 || yy >= height) continue;
              const row = yy * width;
              for (let dx = -1; dx <= 1; dx++) {
                const xx = x + dx;
                if (xx < 0 || xx >= width) continue;
                const v = tmp[row + xx];
                if (v < minv) minv = v;
              }
            }
            closed[y * width + x] = minv;
          }
        }

        // 2) 轻度 Alpha 提升，缓解“过度抠图”导致的小块消失
        const BOOST = 24; // 适中增益，避免明显溢出边缘
        for (let i = 0, j = 0; i < size; i += 1, j += 4) {
          const boosted = Math.min(255, closed[i] + BOOST);
          data[j + 3] = boosted;
        }

        ctx.putImageData(imageData, 0, 0);
        const refined = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b || pngBlob), 'image/png');
        });
        return refined;
      } catch (e) {
        console.warn('[Background Removal] Alpha refine skipped:', e);
        return pngBlob;
      }
    };

    try {
      // Check WebGPU support
      const supportsWebGPU = 'gpu' in navigator;
      let device: 'cpu' | 'gpu' = useWebGPU && supportsWebGPU ? 'gpu' : 'cpu';
      const model = selectModel(device === 'gpu', highQuality);

      const displayPublicPath = publicPath ?? '(forced CDN default)';
      console.log(`[Background Removal] Using model: ${model}, device: ${device}, publicPath: ${displayPublicPath}`);

      try {
        // 尝试使用首选设备
        const rawBlob = await run(file, device, model);
        const imageBlob = rawBlob; // 使用库原生输出，不做后处理
        setState({ isProcessing: false, progress: 100, error: null });
        return imageBlob;
      } catch (error) {
        // GPU 失败时自动回退到 CPU（但仍使用量化模型）
        if (device === 'gpu') {
          console.warn('[Background Removal] GPU failed, falling back to CPU:', error);
          const fallbackModel = selectModel(false, highQuality);
          const rawBlob = await run(file, 'cpu', fallbackModel);
          const imageBlob = rawBlob; // 使用库原生输出，不做后处理
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

  const preloadModel = useCallback(async (useWebGPU: boolean = false, highQuality: boolean = true): Promise<void> => {
    setState({ isProcessing: true, progress: 0, error: null });

    try {
      // Check WebGPU support
      const supportsWebGPU = 'gpu' in navigator;
      const device = useWebGPU && supportsWebGPU ? 'gpu' : 'cpu';
      const model = selectModel(device === 'gpu', highQuality);
      const publicPath = resolvePublicPath();

      const displayPreloadPath = publicPath ?? '(forced CDN default)';
      console.log(`[Model Preload] Downloading model: ${model}, device: ${device}, publicPath: ${displayPreloadPath}`);

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
        model,
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
