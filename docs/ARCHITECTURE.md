# 项目架构文档

## 概述

这是一个基于浏览器的电商产品图片生成工具，核心功能是：上传手机模型图 → AI去背景 → 叠加服务效果(裂纹/配件) → 生成带标记的展示图 → 打包下载。

## 技术栈

- **框架**: Vite + React 18 + TypeScript
- **UI组件**: shadcn/ui (基于 Radix UI)
- **图片处理**: Canvas 2D API + `@imgly/background-removal`
- **状态管理**: React Hooks (useState/useCallback)
- **路由**: React Router v6
- **样式**: Tailwind CSS

## 核心流程

```
1. 用户上传正面/背面图
   ↓
2. AI 自动去背景 (可选 WebGPU 加速)
   ↓
3. 选择服务类型 (屏幕碎裂/电池更换/摄像头维修等)
   ↓
4. 上传配件图 (部分服务需要)
   ↓
5. Canvas 合成: 模型图 + 效果叠加 + 布局排版
   ↓
6. 生成 800×800 图片
   ↓
7. 用户勾选需要的图片,打包下载 ZIP
```

## 数据流

```
DeviceImages (File)
  ↓ [背景移除]
  ↓ Blob
  ↓ [createObjectURL - 自动管理生命周期]
  ↓ ObjectURL (临时)
  ↓ [Canvas 渲染]
  ↓ Canvas
  ↓ [导出]
  ↓ ProcessedImage
  ↓ [打包下载]
  ↓ ZIP 文件
```

## 目录结构

```
src/
├── components/          # UI 组件
│   ├── ui/             # shadcn/ui 组件
│   ├── ImageUploader.tsx       # 图片上传 + 去背景
│   ├── ServiceSelector.tsx     # 服务选择界面
│   ├── ProcessingPreview.tsx   # 结果预览 + 下载
│   ├── ErrorBoundary.tsx       # 错误边界
│   └── DevTools.tsx            # 开发调试工具
│
├── pages/              # 页面组件
│   ├── Index.tsx       # 主流程页面
│   ├── Login.tsx       # 登录页
│   └── NotFound.tsx    # 404 页面
│
├── hooks/              # React Hooks
│   ├── useImageProcessing.tsx  # 核心图片处理逻辑
│   ├── useBackgroundRemoval.ts # AI 去背景
│   ├── useObjectURLs.ts        # ObjectURL 生命周期管理
│   └── use-toast.ts            # Toast 通知
│
├── utils/              # 工具函数
│   ├── canvas/         # Canvas 工具(纯函数)
│   │   ├── coordinates.ts  # 坐标计算
│   │   ├── renderer.ts     # 渲染函数
│   │   └── index.ts
│   ├── auth.ts         # 会话管理
│   └── performance.ts  # 性能监控
│
├── data/               # 静态数据
│   └── services/       # 服务配置(模块化)
│       ├── index.ts
│       ├── noUploadServices.ts    # 不需要配件图
│       ├── hardwareServices.ts
│       ├── cameraServices.ts
│       └── ...
│
└── types/              # TypeScript 类型定义
    ├── repair.ts       # 核心类型(Service/Layout/OverlayArea)
    └── selection.ts    # 服务选择类型(Set/Map 优化)
```

## 关键模块

### 1. 图片处理管线 (`useImageProcessing`)

**职责**: 协调整个图片处理流程

**输入**:
- `DeviceImages`: 用户上传的正面/背面图
- `ServiceSelections`: 选中的服务和配件图
- `sku`: 产品 SKU 名称
- `showSkuOnImage`: 是否显示 SKU

**输出**:
- `ProcessedImage[]`: 处理后的图片数组(originalImage + processedImage + approved)

**关键函数**:
- `processImages()`: 主处理流程
- `updateImageApproval()`: 更新勾选状态
- `downloadApprovedImages()`: 打包下载

**优化**:
- ✅ 使用 `useObjectURLs` 管理 URL 生命周期
- ✅ try-catch 错误处理 + Toast 通知
- ⏳ 待提取: 坐标计算/Canvas 绘制逻辑

### 2. 背景移除 (`useBackgroundRemoval`)

**职责**: 调用 AI 模型去除图片背景

**配置**:
```typescript
interface BackgroundRemovalConfig {
  enabled: boolean;     // 是否启用
  useWebGPU: boolean;   // 是否使用 WebGPU 加速
}
```

**性能**:
- WebGPU 模式: ~2-3 秒/张 (需浏览器支持)
- CPU 模式: ~5-8 秒/张

### 3. 服务配置系统 (`data/services/`)

**设计原则**:
- 模块化: 每个类别独立文件
- 类型安全: TypeScript 严格校验
- 运行时检查: ID 唯一性校验(开发环境)

**服务配置示例**:
```typescript
{
  id: 'screen-cracked',                  // 全局唯一 ID
  titleCN: '屏幕裂纹',
  category: 'screen',
  needsPartImage: false,                 // 不需要配件图
  useModelSide: 'front',                 // 使用正面图
  overlayArea: {                         // 效果叠加区域(0~1 比例)
    x: 0.1, y: 0.15,
    width: 0.8, height: 0.7
  },
  overlayImage: '/assets/cracks/crack1.png',
  fillColor: '#000',                     // 屏幕黑底
  layout: {
    type: 'side-by-side',                // 左右布局
    dividerColor: '#e5e7eb',
    badges: [...]                        // 徽标
  }
}
```

### 4. Canvas 工具模块 (`utils/canvas/`)

**设计哲学**: 纯函数 + 职责分离

**coordinates.ts** - 坐标计算:
```typescript
calculateFitRect(imageW, imageH, targetW, targetH, mode)
calculateScale(sourceW, sourceH, targetW, targetH, mode)
relativeToAbsolute(rect, containerW, containerH)
```

**renderer.ts** - 绘制函数:
```typescript
drawImageInRect(ctx, image, rect, options)
fillRect(ctx, rect, color)
clipRect(ctx, rect)
drawCenteredText(ctx, text, x, y, options)
withAlpha(ctx, alpha, drawFn)
```

**优势**:
- ✅ 零依赖,易测试
- ✅ 可复用(未来可用于其他项目)
- ✅ 消除 useImageProcessing 的复杂度

### 5. 会话管理 (`utils/auth.ts`)

**改进点**:
- ❌ 之前: `localStorage.setItem('isLoggedIn', 'true')` - 永不过期
- ✅ 现在: JSON 格式 + 7 天过期时间

**API**:
```typescript
saveSession()             // 保存会话(7 天有效期)
isSessionValid()          // 检查会话是否有效
clearSession()            // 清除会话
getSessionRemainingTime() // 获取剩余时间
```

### 6. 性能监控 (`utils/performance.ts`)

**用途**: 发现性能瓶颈

```typescript
// 测量异步函数耗时
const result = await measureAsync('Process image', async () => {
  return await processImage(...);
});
// 输出: ⏱️ [Perf] Process image: 2450.32ms

// 内存监控
logMemory('Before processing');
// 输出: 🧠 [Before processing] Used: 156.3MB / Total: 180.2MB / Limit: 2048.0MB
```

## 内存管理

### 问题背景

Canvas 处理大量图片会创建 ObjectURL,如果不释放会导致内存泄漏:

```typescript
// ❌ 错误做法
const url = URL.createObjectURL(blob);
setState({ imageUrl: url }); // URL 永远不释放,内存泄漏
```

### 解决方案

使用 `useObjectURLs` hook:

```typescript
const { create, revokeAll } = useObjectURLs();

// 创建 URL(自动追踪)
const url = create(blob);

// 组件卸载时自动释放所有 URL
```

### 最佳实践

1. **所有 ObjectURL 必须通过 `useObjectURLs` 创建**
2. **处理新批次前调用 `revokeAll()`**
3. **定期使用 DevTools 监控内存**

## 坐标系统

### 统一基准: 设备轮廓包围盒

所有坐标使用 **0~1 相对比例**,基准是"设备轮廓包围盒"(基于 alpha 通道计算)。

**优势**:
- ✅ 适配不同机型/尺寸
- ✅ 配置文件可读性强
- ✅ 避免硬编码像素值

**示例**:
```typescript
overlayArea: {
  x: 0.1,      // 距左边 10%
  y: 0.15,     // 距顶部 15%
  width: 0.8,  // 宽度 80%
  height: 0.7  // 高度 70%
}
```

## 错误处理

### 三层防护

1. **组件级**: ErrorBoundary 捕获 React 错误
2. **函数级**: try-catch + Toast 通知
3. **资源级**: useObjectURLs 自动清理

### 错误边界使用

```tsx
<ErrorBoundary
  fallbackTitle="图片处理失败"
  fallbackMessage="请检查图片格式或重试"
>
  <ImageProcessingComponent />
</ErrorBoundary>
```

## 开发工具

### DevTools 组件

**功能**:
- 📊 服务数量统计
- 💾 实时内存监控(仅 Chrome)
- 🗑️ 手动触发 GC

**启用方法**:
```bash
# 启动 Chrome 并暴露 GC
chrome --js-flags="--expose-gc"

# 启动项目
npm run dev
```

## 性能优化建议

### 已实现

1. ✅ ObjectURL 自动释放
2. ✅ 坐标计算提取为纯函数
3. ✅ 错误边界防止崩溃
4. ✅ 开发工具监控内存

### 待优化

1. ⏳ OffscreenCanvas - 多线程渲染(避免主线程卡顿)
2. ⏳ ImageBitmap - 替代 Image 元素(性能更好)
3. ⏳ 替换手写模糊 - 使用 `ctx.filter = 'blur(...)'`
4. ⏳ 服务配置 Schema 验证 - Zod 运行时检查

## 常见问题

### Q: 为什么删除了 `phoneBrand` 选择?

A: 经代码审计发现,`phoneBrand` 只在 UI 校验中使用,实际处理时没有用到。这是个假需求,删除后简化了流程。

### Q: `REPAIR_SERVICES` 空数组是什么?

A: 已废弃并删除。早期设计的遗留物,现在使用 `ALL_SERVICES`。

### Q: 如何添加新服务?

见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

### Q: 内存使用过高怎么办?

1. 打开 DevTools 查看内存占用
2. 点击 "Force GC" 手动回收
3. 检查是否有未释放的 ObjectURL

### Q: 背景移除失败?

1. 检查图片格式(支持 PNG/JPG)
2. 图片大小 < 10MB
3. 关闭 WebGPU 尝试 CPU 模式

## 维护指南

### 定期检查

- [ ] 服务配置 ID 唯一性(自动检查,开发环境启动时)
- [ ] 内存泄漏(使用 DevTools 监控)
- [ ] Canvas 渲染性能(使用 `measureAsync`)

### 代码规范

- 坐标计算 → `utils/canvas/coordinates.ts`
- Canvas 绘制 → `utils/canvas/renderer.ts`
- 业务逻辑 → `hooks/useImageProcessing.tsx`
- 服务配置 → `data/services/`

### 测试建议

```bash
# 测试坐标计算(纯函数,易测试)
# TODO: 添加 Vitest 单元测试

# 手动测试流程
1. 上传图片 → 检查去背景效果
2. 选择 5+ 服务 → 查看 DevTools 内存增长
3. 处理 20 张图 → 检查内存是否稳定
4. 下载 ZIP → 验证文件完整性
```

## 下一步改进

见 [TODO.md](./TODO.md)。
