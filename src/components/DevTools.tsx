/**
 * 开发调试工具
 *
 * 仅在开发环境显示,提供:
 * - 服务数量统计
 * - 内存使用监控
 * - 手动触发垃圾回收(需要 Chrome --js-flags="--expose-gc")
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ALL_SERVICES } from '@/data/services';
import { getMemoryInfo } from '@/utils/performance';
import { Bug, RefreshCw } from 'lucide-react';

export const DevTools = () => {
  const [memInfo, setMemInfo] = useState(getMemoryInfo());
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    if (!isMinimized) {
      // 每秒更新内存信息
      const timer = setInterval(() => {
        setMemInfo(getMemoryInfo());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isMinimized]);

  const handleForceGC = () => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      setMemInfo(getMemoryInfo());
    } else {
      alert(
        '垃圾回收功能未启用。\n\n请使用以下命令启动 Chrome:\n\nchrome --js-flags="--expose-gc"'
      );
    }
  };

  // 生产环境不显示
  if (import.meta.env.PROD) {
    return null;
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 left-4 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
        title="打开开发工具"
      >
        <Bug className="h-5 w-5" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 p-4 bg-black/90 text-white text-xs font-mono shadow-2xl min-w-[280px] z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-green-400" />
          <span className="font-semibold text-green-400">Dev Tools</span>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        {/* 服务统计 */}
        <div className="flex justify-between">
          <span className="text-gray-400">Services:</span>
          <span className="text-white font-semibold">{ALL_SERVICES.length}</span>
        </div>

        {/* 内存信息 */}
        {memInfo && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-400">Memory Used:</span>
              <span className="text-white font-semibold">
                {memInfo.usedMB.toFixed(1)} MB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Memory Total:</span>
              <span className="text-white font-semibold">
                {memInfo.totalMB.toFixed(1)} MB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Memory Limit:</span>
              <span className="text-white font-semibold">
                {memInfo.limitMB.toFixed(1)} MB
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-300"
                style={{
                  width: `${(memInfo.usedMB / memInfo.limitMB) * 100}%`,
                }}
              />
            </div>
          </>
        )}

        {/* 垃圾回收按钮 */}
        <Button
          onClick={handleForceGC}
          size="sm"
          variant="outline"
          className="w-full mt-3 bg-gray-800 border-gray-600 hover:bg-gray-700 text-white"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Force GC
        </Button>

        {/* 提示信息 */}
        <div className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-700">
          <p>💡 启用 GC: chrome --js-flags="--expose-gc"</p>
        </div>
      </div>
    </Card>
  );
};
