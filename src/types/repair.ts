export interface RepairService {
  id: string;
  title: string;
  titleCN: string;
  description: string;
  category: 'screen' | 'hardware' | 'protection' | 'camera' | 'audio' | 'buttons' | 'system';
  thumbnail: string;
  needsPartImage: boolean;
  useModelSide?: 'front' | 'back';
}

export interface DeviceImages {
  front: File | null;
  back: File | null;
}

export interface ServiceSelection {
  serviceId: string;
  customImage?: File;
  isSelected: boolean;
}

export interface ProcessedImage {
  serviceId: string;
  originalImage: string;
  processedImage: string;
  approved: boolean;
}

/**
 * @deprecated
 * 此常量已废弃，请使用 @/data/services 中的 ALL_SERVICES
 * 保留此导出是为了向后兼容，避免破坏现有代码
 */
export const REPAIR_SERVICES: RepairService[] = [];