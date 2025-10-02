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
    needsPartImage: true,
    // 使用背面模型作为右侧对照图
    useModelSide: 'back',
    // 使用与电池一致的并排布局参数
    layout: {
      type: 'side-by-side',
      leftWidthCanvasRatio: 0.38,
      leftCanvasOffsetRatioX: 0.10,
      rightHeightRatio: 0.80,
      badges: [
        { src: '/assets/badges/logo2.png', widthRatio: 0.07, yRatio: 0.42 },
        { src: '/assets/badges/logo1.png', widthRatio: 0.07, yRatio: 0.62 },
      ],
    }
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
