import { RepairService } from '@/types/repair';

/**
 * 摄像头类服务
 * 需要上传摄像头或相关配件的白底图
 */
export const cameraServices: RepairService[] = [
  {
    id: 'camera-glass',
    title: 'Cambiar Cristal Cámara Trasera Xiaomi 15 Ultra',
    titleCN: '更换后摄像头玻璃',
    description: '更换后置摄像头保护玻璃盖板',
    category: 'camera',
    thumbnail: '/service-previews/Cambiar Cristal Cámara....jpg',
    needsPartImage: true
  },
  {
    id: 'rear-camera',
    title: 'Cambiar Cámara Trasera Xiaomi 15 Ultra',
    titleCN: '更换后置摄像头',
    description: '更换后置主摄像头模组',
    category: 'camera',
    thumbnail: '/service-previews/Cambiar Cámara Trasera....jpg',
    needsPartImage: true
  },
  {
    id: 'front-camera',
    title: 'Cambiar Cámara Frontal Xiaomi 15 Ultra',
    titleCN: '更换前置摄像头',
    description: '更换前置自拍摄像头模组',
    category: 'camera',
    thumbnail: '/service-previews/Cambiar Cámara Frontal....jpg',
    needsPartImage: true
  }
];