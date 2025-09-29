import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, X, Download, Settings, Eye } from 'lucide-react';
import { ProcessedImage, ServiceSelection } from '@/types/repair';

interface ProcessingPreviewProps {
  selections: Record<string, ServiceSelection>;
  processedImages: ProcessedImage[];
  onImageApproval: (serviceId: string, approved: boolean) => void;
  onDownload: (sku: string) => void;
  isProcessing: boolean;
}

export const ProcessingPreview = ({ 
  selections, 
  processedImages, 
  onImageApproval, 
  onDownload,
  isProcessing 
}: ProcessingPreviewProps) => {
  const [sku, setSku] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const selectedServices = Object.values(selections).filter(s => s.isSelected);
  const processedCount = processedImages.length;
  const approvedCount = processedImages.filter(img => img.approved).length;
  const progress = selectedServices.length > 0 ? (processedCount / selectedServices.length) * 100 : 0;

  const handleDownload = () => {
    if (!sku.trim()) {
      alert('请输入文件的SKU');
      return;
    }
    onDownload(sku.trim());
  };

  const ProcessedImageCard = ({ image }: { image: ProcessedImage }) => (
    <Card className={`transition-all duration-300 ${
      image.approved ? 'border-success shadow-elegant' : 'border-warning'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {selectedServices.find(s => s.serviceId === image.serviceId)?.serviceId || '服务'}
          </CardTitle>
          <Badge variant={image.approved ? "default" : "secondary"}>
            {image.approved ? '已批准' : '待处理'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">原图</p>
            <div className="relative">
              <img
                src={image.originalImage}
                alt="原图"
                className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setPreviewImage(image.originalImage)}
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-1 right-1 w-6 h-6 p-0"
                onClick={() => setPreviewImage(image.originalImage)}
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">处理后</p>
            <div className="relative">
              <img
                src={image.processedImage}
                alt="处理后"
                className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setPreviewImage(image.processedImage)}
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-1 right-1 w-6 h-6 p-0"
                onClick={() => setPreviewImage(image.processedImage)}
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={image.approved ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => onImageApproval(image.serviceId, true)}
          >
            <Check className="h-3 w-3 mr-1" />
            批准
          </Button>
          <Button
            variant={!image.approved ? "destructive" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => onImageApproval(image.serviceId, false)}
          >
            <X className="h-3 w-3 mr-1" />
            拒绝
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">预览和处理</h2>
        <p className="text-muted-foreground">
          检查处理后的图片并批准正确的图片
        </p>
        
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full max-w-md mx-auto" />
            <p className="text-sm text-muted-foreground">
              正在处理 {processedCount} / {selectedServices.length} 个服务...
            </p>
          </div>
        )}
      </div>

      {processedImages.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedImages.map((image) => (
              <ProcessedImageCard key={image.serviceId} image={image} />
            ))}
          </div>

          {!isProcessing && (
            <Card className="bg-gradient-primary text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">下载文件</h3>
                    <p className="text-sm opacity-90 mb-4">
                      {approvedCount} / {processedImages.length} 张图片已批准
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="输入SKU..."
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        className="flex-1 px-3 py-2 rounded border text-foreground bg-background"
                      />
                      <Button
                        variant="secondary"
                        onClick={handleDownload}
                        disabled={approvedCount === 0 || !sku.trim()}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        下载压缩包
                      </Button>
                    </div>
                  </div>
                </div>
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