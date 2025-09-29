import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ImageUploader } from '@/components/ImageUploader';
import { ServiceSelector } from '@/components/ServiceSelector';
import { ProcessingPreview } from '@/components/ProcessingPreview';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import { DeviceImages, ServiceSelection } from '@/types/repair';
import { ChevronRight, ChevronLeft, Smartphone, Wrench, Download } from 'lucide-react';

const Index = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [deviceImages, setDeviceImages] = useState<DeviceImages>({
    front: null,
    back: null,
  });
  const [selections, setSelections] = useState<Record<string, ServiceSelection>>({});

  const {
    processedImages,
    isProcessing,
    processImages,
    updateImageApproval,
    downloadApprovedImages,
  } = useImageProcessing();

  const steps = [
    { id: 'upload', title: 'Subir Imágenes', icon: Smartphone },
    { id: 'select', title: 'Seleccionar Servicios', icon: Wrench },
    { id: 'process', title: 'Procesar y Descargar', icon: Download },
  ];

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 1:
        return deviceImages.front !== null && deviceImages.back !== null;
      case 2:
        return Object.values(selections).some(s => s.isSelected);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1 && canProceedToStep(currentStep + 1)) {
      if (currentStep === 1) {
        // Start processing when moving to step 2
        processImages(deviceImages, selections);
      }
      setCurrentStep(currentStep + 1);
    }
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
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Sistema de Procesamiento de Imágenes de Reparación
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sube imágenes de dispositivos, selecciona servicios de reparación y genera 
              materiales promocionales profesionales automáticamente
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
              Anterior
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={currentStep === steps.length - 1 || !canProceedToStep(currentStep + 1)}
              className="flex items-center gap-2"
            >
              {currentStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;