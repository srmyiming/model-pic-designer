import { RepairService } from '@/types/repair';

/**
 * 保护类服务
 * 需要上传保护配件（如手机壳）的白底图
 */
export const protectionServices: RepairService[] = [
  {
    id: 'phone-case',
    title: 'Funda Antigolpe Xiaomi 15 Ultra Transparente',
    titleCN: '透明防摔手机壳',
    description: '安装透明防摔保护壳',
    category: 'protection',
    thumbnail: '/service-previews/Funda Antigolpe Xiaomi 15....jpg',
    needsPartImage: true,
    layout: {
      type: 'single-centered',
      targetHeightRatio: 0.80,
      edgeBadges: [
        { src: '/assets/badges/logo2.png', widthRatio: 0.07, yRatio: 0.86, side: 'left' },
        { src: '/assets/badges/logo1.png', widthRatio: 0.07, yRatio: 0.86, side: 'right' },
      ],
    },
    implemented: true
  }
];