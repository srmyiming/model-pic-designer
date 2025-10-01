import { useRef, useCallback, useEffect } from 'react';

/**
 * useObjectURLs
 *
 * 管理 ObjectURL 的生命周期，避免内存泄漏。
 *
 * 问题背景：
 * - URL.createObjectURL() 创建的 URL 必须手动释放
 * - 如果不调用 revokeObjectURL，浏览器会一直持有 Blob 引用
 * - 处理大量图片时会导致内存占用持续增长
 *
 * 使用方法：
 * ```typescript
 * const { create, revoke, revokeAll } = useObjectURLs();
 *
 * // 创建 URL
 * const url = create(blob);
 *
 * // 手动释放单个 URL
 * revoke(url);
 *
 * // 组件卸载时自动释放所有 URL
 * ```
 */
export const useObjectURLs = () => {
  const urlsRef = useRef<Set<string>>(new Set());

  const create = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  }, []);

  const revoke = useCallback((url: string): void => {
    if (urlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      urlsRef.current.delete(url);
    }
  }, []);

  const revokeAll = useCallback((): void => {
    urlsRef.current.forEach(url => URL.revokeObjectURL(url));
    urlsRef.current.clear();
  }, []);

  // 组件卸载时自动清理所有 URL
  useEffect(() => {
    return () => {
      urlsRef.current.forEach(url => URL.revokeObjectURL(url));
      urlsRef.current.clear();
    };
  }, []);

  return { create, revoke, revokeAll };
};
