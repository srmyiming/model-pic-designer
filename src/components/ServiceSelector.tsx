import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Check } from 'lucide-react';
import { REPAIR_SERVICES, RepairService, ServiceSelection } from '@/types/repair';

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
  screen: 'Pantalla',
  hardware: 'Hardware',
  protection: 'Protección',
  camera: 'Cámara',
  audio: 'Audio',
  buttons: 'Botones',
  system: 'Sistema',
};

export const ServiceSelector = ({ selections, onSelectionChange }: ServiceSelectorProps) => {
  const [selectAll, setSelectAll] = useState(false);

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

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    const newSelections: Record<string, ServiceSelection> = {};
    REPAIR_SERVICES.forEach(service => {
      newSelections[service.id] = {
        serviceId: service.id,
        isSelected: newSelectAll,
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

  const ServiceCard = ({ service }: { service: RepairService }) => {
    const isSelected = selections[service.id]?.isSelected || false;
    const hasCustomImage = selections[service.id]?.customImage;

    return (
      <Card className={`transition-all duration-300 cursor-pointer hover:shadow-elegant ${
        isSelected ? 'ring-2 ring-primary border-primary shadow-glow' : 'hover:border-primary/50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => handleServiceToggle(service)}
              className="mt-1"
            />
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={categoryColors[service.category]}>
                    {categoryLabels[service.category]}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm leading-tight">
                  {service.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {service.description}
                </p>
              </div>
              
              <div className="space-y-2">
                {hasCustomImage ? (
                  <div className="flex items-center gap-2 text-success text-xs">
                    <Check className="h-3 w-3" />
                    <span>Imagen personalizada cargada</span>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Sin imagen personalizada
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
                  className="w-full text-xs h-8"
                  asChild
                >
                  <label htmlFor={`service-${service.id}`} className="cursor-pointer">
                    <Upload className="h-3 w-3 mr-1" />
                    {hasCustomImage ? 'Cambiar imagen' : 'Subir imagen'}
                  </label>
                </Button>
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
          <h2 className="text-2xl font-bold">Seleccionar Servicios</h2>
          <p className="text-muted-foreground">
            Elige los servicios que necesitas y sube imágenes personalizadas si es necesario
          </p>
        </div>
        <div className="text-right space-y-2">
          <div className="text-sm text-muted-foreground">
            {selectedCount} servicios seleccionados
          </div>
          <Button
            variant="outline"
            onClick={handleSelectAll}
            className="text-sm"
          >
            {selectAll ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPAIR_SERVICES.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
};