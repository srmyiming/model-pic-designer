import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary - React 错误边界组件
 *
 * 捕获子组件树中的 JavaScript 错误,防止整个应用崩溃。
 *
 * 使用场景:
 * - 包裹图片处理组件
 * - Canvas 操作可能失败的地方
 * - 异步加载资源的组件
 *
 * 使用方法:
 * ```tsx
 * <ErrorBoundary>
 *   <ImageProcessingComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 在开发环境打印详细错误信息
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || '出现错误';
      const message = this.props.fallbackMessage || this.state.error?.message || '未知错误';

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {message}
          </p>
          {import.meta.env.DEV && this.state.error?.stack && (
            <details className="text-xs text-left bg-muted p-4 rounded max-w-2xl overflow-auto">
              <summary className="cursor-pointer font-semibold mb-2">
                Stack Trace (仅开发环境显示)
              </summary>
              <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
            </details>
          )}
          <div className="flex gap-2">
            <Button onClick={this.handleReset} variant="outline">
              重试
            </Button>
            <Button onClick={() => window.location.reload()}>
              重新加载页面
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
