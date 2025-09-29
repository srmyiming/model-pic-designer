import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Eye, X } from 'lucide-react';
import { ProcessedImage, ServiceSelection } from '@/types/repair';

interface ProcessingPreviewProps {
  selections: Record<string, ServiceSelection>;
  processedImages: ProcessedImage[];
  onImageApproval: (serviceId: string, approved: boolean) => void;
  onDownload: (sku: string) => void;
  isProcessing: boolean;
  sku: string;
}

export const ProcessingPreview = ({
  selections,
  processedImages,
  onImageApproval,
  onDownload,
  isProcessing,
  sku
}: ProcessingPreviewProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const selectedServices = Object.values(selections).filter(s => s.isSelected);
  const processedCount = processedImages.length;
  const progress = selectedServices.length > 0 ? (processedCount / selectedServices.length) * 100 : 0;

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      processedImages.forEach(img => {
        URL.revokeObjectURL(img.originalImage);
        URL.revokeObjectURL(img.processedImage);
      });
    };
  }, [processedImages]);

  const handleDownload = () => {
    onDownload(sku);
  };

  const ProcessedImageCard = ({ image }: { image: ProcessedImage }) => (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardContent className="p-4">
        <div
          className="relative aspect-square cursor-pointer group"
          onClick={() => setPreviewImage(image.processedImage)}
        >
          <img
            src={image.processedImage}
            alt="生成的产品图"
            className="w-full h-full object-contain rounded-lg bg-gray-50"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">生成预览</h2>
        <p className="text-muted-foreground">
          查看并下载生成的产品图片（800x800像素）
        </p>

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full max-w-md mx-auto" />
            <p className="text-sm text-muted-foreground">
              正在生成 {processedCount} / {selectedServices.length} 张图片...
            </p>
          </div>
        )}
      </div>

      {processedImages.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {processedImages.map((image) => (
              <ProcessedImageCard key={image.serviceId} image={image} />
            ))}
          </div>

          {!isProcessing && (
            <Card className="bg-gradient-primary text-primary-foreground max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">批量下载</h3>
                <p className="text-sm opacity-90 mb-4">
                  共 {processedImages.length} 张图片 · 文件名：{sku}.zip
                </p>
                <Button
                  variant="secondary"
                  onClick={handleDownload}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  下载所有图片
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] p-4">
            <img
              src={previewImage}
              alt="预览"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <Button
              variant="outline"
              className="absolute top-4 right-4"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};