import { useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { DragEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Trash2 } from 'lucide-react';
import { BackgroundRemovalConfig } from '@/types/repair';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';

interface DualFreeStepProps {
  bgRemovalConfig: BackgroundRemovalConfig;
  leftFiles: File[];
  setLeftFiles: Dispatch<SetStateAction<File[]>>;
  rightFile: File | null;
  setRightFile: Dispatch<SetStateAction<File | null>>;
  cutoutLeft: boolean;
  setCutoutLeft: Dispatch<SetStateAction<boolean>>;
  cutoutRight: boolean;
  setCutoutRight: Dispatch<SetStateAction<boolean>>;
  whiteCrop: boolean;
  setWhiteCrop: Dispatch<SetStateAction<boolean>>;
  leftWidth: number; // 0..1
  setLeftWidth: Dispatch<SetStateAction<number>>;
  leftOffset: number; // 0..1
  setLeftOffset: Dispatch<SetStateAction<number>>;
  rightHeight: number; // 0..1
  setRightHeight: Dispatch<SetStateAction<number>>;
}

export const DualFreeStep = ({
  bgRemovalConfig,
  leftFiles,
  setLeftFiles,
  rightFile,
  setRightFile,
  cutoutLeft,
  setCutoutLeft,
  cutoutRight,
  setCutoutRight,
  whiteCrop,
  setWhiteCrop,
  leftWidth,
  setLeftWidth,
  leftOffset,
  setLeftOffset,
  rightHeight,
  setRightHeight,
}: DualFreeStepProps) => {
  const { removeImageBackground } = useBackgroundRemoval();
  const leftInputRef = useRef<HTMLInputElement | null>(null);
  const rightInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (cutoutLeft && whiteCrop) {
      setWhiteCrop(false);
    }
  }, [cutoutLeft, whiteCrop, setWhiteCrop]);

  const processFile = async (file: File, enableCutout: boolean): Promise<File> => {
    if (!enableCutout) {
      return file;
    }

    try {
      const blob = await removeImageBackground(
        file,
        bgRemovalConfig?.useWebGPU === true,
        bgRemovalConfig?.highQuality !== false
      );
      if (blob) {
        const safeName = file.name.replace(/\.(jpg|jpeg|png|webp)$/i, '') || 'image';
        return new File([blob], `${safeName}.png`, { type: 'image/png' });
      }
      return file;
    } catch {
      return file;
    }
  };

  const onLeftFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const processed = await Promise.all(arr.map(item => processFile(item, cutoutLeft)));
    setLeftFiles(prev => [...prev, ...processed]);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleLeftDrop = async (event: DragEvent<HTMLDivElement>) => {
    handleDragOver(event);
    if (event.dataTransfer?.files?.length) {
      await onLeftFiles(event.dataTransfer.files);
    }
  };

  const onRightFile = async (file: File | null) => {
    if (!file) return;
    const processed = await processFile(file, cutoutRight);
    setRightFile(processed);
  };

  const handleRightDrop = (event: DragEvent<HTMLDivElement>) => {
    handleDragOver(event);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      onRightFile(file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 text-sm font-semibold">左侧 · 配件图（可多张）</div>
            <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
              <label className="flex items-center gap-2">
                <Checkbox checked={cutoutLeft} onCheckedChange={(checked) => setCutoutLeft(checked === true)} />
                上传时抠图
              </label>
              <label className={`flex items-center gap-2 ${cutoutLeft ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <Checkbox
                  checked={whiteCrop}
                  disabled={cutoutLeft}
                  onCheckedChange={(checked) => setWhiteCrop(checked === true)}
                />
                白底自动裁剪
              </label>
            </div>
            <div
              className="border-2 border-dashed rounded-md p-4 text-center"
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDrop={handleLeftDrop}
            >
              <div className="text-sm text-muted-foreground mb-2">拖拽到此或点击添加</div>
              <Button variant="outline" size="sm" onClick={() => leftInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> 添加配件图片
              </Button>
              <input ref={leftInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e=>{onLeftFiles(e.target.files); e.currentTarget.value='';}} />
            </div>
            {leftFiles.length>0 && (
              <ul className="mt-3 max-h-40 overflow-auto text-xs space-y-2">
                {leftFiles.map((f,i) => (
                  <li key={i} className="flex items-center justify-between border rounded px-2 py-1">
                    <span className="truncate mr-2">{f.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLeftFiles(prev => prev.filter((_, idx) => idx !== i));
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-2 text-sm font-semibold">右侧 · 模型图（单张）</div>
            <div className="mb-3 flex items-center justify-end text-xs text-muted-foreground">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={cutoutRight}
                  onCheckedChange={checked => setCutoutRight(checked === true)}
                />
                上传时抠图
              </label>
            </div>
            <div
              className="border-2 border-dashed rounded-md p-4 text-center"
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDrop={handleRightDrop}
            >
              <div className="text-sm text-muted-foreground mb-2">拖拽到此或点击上传</div>
              <Button variant="outline" size="sm" onClick={() => rightInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> {rightFile ? '更换模型图' : '上传模型图'}
              </Button>
              <input
                ref={rightInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  onRightFile(f);
                  e.currentTarget.value = '';
                }}
              />
              {rightFile && (
                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-green-600">
                  <span>✓ 已上传：{rightFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRightFile(null)}
                  >
                    清除
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 text-sm font-semibold">参数</div>
          <div className="grid md:grid-cols-3 gap-4 text-xs">
            <label className="space-y-2">
              <div>左图宽度 {leftWidth.toFixed(2)}</div>
              <input type="range" min={0.34} max={0.52} step={0.01} value={leftWidth} onChange={e=>setLeftWidth(parseFloat(e.target.value))} />
            </label>
            <label className="space-y-2">
              <div>左图左偏移 {leftOffset.toFixed(2)}</div>
              <input type="range" min={0.02} max={0.08} step={0.01} value={leftOffset} onChange={e=>setLeftOffset(parseFloat(e.target.value))} />
            </label>
            <label className="space-y-2">
              <div>右图高度 {rightHeight.toFixed(2)}</div>
              <input type="range" min={0.74} max={0.86} step={0.01} value={rightHeight} onChange={e=>setRightHeight(parseFloat(e.target.value))} />
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DualFreeStep;
