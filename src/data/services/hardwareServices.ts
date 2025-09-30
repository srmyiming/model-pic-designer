import { RepairService } from '@/types/repair';

/**
 * 硬件类服务
 * 需要上传对应的硬件配件白底图
 */
export const hardwareServices: RepairService[] = [
  {
    id: 'charging-port',
    title: 'Cambiar Conector De Carga Xiaomi 15 Ultra',
    titleCN: '更换充电接口',
    description: '修复或更换 USB-C 充电接口',
    category: 'hardware',
    thumbnail: '/service-previews/Cambiar Conector de Carga....jpg',
    needsPartImage: true,
    defaultPartImage: '/assets/parts/charging-port.png',
    useModelSide: 'back',
    layout: {
      type: 'side-by-side',
      leftHeightRatio: 0.35,  // 充电口缩小到35%高度
      badges: [
        { src: '/assets/badges/logo2.png', widthRatio: 0.07, yRatio: 0.42 },
        { src: '/assets/badges/logo1.png', widthRatio: 0.07, yRatio: 0.62 },
      ],
    },
    implemented: true
  },
  {
    id: 'battery-replacement',
    title: 'Cambiar Batería Xiaomi 15 Ultra',
    titleCN: '更换电池',
    description: '更换内置电池（解决电量下降和老化问题）',
    category: 'hardware',
    thumbnail: '/service-previews/Cambiar Batería Xiaomi 15....jpg',
    needsPartImage: true
  }
];