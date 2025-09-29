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
    useModelSide: 'front'
  },
  {
    id: 'back-cover',
    title: 'Cambiar Tapa Trasera Xiaomi 15 Ultra',
    titleCN: '更换后盖',
    description: '更换手机背部外壳',
    category: 'hardware',
    thumbnail: '/service-previews/Cambiar Tapa Trasera Xiaomi....jpg',
    needsPartImage: false,
    useModelSide: 'back'
  },
  {
    id: 'screen-protector-glass',
    title: 'Protector De Pantalla Xiaomi 15 Ultra Cristal Templado',
    titleCN: '钢化玻璃膜',
    description: '贴钢化玻璃保护膜（防刮防摔）',
    category: 'protection',
    thumbnail: '/service-previews/Protector de Pantalla....jpg',
    needsPartImage: false,
    useModelSide: 'front'
  },
  {
    id: 'screen-protector-hydrogel',
    title: 'Protector Hidrogel Para Pantalla Xiaomi 15 Ultra',
    titleCN: '水凝膜保护膜',
    description: '贴柔性水凝膜保护膜（高韧性）',
    category: 'protection',
    thumbnail: '/service-previews/Protector Hidrogel para....jpg',
    needsPartImage: false,
    useModelSide: 'front'
  },
  {
    id: 'no-power',
    title: 'Reparar Xiaomi 15 Ultra No Enciende',
    titleCN: '修复无法开机',
    description: '诊断和修复开机故障（主板、供电系统等）',
    category: 'system',
    thumbnail: '/service-previews/Reparar Xiaomi 15 Ultra No....jpg',
    needsPartImage: false,
    useModelSide: 'front'
  }
];