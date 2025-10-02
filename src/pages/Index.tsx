import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ImageUploader } from '@/components/ImageUploader';
import { ServiceSelector } from '@/components/ServiceSelector';
import { ProcessingPreview } from '@/components/ProcessingPreview';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import { DeviceImages, ServiceSelection, BackgroundRemovalConfig } from '@/types/repair';
import { BackgroundRemovalSettings } from '@/components/BackgroundRemovalSettings';
import { ChevronRight, ChevronLeft, Smartphone, Wrench, Download } from 'lucide-react';
import { ALL_SERVICES } from '@/data/services';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const Index = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [deviceImages, setDeviceImages] = useState<DeviceImages>({
    front: null,
    back: null,
  });
  const [selections, setSelections] = useState<Record<string, ServiceSelection>>({});
  const [showSkuDialog, setShowSkuDialog] = useState(false);
  const [sku, setSku] = useState('');
  const [showSkuOnImage, setShowSkuOnImage] = useState(true);
  const [bgRemovalConfig, setBgRemovalConfig] = useState<BackgroundRemovalConfig>({
    enabled: true,     // 默认开启（保持现有行为）
    useWebGPU: false,  // 默认关闭（保守策略）
    highQuality: true, // 默认开启高精度，参考较好版本效果
  });
  const [dualPreviewImage, setDualPreviewImage] = useState<File | null>(null);
  const [dualPreviewBackImage, setDualPreviewBackImage] = useState<File | null>(null);
  const [showDualFront, setShowDualFront] = useState<boolean>(false);
  const [showDualBack, setShowDualBack] = useState<boolean>(false);

  useEffect(() => {
    setSelections(prev => {
      const source = showDualFront ? (dualPreviewImage ?? deviceImages.front) : null;
      const current = prev['dual-preview-front'];

      if (!source) {
        if (!current) {
          return prev;
        }
        if (current.customPreviewUrl) {
          try { URL.revokeObjectURL(current.customPreviewUrl); } catch {}
        }
        const { ['dual-preview-front']: _, ...rest } = prev;
        return rest;
      }

      if (current?.customImage === source && current.customPreviewUrl) {
        return prev;
      }

      const preview = URL.createObjectURL(source);
      if (current?.customPreviewUrl) {
        try { URL.revokeObjectURL(current.customPreviewUrl); } catch {}
      }

      return {
        ...prev,
        ['dual-preview-front']: {
          serviceId: 'dual-preview-front',
          customImage: source,
          customPreviewUrl: preview,
          isSelected: current?.isSelected ?? false,
        },
      };
    });
  }, [showDualFront, dualPreviewImage, deviceImages.front]);

  useEffect(() => {
    setSelections(prev => {
      const source = showDualBack ? (dualPreviewBackImage ?? deviceImages.back) : null;
      const current = prev['dual-preview-back'];

      if (!source) {
        if (!current) return prev;
        if (current.customPreviewUrl) {
          try { URL.revokeObjectURL(current.customPreviewUrl); } catch {}
        }
        const { ['dual-preview-back']: _, ...rest } = prev;
        return rest;
      }

      if (current?.customImage === source && current.customPreviewUrl) {
        return prev;
      }

      const preview = URL.createObjectURL(source);
      if (current?.customPreviewUrl) {
        try { URL.revokeObjectURL(current.customPreviewUrl); } catch {}
      }

      return {
        ...prev,
        ['dual-preview-back']: {
          serviceId: 'dual-preview-back',
          customImage: source,
          customPreviewUrl: preview,
          isSelected: current?.isSelected ?? false,
        },
      };
    });
  }, [showDualBack, dualPreviewBackImage, deviceImages.back]);

  const {
    processedImages,
    isProcessing,
    processImages,
    updateImageApproval,
    downloadApprovedImages,
  } = useImageProcessing();

  const steps = [
    { id: 'upload', title: '上传模型图', icon: Smartphone },
    { id: 'select', title: '选择产品', icon: Wrench },
    { id: 'process', title: '生成下载', icon: Download },
  ];

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 1:
        // 步骤1: 不再要求品牌与型号，直接允许
        return true;
      case 2:
        // 步骤2: 检查服务选择完整性
        const hasSelection = Object.values(selections).some(s => s.isSelected);
        if (!hasSelection) return false;

        // Check if all selected services that need part images have them uploaded or have default
        const selectedServices = Object.values(selections).filter(s => s.isSelected);
        for (const sel of selectedServices) {
          const serviceConfig = ALL_SERVICES.find(s => s.id === sel.serviceId);
          if (serviceConfig?.needsPartImage && !sel.customImage && !serviceConfig.defaultPartImage) {
            return false; // Has selected service that needs image but hasn't uploaded and has no default
          }
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1 && canProceedToStep(currentStep + 1)) {
      if (currentStep === 0) {
        // Show SKU input dialog after step 1 (upload)
        setShowSkuDialog(true);
      } else if (currentStep === 1) {
        // From step 2 (service selection) to step 3 (preview), start processing
        setCurrentStep(2);
        processImages(deviceImages, selections, sku, showSkuOnImage);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleSkuSubmit = () => {
    if (!sku.trim()) {
      alert('请输入SKU名称');
      return;
    }
    setShowSkuDialog(false);
    // After SKU input in step 1, go to step 2 (service selection)
    setCurrentStep(1);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const stepProgress = ((currentStep + 1) / steps.length) * 100;

  const StickyNav = () => (
    <div className="fixed bottom-0 inset-x-0 z-50">
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-t-xl border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg px-4 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            上一步
          </Button>
          <div className="text-xs text-muted-foreground hidden sm:block">
            进度 {Math.round(stepProgress)}%
          </div>
          <Button
            onClick={handleNext}
            disabled={currentStep === steps.length - 1 || !canProceedToStep(currentStep + 1)}
            className="flex items-center gap-2"
          >
            {currentStep === steps.length - 1 ? '完成' : '下一步'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const StepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isAvailable = canProceedToStep(index);

          return (
            <div
              key={step.id}
              className={`flex items-center ${
                index < steps.length - 1 ? 'flex-1' : ''
              }`}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isActive
                      ? 'border-primary text-primary bg-primary/10'
                      : isAvailable
                      ? 'border-muted-foreground text-muted-foreground'
                      : 'border-muted text-muted'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-sm mt-2 transition-colors duration-300 ${
                    isActive
                      ? 'text-primary font-medium'
                      : isCompleted
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 transition-colors duration-300 ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <Progress value={stepProgress} className="w-full" />
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <BackgroundRemovalSettings
              config={bgRemovalConfig}
              onChange={setBgRemovalConfig}
            />
            <ImageUploader
              deviceImages={deviceImages}
              onImagesChange={setDeviceImages}
              bgRemovalConfig={bgRemovalConfig}
              compact
            />
          </>
        );
      case 1:
        return (
          <ServiceSelector
            selections={selections}
            onSelectionChange={setSelections}
            frontImage={deviceImages.front}
            dualPreviewImage={dualPreviewImage}
            onDualPreviewChange={setDualPreviewImage}
            backImage={deviceImages.back}
            dualPreviewBackImage={dualPreviewBackImage}
            onDualPreviewBackChange={setDualPreviewBackImage}
            showDualFront={showDualFront}
            showDualBack={showDualBack}
            onShowDualFront={setShowDualFront}
            onShowDualBack={setShowDualBack}
          />
        );
      case 2:
        return (
          <ProcessingPreview
            selections={selections}
            processedImages={processedImages}
            onImageApproval={updateImageApproval}
            onDownload={downloadApprovedImages}
            isProcessing={isProcessing}
            sku={sku}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 pb-24">
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img
                src="/assets/branding/logo.jpg"
                alt="Reparacionmovil Logo"
                className="h-12 md:h-14 object-contain"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              电商产品图片生成器
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              上传手机模型图，选择产品类目，自动生成专业的电商展示图
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator />

          {/* Main Content */}
          <div className="bg-card rounded-2xl shadow-elegant p-4 md:p-6 mb-4">
            {renderStepContent()}
          </div>

          {/* Navigation moved to sticky footer */}
        </div>
      </div>

      {/* SKU Input Dialog */}
      <Dialog open={showSkuDialog} onOpenChange={setShowSkuDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>输入产品SKU</DialogTitle>
            <DialogDescription>
              请输入SKU名称，用于生成文件名和图片标识
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Input
                type="text"
                placeholder="例如：Xiaomi-15-Ultra"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSkuSubmit();
                  }
                }}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showSkuOnImage"
                checked={showSkuOnImage}
                onChange={(e) => setShowSkuOnImage(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="showSkuOnImage" className="text-sm cursor-pointer">
                在图片上显示SKU名称
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkuDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSkuSubmit}>
              确认并继续
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <StickyNav />
    </div>
  );
};

export default Index;
