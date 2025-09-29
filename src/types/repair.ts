export interface OverlayArea {
  x: number;      // Percentage relative to image width (0-1)
  y: number;      // Percentage relative to image height (0-1)
  width: number;  // Percentage relative to image width (0-1)
  height: number; // Percentage relative to image height (0-1)
}

export interface CrackPoint {
  x: number;      // Percentage X position (0-1)
  y: number;      // Percentage Y position (0-1)
  size: number;   // Size relative to screen width (0-1)
}

export interface SideBySideLayoutConfig {
  type: 'side-by-side';
  dividerColor?: string;        // Vertical separator color
  dividerWidthRatio?: number;   // Separator width relative to final width (0-1)
}

export type ServiceLayout = SideBySideLayoutConfig;

export interface RepairService {
  id: string;
  title: string;
  titleCN: string;
  description: string;
  category: 'screen' | 'hardware' | 'protection' | 'camera' | 'audio' | 'buttons' | 'system';
  thumbnail: string;
  needsPartImage: boolean;
  useModelSide?: 'front' | 'back';
  overlayArea?: OverlayArea;     // Screen area to fill with black
  overlayImage?: string;         // PNG effect image path (single crack)
  crackPoints?: CrackPoint[];    // Multiple crack positions
  fillColor?: string;            // Background fill color for screen area
  layout?: ServiceLayout;        // Final composition layout configuration
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
