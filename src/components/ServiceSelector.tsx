import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Check } from 'lucide-react';
import { RepairService, ServiceSelection } from '@/types/repair';
import { ALL_SERVICES } from '@/data/services';
import { useRef, useCallback, useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from '@/hooks/use-toast';

interface ServiceSelectorProps {
  selections: Record<string, ServiceSelection>;
  onSelectionChange: Dispatch<SetStateAction<Record<string, ServiceSelection>>>;
  frontImage: File | null;
  dualPreviewImage: File | null;
  onDualPreviewChange: (file: File | null) => void;
}

export const ServiceSelector = ({ selections, onSelectionChange, frontImage, dualPreviewImage, onDualPreviewChange }: ServiceSelectorProps) => {
  const handleServiceToggle = useCallback((service: RepairService) => {
    onSelectionChange(prev => {
      const current = prev[service.id];
      const next: ServiceSelection = {
        serviceId: service.id,
        customImage: current?.customImage,
        customPreviewUrl: current?.customPreviewUrl,
        isSelected: !(current?.isSelected ?? false),
      };
      return {
        ...prev,
        [service.id]: next,
      };
    });
  }, [onSelectionChange]);

  // 展示所有已实现服务，额外保留“更换后置摄像头”和“双图效果”
  const visibleServices = ALL_SERVICES.filter(
    (s) => (s.implemented === true || s.id === 'rear-camera') && s.id !== 'charging-port' && s.id !== 'dual-preview-front'
  );

  // 计算是否所有可见服务都被选中
  const allImplementedSelected = visibleServices.every(
    service => selections[service.id]?.isSelected
  );

  const handleSelectAll = useCallback(() => {
    onSelectionChange(prev => {
      const next: Record<string, ServiceSelection> = { ...prev };
      visibleServices.forEach(service => {
        const existing = prev[service.id];
        next[service.id] = {
          serviceId: service.id,
          customImage: existing?.customImage,
          customPreviewUrl: existing?.customPreviewUrl,
          isSelected: !allImplementedSelected,
        };
      });
      return next;
    });
  }, [allImplementedSelected, onSelectionChange, visibleServices]);

  const handleImageUpload = useCallback((serviceId: string, file: File) => {
    const preview = URL.createObjectURL(file);
    toast({
      title: '配件图已上传',
      description: '预览已更新，可继续配置其他产品。',
    });
    onSelectionChange(prev => ({
      ...prev,
      [serviceId]: {
        serviceId,
        customImage: file,
        customPreviewUrl: preview,
        isSelected: true,
      },
    }));
  }, [onSelectionChange]);

  const selectedCount = visibleServices.filter(s => selections[s.id]?.isSelected).length;

  // Check if any selected service needs part image but hasn't uploaded and has no default
  const missingImages = visibleServices.filter(service => {
    const sel = selections[service.id];
    return sel?.isSelected && service.needsPartImage && !sel.customImage && !service.defaultPartImage;
  });

  const ServiceCard = ({ service, index }: { service: RepairService; index: number }) => {
    const isSelected = selections[service.id]?.isSelected || false;
    const hasCustomImage = selections[service.id]?.customImage;
    const previewUrl = selections[service.id]?.customPreviewUrl || '';
    // 允许 'rear-camera' 当作已实现使用
    const isImplemented = service.implemented === true || service.id === 'rear-camera';
    const inputRef = useRef<HTMLInputElement | null>(null);

    return (
      <Card
        className={`transition-all duration-200 ${
          isImplemented ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed'
        } ${
          isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
        }`}
        onClick={() => isImplemented && handleServiceToggle(service)}
      >
        <CardContent className="p-2">
          <div className="space-y-1.5">
            {/* 预览图 - 正方形 */}
            <div className="relative aspect-square rounded overflow-hidden bg-muted">
              <img
                src={service.thumbnail}
                alt={service.titleCN}
                className={`w-full h-full object-cover ${!isImplemented ? 'grayscale opacity-50' : ''}`}
              />

              {/* 未实现蒙层 */}
              {!isImplemented && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold bg-black/80 px-2 py-1 rounded">
                    未实现
                  </span>
                </div>
              )}

              <div className="absolute top-1 left-1">
                <Checkbox
                  checked={isSelected}
                  disabled={!isImplemented}
                  className="bg-white shadow-sm h-4 w-4 pointer-events-none"
                />
              </div>
              {service.needsPartImage && previewUrl && (() => {
                const sLayout: any = (service as any).layout || {};
                const widthPercent = Math.max(5, Math.min(90, (sLayout.leftWidthCanvasRatio ?? 0.38) * 100));
                const leftPercent = Math.max(0, Math.min(90, (sLayout.leftCanvasOffsetRatioX ?? 0.10) * 100));
                return (
                  <div
                    className="absolute z-10 rounded-md border border-white/70 bg-white/40 backdrop-blur-[1px] shadow-md overflow-hidden"
                    style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, top: '50%', transform: 'translateY(-50%)', height: '80%' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img src={previewUrl} alt="配件预览" className="w-full h-full object-contain" />
                    <div className="absolute top-0 left-0 text-[10px] bg-black/50 text-white px-1 py-0.5">配件预览</div>
                  </div>
                );
              })()}
              <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                {index}
              </div>
            </div>

            {/* 服务信息 */}
            <div className="space-y-0.5">
              <h3 className="font-semibold text-xs leading-tight line-clamp-2">
                {service.titleCN}
              </h3>
            </div>

            {/* 上传配件图 */}
            <div className="space-y-1">
              {service.needsPartImage ? (
                <>
                  {hasCustomImage && (
                    <div className="flex items-center gap-1 text-success text-[10px]">
                      <Check className="h-2.5 w-2.5" />
                      <span>已上传</span>
                    </div>
                  )}

                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(service.id, file);
                      // 允许选择同一个文件时也能再次触发 change
                      e.currentTarget.value = '';
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px] h-6 px-2"
                    disabled={!isImplemented}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      inputRef.current?.click();
                    }}
                  >
                    <Upload className="h-2.5 w-2.5 mr-0.5" />
                    {hasCustomImage ? '更换' : '上传产品图'}
                  </Button>
                </>
              ) : (
                <div className="text-[10px] text-muted-foreground text-center py-1">
                  使用{service.useModelSide === 'front' ? '正面' : '背面'}模型图
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 专用：双图效果服务卡（不沿用通用卡片样式）
  const DualPreviewServiceCard = () => {
    const isSelected = !!selections['dual-preview-front']?.isSelected;
    const hasCustom = !!dualPreviewImage;
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // 仅在已上传自定义素材时显示预览
    useEffect(() => {
      if (!dualPreviewImage) {
        if (previewUrl) {
          try { URL.revokeObjectURL(previewUrl); } catch {}
        }
        setPreviewUrl(null);
        return;
      }
      const url = URL.createObjectURL(dualPreviewImage);
      setPreviewUrl(url);
      return () => {
        try { URL.revokeObjectURL(url); } catch {}
      };
    }, [dualPreviewImage]);

    const statusText = hasCustom
      ? '已上传自定义素材，可更换或恢复默认'
      : frontImage
      ? '默认使用正面模型图，上传后替换左侧'
      : '请先在步骤1上传正面模型图';

    const disabled = false; // 允许随时上传；若缺少正面图，生成阶段会提示

    const selectToggle = () => {
      onSelectionChange(prev => ({
        ...prev,
        ['dual-preview-front']: {
          serviceId: 'dual-preview-front',
          customImage: prev['dual-preview-front']?.customImage,
          customPreviewUrl: prev['dual-preview-front']?.customPreviewUrl,
          isSelected: !(prev['dual-preview-front']?.isSelected ?? false),
        },
      }));
    };

    const handleUpload = (file: File) => {
      onDualPreviewChange(file);
      onSelectionChange(prev => ({
        ...prev,
        ['dual-preview-front']: {
          serviceId: 'dual-preview-front',
          customImage: file,
          customPreviewUrl: prev['dual-preview-front']?.customPreviewUrl, // 由外层 effect 刷新
          isSelected: true,
        },
      }));
      toast({ title: '双图素材已更新', description: '已设为选中，将使用左侧自定义素材。' });
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f && f.type.startsWith('image/')) handleUpload(f);
    };

    return (
      <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}>
        <CardContent className="p-2">
          <div className="space-y-1.5">
            <div
              className={`relative aspect-square rounded overflow-hidden border-2 border-dashed flex items-center justify-center text-center p-4 ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/40'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="自定义素材预览" className="max-h-full max-w-full object-contain rounded" />
              ) : (
                <div>
                  <Upload className="mx-auto h-6 w-6 text-primary" />
                  <div className="mt-2 text-xs text-muted-foreground">拖拽图片到此处或点击下方按钮上传</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{statusText}</div>
                </div>
              )}
              <div className="absolute top-1 left-1">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={selectToggle}
                  disabled={!hasCustom}
                  className="bg-white shadow-sm h-4 w-4"
                />
              </div>
            </div>
            <div className="space-y-0.5">
              <h3 className="font-semibold text-xs leading-tight">双图效果 · 正面</h3>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground text-center py-1">
                {hasCustom ? '✓ 已上传' : '使用正面模型图'}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.currentTarget.value = '';
                }}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-[10px] h-6 px-2"
                  disabled={disabled}
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                >
                  <Upload className="h-2.5 w-2.5 mr-0.5" /> {hasCustom ? '更换' : '上传自定义素材'}
                </Button>
                {hasCustom && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px] h-6 px-2"
                    onClick={(e) => { e.stopPropagation(); onDualPreviewChange(null); selectToggle(); }}
                  >
                    取消选择
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">选择产品类目</h2>
          <p className="text-muted-foreground">
            选择需要生成的产品图片，并上传对应的产品白底图
          </p>
        </div>
        <div className="text-right space-y-2">
          <div className="text-sm text-muted-foreground">
            已选择 {selectedCount} 个产品
          </div>
          <Button
            variant="outline"
            onClick={handleSelectAll}
            className="text-sm"
          >
            {allImplementedSelected ? '取消全选' : '全选产品'}
          </Button>
        </div>
      </div>

      {missingImages.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 mt-0.5">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">需要上传产品图</h3>
              <p className="text-sm text-yellow-800 mb-2">
                以下已选择的产品需要上传白底图才能生成：
              </p>
              <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
                {missingImages.map(service => (
                  <li key={service.id}>{service.titleCN}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {visibleServices.map((service, index) => (
          <ServiceCard key={service.id} service={service} index={index + 1} />
        ))}
        <DualPreviewServiceCard />
      </div>
    </div>
  );
};
