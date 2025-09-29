import { RepairService } from '@/types/repair';

/**
 * 按键类服务
 * 需要上传按键配件的白底图
 */
export const buttonServices: RepairService[] = [
  {
    id: 'power-button',
    title: 'Cambiar Botón De Encendido Xiaomi 15 Ultra',
    titleCN: '更换电源键',
    description: '修复或更换开关机按键',
    category: 'buttons',
    thumbnail: '/service-previews/Cambiar Botón de Encendido....jpg',
    needsPartImage: true
  },
  {
    id: 'volume-buttons',
    title: 'Cambiar Botón De Volumen Xiaomi 15 Ultra',
    titleCN: '更换音量键',
    description: '修复或更换音量调节按键',
    category: 'buttons',
    thumbnail: '/service-previews/Cambiar Botón de Volumen....jpg',
    needsPartImage: true
  }
];