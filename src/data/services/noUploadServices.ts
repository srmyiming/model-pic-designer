import { RepairService } from '@/types/repair';

/**
 * 不需要上传配件图的服务
 * 这些服务直接使用模型图（正面或背面）
 */
export const noUploadServices: RepairService[] = [
  {
    id: 'screen-replacement',
    title: 'Cambiar Pantalla Xiaomi 15 Ultra',
    titleCN: '更换屏幕总成',
    description: '更换完整的 LCD/OLED 显示屏（含触控和边框）',
    category: 'screen',
    thumbnail: '/service-previews/Cambiar Pantalla Xiaomi 15....jpg',
    needsPartImage: false,
    useModelSide: 'front',
    overlayArea: {
      x: 0,
      y: 0,
      width: 1,
      height: 1
    },
    overlayImage: '/assets/overlays/cracked-screen.png',
    crackPoints: [
      { x: 0.33, y: 0.22, size: 0.62 },  // Top crack
      { x: 0.52, y: 0.50, size: 0.62 },  // Middle crack (same size)
      { x: 0.40, y: 0.78, size: 0.62 }   // Bottom crack (same size)
    ],
    fillColor: '#000000',
    layout: {
      type: 'side-by-side',
      dividerColor: '#0f172a',
      dividerWidthRatio: 0,
      badges: [
        { src: '/assets/badges/logo2.png', widthRatio: 0.07, yRatio: 0.42 },
        { src: '/assets/badges/logo1.png', widthRatio: 0.07, yRatio: 0.62 },
      ],
    },
    implemented: true
  },
  {
    id: 'back-cover',
    title: 'Cambiar Tapa Trasera Xiaomi 15 Ultra',
    titleCN: '更换后盖',
    description: '更换手机背部外壳',
    category: 'hardware',
    thumbnail: '/service-previews/Cambiar Tapa Trasera Xiaomi....jpg',
    needsPartImage: false,
    useModelSide: 'back',
    overlayArea: {
      x: 0.02,
      y: 0.02,
      width: 0.96,
      height: 0.96,
    },
    overlayImage: '/assets/overlays/cracked-screen.png',
    crackPoints: [
      { x: 0.35, y: 0.28, size: 0.55 },
      { x: 0.62, y: 0.52, size: 0.58 },
      { x: 0.38, y: 0.75, size: 0.54 },
    ],
    layout: {
      type: 'side-by-side',
      dividerColor: '#0f172a',
      dividerWidthRatio: 0,
      badges: [
        { src: '/assets/badges/logo2.png', widthRatio: 0.07, yRatio: 0.42 },
        { src: '/assets/badges/logo1.png', widthRatio: 0.07, yRatio: 0.62 },
      ],
    },
    implemented: true,
  },
  {
    id: 'screen-protector-glass',
    title: 'Protector De Pantalla Xiaomi 15 Ultra Cristal Templado',
    titleCN: '钢化玻璃膜',
    description: '贴钢化玻璃保护膜（防刮防摔）',
    category: 'protection',
    thumbnail: '/service-previews/Protector de Pantalla....jpg',
    needsPartImage: false,
    useModelSide: 'front',
    centerOverlayImage: '/assets/parts/screen-protector-glass.png',
    centerOverlayRatio: 1.0, // Special: will use custom glass protector layout
    layout: {
      type: 'single-centered',
      targetHeightRatio: 0.80,
      // 让“钢化膜+手机”组合整体向右轻微偏移，避免视觉偏左
      centerOffsetRatioX: 0.03,
      edgeBadges: [
        { src: '/assets/badges/logo2.png', widthRatio: 0.07, yRatio: 0.86, side: 'left' },
        { src: '/assets/badges/logo1.png', widthRatio: 0.07, yRatio: 0.86, side: 'right' },
      ],
    },
    implemented: true
  },
  {
    id: 'screen-protector-hydrogel',
    title: 'Protector Hidrogel Para Pantalla Xiaomi 15 Ultra',
    titleCN: '水凝膜保护膜',
    description: '贴柔性水凝膜保护膜（高韧性）',
    category: 'protection',
    thumbnail: '/service-previews/Protector Hidrogel para....jpg',
    needsPartImage: false,
    useModelSide: 'front',
    centerOverlayImage: '/assets/parts/screen-protector-hydrogel.png',
    centerOverlayRatio: 1.0,
    layout: {
      type: 'single-centered',
      targetHeightRatio: 0.80,
      // 镜像钢化膜：让组合整体微微向左，方便右侧露出更多机身
      centerOffsetRatioX: -0.03,
      edgeBadges: [
        { src: '/assets/badges/logo2.png', widthRatio: 0.07, yRatio: 0.86, side: 'left' },
        { src: '/assets/badges/logo1.png', widthRatio: 0.07, yRatio: 0.86, side: 'right' },
      ],
    },
    implemented: true
  },
  {
    id: 'no-power',
    title: 'Reparar Xiaomi 15 Ultra No Enciende',
    titleCN: '修复无法开机',
    description: '诊断和修复开机故障（主板、供电系统等）',
    category: 'system',
    thumbnail: '/service-previews/Reparar Xiaomi 15 Ultra No....jpg',
    needsPartImage: false,
    useModelSide: 'front',
    overlayArea: {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
    fillColor: '#000000',
    centerOverlayImage: '/assets/overlays/no-power.png',
    centerOverlayRatio: 0.68,
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
