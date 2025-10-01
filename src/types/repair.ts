/**
 * OverlayArea
 * 用于描述“在设备可见轮廓之内”的一个矩形区域。
 * 坐标单位说明：全部为 0~1 的比例，且相对于“设备轮廓包围盒（Device Bounds）”。
 * - 我们在上传阶段会自动计算设备轮廓（基于 alpha），并把该包围盒作为统一基准；
 * - 因此 OverlayArea 不需要写死到原始像素坐标，在不同机型/不同裁剪下都能对齐。
 */
export interface OverlayArea {
  x: number;      // 左上角 X，相对于设备轮廓宽度的比例（0~1）
  y: number;      // 左上角 Y，相对于设备轮廓高度的比例（0~1）
  width: number;  // 宽度，相对于设备轮廓宽度的比例（0~1）
  height: number; // 高度，相对于设备轮廓高度的比例（0~1）
}

/**
 * CrackPoint
 * 单个裂纹的中心点与大小。单位均为 0~1 比例，基准为 OverlayArea 的宽/高：
 * - x/y：裂纹中心在 OverlayArea 内的相对位置；
 * - size：裂纹绘制尺寸相对于 OverlayArea 宽度的比例。
 */
export interface CrackPoint {
  x: number;      // 裂纹中心 X（0~1），相对于 OverlayArea 宽度
  y: number;      // 裂纹中心 Y（0~1），相对于 OverlayArea 高度
  size: number;   // 裂纹大小，相对于 OverlayArea 宽度（0~1）
}

/**
 * SideBySideLayoutConfig
 * 双列（左：效果，右：原图）合成配置。最终画布固定为 800×800：
 * - dividerWidthRatio：中缝分隔线的宽度比例（0 表示不显示）；
 * - badges：可选，贴纸/徽标列表。位置是相对于整个 800×800 画布的比例；
 *   - widthRatio：徽标宽度占画布宽度的比例；
 *   - yRatio：徽标中心的纵向位置（0 顶部，1 底部）。
 * - centerBadges：可选，底部居中的徽标列表（水平并排）
 */
export interface SideBySideLayoutConfig {
  type: 'side-by-side';
  dividerColor?: string;        // 中缝分隔线颜色
  dividerWidthRatio?: number;   // 中缝分隔线宽度比例（0~1）
  leftHeightRatio?: number;     // 左侧图片目标高度比例（0~1，默认0.80）
  // 新增：左侧配件可按“固定宽度”缩放，适合小配件（电池/接口等）。
  // 默认为按高度缩放；当为 'width' 时使用 leftWidthRatio 作为目标宽度比例。
  leftScaleMode?: 'height' | 'width';
  leftWidthRatio?: number;      // 左侧目标宽度占“列宽”的比例（0~1，默认 0.52）
  rightHeightRatio?: number;    // 右侧目标高度比例（0~1，默认0.80）
  // 绝对（相对画布）的宽度与偏移，优先于 leftWidthRatio，用于配件类的统一规格。
  leftWidthCanvasRatio?: number;   // 左侧目标宽度占画布宽度比例（0~1，建议 0.38）
  leftCanvasOffsetRatioX?: number; // 左边距占画布宽度比例（0~1，建议 0.10）
  badges?: {
    src: string;          // 徽标图片（public 路径）
    widthRatio: number;   // 徽标宽度相对画布宽度比例（0~1）
    yRatio: number;       // 徽标中心的纵向位置（0~1）
  }[];
  centerBadges?: {
    src: string;          // 徽标图片（public 路径）
    widthRatio: number;   // 徽标宽度相对画布宽度比例（0~1）
    yRatio: number;       // 徽标中心的纵向位置（0~1）
  }[];
}

/**
 * SingleCenteredLayoutConfig
 * 单图居中布局：只输出处理后的手机图，居中放置，左右边缘可贴徽标。
 */
export interface SingleCenteredLayoutConfig {
  type: 'single-centered';
  targetHeightRatio?: number; // 处理后手机在 800×800 画布中的目标高度占比（默认 0.8）
  // 可选：将“主内容（或组合体）”在水平方向上微调，正数向右，负数向左。
  // 单位为画布宽度比例（-0.5 ~ 0.5 建议范围），默认 0。
  centerOffsetRatioX?: number;
  edgeBadges?: {
    src: string;               // 徽标图片（public 路径）
    widthRatio: number;        // 徽标宽度相对画布宽度比例（0~1）
    yRatio: number;            // 徽标中心的纵向位置（0~1）
    side: 'left' | 'right';    // 放在左边缘或右边缘
  }[];
}

export type ServiceLayout = SideBySideLayoutConfig | SingleCenteredLayoutConfig;

/**
 * RepairService
 * 单个“功能/服务”的配置对象。约定与建议：
 * - id：必须全局唯一（项目启动时会在 dev 环境做唯一性校验）。
 * - category：用于 UI 分组展示；
 * - needsPartImage：是否需要用户额外上传配件图（多数走 false，直接用模型图）；
 * - useModelSide：选择使用上传的正面/背面图；
 * - overlayArea/overlayImage/crackPoints：用于在屏幕或后盖区域叠加效果；
 *   - 屏幕服务如果需要“黑屏”，请设置 `fillColor = '#000'`；
 *   - 后盖服务通常不填充底色，只叠裂纹（不设置 fillColor 即可）。
 * - layout：最终排版，当前支持 side-by-side，并可添加中缝徽标。
 */
export interface RepairService {
  id: string;                    // 服务唯一 ID（必填，开发期校验唯一）
  title: string;                 // 西语标题（用于部分站点）
  titleCN: string;               // 中文标题（UI 展示）
  description: string;           // 简要描述
  category: 'screen' | 'hardware' | 'protection' | 'camera' | 'audio' | 'buttons' | 'system';
  thumbnail: string;             // 预览缩略图（public 路径）
  needsPartImage: boolean;       // 是否需要上传配件图
  defaultPartImage?: string;     // 可选：如果用户未上传配件图时使用的默认图片路径
  useModelSide?: 'front' | 'back';
  overlayArea?: OverlayArea;     // 效果叠加区域（相对设备轮廓，0~1）
  overlayImage?: string;         // 效果贴图路径（如裂纹 PNG）
  crackPoints?: CrackPoint[];    // 裂纹点位列表（可多处）
  centerOverlayImage?: string;   // 可选：在 overlayArea 中心绘制一张图片（不做圆形裁剪）
  centerOverlayRatio?: number;   // 中心图片宽度占 overlayArea 宽度的比例（0~1，默认 0.5）
  fillColor?: string;            // 可选：先填充一个底色（屏幕黑底用）
  layout?: ServiceLayout;        // 成品排版（并排、徽标等）
  implemented?: boolean;         // 是否已实现（UI 可用来打标）
}

export interface DeviceImages {
  front: File | null;            // 用户上传的正面图（可为空）
  back: File | null;             // 用户上传的背面图（可为空）
}

export interface ServiceSelection {
  serviceId: string;             // 关联的服务 ID
  customImage?: File;            // 可选：该服务需要的配件图
  isSelected: boolean;           // 是否被用户勾选
}

export interface ProcessedImage {
  serviceId: string;             // 对应服务 ID
  originalImage: string;         // 右侧原图的预览 URL
  processedImage: string;        // 左侧合成图的预览 URL
  approved: boolean;             // 是否被用户勾选用于打包下载
}

export type PhoneBrand = 'generic' | 'apple' | 'samsung' | 'xiaomi';

/**
 * BackgroundRemovalConfig
 * 背景移除配置，用于控制图片上传时的背景移除行为
 */
export interface BackgroundRemovalConfig {
  enabled: boolean;    // 是否启用背景移除
  useWebGPU: boolean;  // 是否启用 WebGPU 加速（需要浏览器支持）
}

