import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ImageUploader } from '@/components/ImageUploader';
import { ServiceSelector } from '@/components/ServiceSelector';
import { ProcessingPreview } from '@/components/ProcessingPreview';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import { DeviceImages, ServiceSelection } from '@/types/repair';
import { ChevronRight, ChevronLeft, Smartphone, Wrench, Download, X } from 'lucide-react';
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
        return true; // Allow proceeding to service selection without images
      case 2:
        return Object.values(selections).some(s => s.isSelected);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1 && canProceedToStep(currentStep + 1)) {
      if (currentStep === 1) {
        // Show SKU input dialog before processing
        setShowSkuDialog(true);
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
    setCurrentStep(2);
    // Start processing when SKU is confirmed
    processImages(deviceImages, selections);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const stepProgress = ((currentStep + 1) / steps.length) * 100;

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
          <ImageUploader
            deviceImages={deviceImages}
            onImagesChange={setDeviceImages}
          />
        );
      case 1:
        return (
          <ServiceSelector
            selections={selections}
            onSelectionChange={setSelections}
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <img
                src="/logo.jpg"
                alt="Reparacionmovil Logo"
                className="h-16 md:h-20 object-contain"
              />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              电商产品图片生成器
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              上传手机模型图，选择产品类目，自动生成专业的电商展示图
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator />

          {/* Main Content */}
          <div className="bg-card rounded-2xl shadow-elegant p-8 mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              上一步
            </Button>
            
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

      {/* SKU Input Dialog */}
      <Dialog open={showSkuDialog} onOpenChange={setShowSkuDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>输入产品SKU</DialogTitle>
            <DialogDescription>
              请输入SKU名称，用于生成文件名
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkuDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSkuSubmit}>
              确认并生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;