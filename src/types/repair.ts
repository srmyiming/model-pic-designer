export interface RepairService {
  id: string;
  title: string;
  description: string;
  category: 'screen' | 'hardware' | 'protection' | 'camera' | 'audio' | 'buttons' | 'system';
  thumbnail?: string;
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

export const REPAIR_SERVICES: RepairService[] = [
  {
    id: 'screen-replacement',
    title: 'Cambiar Pantalla Xiaomi 15 Ultra',
    description: 'Reemplazo completo de pantalla LCD/OLED con marco y digitalizador',
    category: 'screen'
  },
  {
    id: 'back-cover',
    title: 'Cambiar Tapa Trasera Xiaomi 15 Ultra', 
    description: 'Reemplazo de la cubierta posterior del dispositivo',
    category: 'hardware'
  },
  {
    id: 'charging-port',
    title: 'Cambiar Conector De Carga Xiaomi 15 Ultra',
    description: 'Reparación o reemplazo del puerto de carga USB-C',
    category: 'hardware'
  },
  {
    id: 'camera-glass',
    title: 'Cambiar Cristal Cámara Trasera Xiaomi 15 Ultra',
    description: 'Reemplazo del cristal protector de la cámara trasera',
    category: 'camera'
  },
  {
    id: 'screen-protector-glass',
    title: 'Protector De Pantalla Xiaomi 15 Ultra Cristal Templado',
    description: 'Instalación de protector de pantalla de cristal templado',
    category: 'protection'
  },
  {
    id: 'screen-protector-hydrogel',
    title: 'Protector Hidrogel Para Pantalla Xiaomi 15 Ultra',
    description: 'Instalación de protector de pantalla de hidrogel flexible',
    category: 'protection'
  },
  {
    id: 'phone-case',
    title: 'Funda Antigolpe Xiaomi 15 Ultra Transparente',
    description: 'Funda protectora transparente resistente a impactos',
    category: 'protection'
  },
  {
    id: 'battery-replacement',
    title: 'Cambiar Batería Xiaomi 15 Ultra',
    description: 'Reemplazo de batería interna del dispositivo',
    category: 'hardware'
  },
  {
    id: 'rear-camera',
    title: 'Cambiar Cámara Trasera Xiaomi 15 Ultra',
    description: 'Reemplazo del módulo de cámara trasera principal',
    category: 'camera'
  },
  {
    id: 'front-camera',
    title: 'Cambiar Cámara Frontal Xiaomi 15 Ultra',
    description: 'Reemplazo del módulo de cámara frontal/selfie',
    category: 'camera'
  },
  {
    id: 'earpiece',
    title: 'Cambiar Auricular De Llamada Xiaomi 15 Ultra',
    description: 'Reemplazo del altavoz auricular para llamadas',
    category: 'audio'
  },
  {
    id: 'speaker',
    title: 'Cambiar Altavoz De Música Xiaomi 15 Ultra',
    description: 'Reemplazo del altavoz principal para multimedia',
    category: 'audio'
  },
  {
    id: 'power-button',
    title: 'Cambiar Botón De Encendido Xiaomi 15 Ultra',
    description: 'Reparación o reemplazo del botón de encendido/apagado',
    category: 'buttons'
  },
  {
    id: 'volume-buttons',
    title: 'Cambiar Botón De Volumen Xiaomi 15 Ultra',
    description: 'Reparación o reemplazo de los botones de volumen',
    category: 'buttons'
  },
  {
    id: 'no-power',
    title: 'Reparar Xiaomi 15 Ultra No Enciende',
    description: 'Diagnóstico y reparación de problemas de encendido',
    category: 'system'
  }
];