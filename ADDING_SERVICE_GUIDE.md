# 新增服务指南（RepairService Quick Start）

本项目的“选择产品（步骤2）”是数据驱动的。每个功能（服务）都是一个 `RepairService` 配置对象，按类别放在 `src/data/services/*` 中，由 `src/data/services/index.ts` 聚合为 `ALL_SERVICES` 并供 UI/处理管线使用。

## 一、最小步骤
1. 在对应类别文件末尾追加一个对象（例如 `src/data/services/noUploadServices.ts`）。
2. 填写最关键字段：
   - `id`（必须唯一，见下文校验）
   - `title` / `titleCN` / `description`
   - `category` / `thumbnail`
   - `needsPartImage`（一般为 false）
   - `useModelSide`: `front` 或 `back`
3. 如果需要叠加效果（如裂纹），再补：
   - `overlayArea`（0~1，基于“设备轮廓”）
   - `overlayImage`（public 路径）
   - `crackPoints`（可多处）
   - `fillColor`（仅屏幕黑底需要；后盖通常不填）
4. 设置排版（可选）：
   - `layout: { type: 'side-by-side', dividerWidthRatio: 0, badges: [...] }`

保存后，开发环境会自动做 `id` 唯一性校验，防止撞 ID。

## 二、字段用途约定（精简版）
- `useModelSide`：决定取正面或背面上传图作为素材。
- `overlayArea`：0~1 比例，基于“设备轮廓包围盒”。上传后我们会自动计算设备轮廓，所有服务共享该基准，保证跨成品图尺寸一致。
- `crackPoints`：相对 `overlayArea` 的多点裂纹配置（x/y/size）。
- `fillColor`：可选的底色。屏幕黑底需设置 `#000`；后盖请不要设置（只叠裂纹）。
- `layout.badges`：可在左右手机中缝处添加一到多个徽标，`widthRatio`/`yRatio` 为相对 800×800 画布的比例。

详见 `src/types/repair.ts` 的注释化说明。

## 三、预览与验证
- 运行项目，进入步骤2勾选新服务，进入步骤3验证：
  - 左右两侧手机高度一致，位置一致；
  - 屏幕/后盖叠加效果位置正确；
  - 徽标位置/大小符合预期。

## 四、常见问题
- 尺寸不一致：确保只使用 `overlayArea` 的 0~1 比例，避免写死像素；不要绕过管线自行缩放。
- 裁剪偏移：`overlayArea` 是相对“设备轮廓”，不是相对整张原图。
- 贴图路径：所有图片需放在 `public`（或其子目录）下，配置里用以 `/` 开头的 public 路径。

## 五、唯一性校验
`src/data/services/index.ts` 在开发模式（`import.meta.env.DEV`）会遍历 `ALL_SERVICES`，若发现重复的 `id` 将直接抛错。请保证每个服务 `id` 全局唯一。

---
如需新增“新的效果类型”（非裂纹/填黑），请先扩展 `src/types/repair.ts` 的类型定义，然后在 `src/hooks/useImageProcessing.tsx` 内添加最小渲染分支（保持对旧配置向后兼容）。

