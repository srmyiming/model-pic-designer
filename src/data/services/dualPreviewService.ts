import { RepairService } from '@/types/repair';

export const dualPreviewService: RepairService = {
  id: 'dual-preview-front',
  title: 'Dual Preview Front',
  titleCN: '双图效果 · 正面',
  description: '使用正面模型图作为右侧参照，左侧可上传自定义素材。',
  category: 'hardware',
  thumbnail: '/service-previews/Cambiar Pantalla Xiaomi 15....jpg',
  needsPartImage: true,
  useModelSide: 'front',
  layout: {
    type: 'side-by-side',
    leftWidthCanvasRatio: 0.38,
    leftCanvasOffsetRatioX: 0.10,
    rightHeightRatio: 0.80,
    badges: [
      { src: '/assets/badges/logo2.png', widthRatio: 0.07, yRatio: 0.42 },
      { src: '/assets/badges/logo1.png', widthRatio: 0.07, yRatio: 0.62 },
    ],
  },
  implemented: true,
};
