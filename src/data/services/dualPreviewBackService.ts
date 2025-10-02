import { RepairService } from '@/types/repair';

export const dualPreviewBackService: RepairService = {
  id: 'dual-preview-back',
  title: 'Dual Preview Back',
  titleCN: '双图效果 · 背面',
  description: '使用背面模型图作为右侧参照，左侧可上传自定义素材。',
  category: 'hardware',
  thumbnail: '/service-previews/Cambiar Tapa Trasera Xiaomi....jpg',
  needsPartImage: true,
  useModelSide: 'back',
  layout: {
    type: 'side-by-side',
    // 放大配件（背面同策略）
    leftWidthCanvasRatio: 0.46,
    // 保持中缝留白
    leftCanvasOffsetRatioX: 0.04,
    rightHeightRatio: 0.80,
    badges: [
      { src: '/assets/badges/logo2.png', widthRatio: 0.07, yRatio: 0.42 },
      { src: '/assets/badges/logo1.png', widthRatio: 0.07, yRatio: 0.62 },
    ],
  },
  implemented: true,
};
