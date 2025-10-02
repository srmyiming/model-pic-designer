/**
 * 服务配置聚合文件
 *
 * 模块化设计说明：
 * - 每个类别的服务放在独立文件中
 * - 要添加新服务：找到对应类别文件，直接在数组末尾追加
 * - 要添加新类别：创建新文件，然后在这里导入并添加到 ALL_SERVICES
 *
 * 排序规则：
 * 1. 不需要上传配件图的服务排最前（用户体验更好）
 * 2. 需要上传配件图的服务按类别分组
 */

import { noUploadServices } from './noUploadServices';
import { hardwareServices } from './hardwareServices';
import { cameraServices } from './cameraServices';
import { audioServices } from './audioServices';
import { buttonServices } from './buttonServices';
import { protectionServices } from './protectionServices';
import { dualPreviewService } from './dualPreviewService';

/**
 * 所有服务的统一导出
 * 前端组件只需要 import { ALL_SERVICES } 即可
 */
export const ALL_SERVICES = [
  ...noUploadServices,      // 不需要上传配件图的（排最前）
  ...hardwareServices,       // 硬件类
  ...cameraServices,         // 摄像头类
  ...protectionServices,     // 保护类
  ...audioServices,          // 音频类
  ...buttonServices,         // 按键类
  dualPreviewService,
];

// 开发期唯一性校验：确保 service.id 不重复，避免 UI/处理管线出现“撞 ID”问题
// 构建生产环境不执行这段逻辑，以免因第三方注入导致打断。Vite 会在 dev 下内联 import.meta.env.DEV。
if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
  const seen = new Set<string>();
  for (const s of ALL_SERVICES) {
    if (seen.has(s.id)) {
      // 直接抛错，尽早在开发时发现问题
      throw new Error(`[services] Duplicate service id detected: "${s.id}"`);
    }
    seen.add(s.id);
  }
}

// 按类别分组导出（可选，方便未来需要按类别展示）
export const SERVICE_GROUPS = {
  noUpload: noUploadServices,
  hardware: hardwareServices,
  camera: cameraServices,
  protection: protectionServices,
  audio: audioServices,
  buttons: buttonServices,
};
