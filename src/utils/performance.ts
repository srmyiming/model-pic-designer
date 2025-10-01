/**
 * 性能监控工具
 *
 * 用于测量关键操作的耗时,帮助发现性能瓶颈。
 * 仅在开发环境输出日志。
 */

/**
 * 测量异步函数的执行时间
 *
 * @param name 操作名称(用于日志)
 * @param fn 要测量的异步函数
 * @returns 函数的返回值
 */
export const measureAsync = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();

  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;

    if (import.meta.env.DEV) {
      const color = duration > 1000 ? 'color: #ef4444' : 'color: #10b981'; // 红色/绿色
      console.log(`%c⏱️ [Perf] ${name}: ${duration.toFixed(2)}ms`, color);
    }
  }
};

/**
 * 测量同步函数的执行时间
 *
 * @param name 操作名称(用于日志)
 * @param fn 要测量的同步函数
 * @returns 函数的返回值
 */
export const measure = <T>(
  name: string,
  fn: () => T
): T => {
  const start = performance.now();

  try {
    return fn();
  } finally {
    const duration = performance.now() - start;

    if (import.meta.env.DEV) {
      const color = duration > 100 ? 'color: #ef4444' : 'color: #10b981';
      console.log(`%c⏱️ [Perf] ${name}: ${duration.toFixed(2)}ms`, color);
    }
  }
};

/**
 * 获取当前内存使用情况(仅 Chrome)
 *
 * @returns 内存信息对象,如果不支持则返回 null
 */
export const getMemoryInfo = (): {
  usedMB: number;
  totalMB: number;
  limitMB: number;
} | null => {
  if ('memory' in performance && (performance as any).memory) {
    const mem = (performance as any).memory;
    return {
      usedMB: mem.usedJSHeapSize / 1024 / 1024,
      totalMB: mem.totalJSHeapSize / 1024 / 1024,
      limitMB: mem.jsHeapSizeLimit / 1024 / 1024,
    };
  }
  return null;
};

/**
 * 打印当前内存使用情况
 */
export const logMemory = (label: string = 'Memory'): void => {
  if (!import.meta.env.DEV) return;

  const mem = getMemoryInfo();
  if (mem) {
    console.log(
      `🧠 [${label}] Used: ${mem.usedMB.toFixed(1)}MB / Total: ${mem.totalMB.toFixed(1)}MB / Limit: ${mem.limitMB.toFixed(1)}MB`
    );
  }
};

/**
 * 开始性能标记(用于复杂的嵌套测量)
 *
 * @param name 标记名称
 */
export const markStart = (name: string): void => {
  if (import.meta.env.DEV) {
    performance.mark(`${name}-start`);
  }
};

/**
 * 结束性能标记并测量
 *
 * @param name 标记名称(必须与 markStart 一致)
 */
export const markEnd = (name: string): void => {
  if (import.meta.env.DEV) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure;
    if (measure) {
      const duration = measure.duration;
      const color = duration > 1000 ? 'color: #ef4444' : 'color: #10b981';
      console.log(`%c⏱️ [Perf] ${name}: ${duration.toFixed(2)}ms`, color);
    }

    // 清理
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
  }
};
