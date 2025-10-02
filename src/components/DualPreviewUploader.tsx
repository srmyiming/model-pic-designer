import { useState, useRef, DragEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, RefreshCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DualPreviewUploaderProps {
  frontImage: File | null;
  customImage: File | null;
  onUpload: (file: File) => void;
  onReset: () => void;
}

export const DualPreviewUploader = ({ frontImage, customImage, onUpload, onReset }: DualPreviewUploaderProps) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: '请选择图片文件', description: '支持 JPG/PNG/WebP 等常见格式。', variant: 'destructive' });
      return;
    }
    if (!frontImage) {
      toast({ title: '缺少正面模型图', description: '请先在步骤1上传正面图，再上传双图素材。', variant: 'destructive' });
      return;
    }
    onUpload(file);
    toast({ title: '双图素材已更新', description: '左侧将使用新素材，右侧继续使用正面模型图。' });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const statusText = customImage
    ? '已上传自定义素材，点击更换或恢复默认。'
    : frontImage
    ? '当前使用步骤1的正面模型图。'
    : '请先在步骤1上传正面模型图再使用此功能。';

  const disabled = !frontImage;

  return (
    <Card className="mb-6 border-blue-200 dark:border-blue-800">
      <CardContent className="p-6">
        <div
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            dragOver ? 'border-primary bg-primary/5 text-primary' : 'border-muted-foreground/40'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold">双图效果 · 正面</h3>
          <p className="mt-2 text-sm text-muted-foreground">拖拽图片到此处或点击下方按钮上传</p>
          <p className="mt-1 text-xs text-muted-foreground">上传后将与正面模型图组合生成效果图</p>
          <p className="mt-4 text-sm font-medium text-foreground">{statusText}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              <Upload className="mr-2 h-4 w-4" />
              {customImage ? '更换自定义素材' : '上传自定义素材'}
            </Button>
            {customImage && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onReset();
                  toast({ title: '已恢复默认素材', description: '再次使用步骤1上传的正面模型图。' });
                }}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                恢复默认
              </Button>
            )}
          </div>
          {!frontImage && (
            <p className="mt-4 text-xs text-destructive">尚未上传正面模型图，暂无法生成双图效果。</p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            handleFile(file);
            e.currentTarget.value = '';
          }}
        />
      </CardContent>
    </Card>
  );
};

export default DualPreviewUploader;
