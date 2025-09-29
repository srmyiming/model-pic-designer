import { RepairService } from '@/types/repair';

/**
 * 音频类服务
 * 需要上传听筒或扬声器的白底图
 */
export const audioServices: RepairService[] = [
  {
    id: 'earpiece',
    title: 'Cambiar Auricular De Llamada Xiaomi 15 Ultra',
    titleCN: '更换听筒',
    description: '更换通话听筒扬声器',
    category: 'audio',
    thumbnail: '/service-previews/Cambiar Auricular de....jpg',
    needsPartImage: true
  },
  {
    id: 'speaker',
    title: 'Cambiar Altavoz De Música Xiaomi 15 Ultra',
    titleCN: '更换外放扬声器',
    description: '更换多媒体外放扬声器',
    category: 'audio',
    thumbnail: '/service-previews/Cambiar Altavoz de Música....jpg',
    needsPartImage: true
  }
];