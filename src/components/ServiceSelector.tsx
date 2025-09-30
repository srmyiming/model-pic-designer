import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Check } from 'lucide-react';
import { RepairService, ServiceSelection } from '@/types/repair';
import { ALL_SERVICES } from '@/data/services';

interface ServiceSelectorProps {
  selections: Record<string, ServiceSelection>;
  onSelectionChange: (selections: Record<string, ServiceSelection>) => void;
}

const categoryColors = {
  screen: 'bg-blue-100 text-blue-800',
  hardware: 'bg-green-100 text-green-800',
  protection: 'bg-purple-100 text-purple-800',
  camera: 'bg-orange-100 text-orange-800',
  audio: 'bg-pink-100 text-pink-800',
  buttons: 'bg-cyan-100 text-cyan-800',
  system: 'bg-red-100 text-red-800',
};

const categoryLabels = {
  screen: '屏幕',
  hardware: '硬件',
  protection: '保护',
  camera: '摄像头',
  audio: '音频',
  buttons: '按键',
  system: '系统',
};

export const ServiceSelector = ({ selections, onSelectionChange }: ServiceSelectorProps) => {
  const handleServiceToggle = (service: RepairService) => {
    const newSelections = {
      ...selections,
      [service.id]: {
        serviceId: service.id,
        isSelected: !selections[service.id]?.isSelected,
        customImage: selections[service.id]?.customImage,
      }
    };
    onSelectionChange(newSelections);
  };

  // 计算是否所有已实现的产品都被选中了
  const implementedServices = ALL_SERVICES.filter(s => s.implemented === true);
  const allImplementedSelected = implementedServices.every(
    service => selections[service.id]?.isSelected
  );

  const handleSelectAll = () => {
    const newSelections: Record<string, ServiceSelection> = {};
    ALL_SERVICES.forEach(service => {
      const isImplemented = service.implemented === true;
      newSelections[service.id] = {
        serviceId: service.id,
        // 如果当前是全选状态，就取消全选；否则全选
        isSelected: isImplemented ? !allImplementedSelected : false,
        customImage: selections[service.id]?.customImage,
      };
    });
    onSelectionChange(newSelections);
  };

  const handleImageUpload = (serviceId: string, file: File) => {
    const newSelections = {
      ...selections,
      [serviceId]: {
        ...selections[serviceId],
        serviceId,
        customImage: file,
        isSelected: true,
      }
    };
    onSelectionChange(newSelections);
  };

  const selectedCount = Object.values(selections).filter(s => s.isSelected).length;

  // Check if any selected service needs part image but hasn't uploaded and has no default
  const missingImages = ALL_SERVICES.filter(service => {
    const sel = selections[service.id];
    return sel?.isSelected && service.needsPartImage && !sel.customImage && !service.defaultPartImage;
  });

  const ServiceCard = ({ service, index }: { service: RepairService; index: number }) => {
    const isSelected = selections[service.id]?.isSelected || false;
    const hasCustomImage = selections[service.id]?.customImage;
    const isImplemented = service.implemented === true; // Only true if explicitly set

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
                    type="file"
                    accept="image/*"
                    id={`service-${service.id}`}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(service.id, file);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px] h-6 px-2"
                    asChild
                    disabled={!isImplemented}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <label htmlFor={`service-${service.id}`} className="cursor-pointer">
                      <Upload className="h-2.5 w-2.5 mr-0.5" />
                      {hasCustomImage ? '更换' : '上传产品图'}
                    </label>
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
        {ALL_SERVICES.map((service, index) => (
          <ServiceCard key={service.id} service={service} index={index + 1} />
        ))}
      </div>
    </div>
  );
};