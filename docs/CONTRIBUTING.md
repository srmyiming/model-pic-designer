# 贡献指南

## 如何添加新服务

### 1. 选择对应的类别文件

在 `src/data/services/` 目录下找到对应类别:

- `noUploadServices.ts` - 不需要配件图的服务(屏幕碎裂/黑屏/后盖裂纹等)
- `hardwareServices.ts` - 硬件类(电池/充电口/SIM卡槽等)
- `cameraServices.ts` - 摄像头类
- `audioServices.ts` - 音频类(听筒/扬声器/麦克风)
- `buttonServices.ts` - 按键类(电源键/音量键/Home键)
- `protectionServices.ts` - 保护类(钢化膜/手机壳)

### 2. 添加服务配置对象

在数组末尾添加新配置:

```typescript
{
  // 全局唯一 ID(必填) - 使用小写字母和连字符
  id: 'battery-replacement',

  // 西语标题(可选,部分站点使用)
  title: 'Cambio de Batería',

  // 中文标题(必填,UI 展示)
  titleCN: '电池更换',

  // 简要描述
  description: '更换原装电池',

  // 类别(必填)
  category: 'hardware',

  // 缩略图路径(必填,相对 public/ 目录)
  thumbnail: '/assets/thumbnails/battery.png',

  // 是否需要上传配件图(必填)
  needsPartImage: true,

  // 默认配件图(可选,用户未上传时使用)
  defaultPartImage: '/assets/parts/battery-default.png',

  // 使用模型的哪一面(可选,'front' 或 'back')
  useModelSide: 'back',

  // 效果叠加区域(可选,相对设备轮廓,0~1 比例)
  overlayArea: {
    x: 0.2,      // 距左边 20%
    y: 0.3,      // 距顶部 30%
    width: 0.6,  // 宽度 60%
    height: 0.4  // 高度 40%
  },

  // 效果贴图(可选,如裂纹 PNG)
  overlayImage: '/assets/effects/crack.png',

  // 裂纹点位列表(可选,多处裂纹)
  crackPoints: [
    { x: 0.3, y: 0.4, size: 0.2 },
    { x: 0.7, y: 0.6, size: 0.15 }
  ],

  // 中心图片(可选,在 overlayArea 中心绘制)
  centerOverlayImage: '/assets/icons/battery.png',
  centerOverlayRatio: 0.5,  // 占 overlayArea 宽度的 50%

  // 底色填充(可选,屏幕黑底用)
  fillColor: '#000000',

  // 成品排版(可选)
  layout: {
    type: 'side-by-side',        // 左右布局
    dividerColor: '#e5e7eb',     // 中缝颜色
    dividerWidthRatio: 0.01,     // 中缝宽度比例
    leftHeightRatio: 0.80,       // 左侧高度占比
    rightHeightRatio: 0.80,      // 右侧高度占比

    // 徽标(可选)
    badges: [
      {
        src: '/assets/badges/original.png',
        widthRatio: 0.15,        // 徽标宽度占画布 15%
        yRatio: 0.20             // 徽标中心纵向位置(0 顶部,1 底部)
      }
    ],

    // 底部居中徽标(可选)
    centerBadges: [
      {
        src: '/assets/badges/warranty.png',
        widthRatio: 0.25,
        yRatio: 0.95
      }
    ]
  },

  // 是否已实现(可选,UI 可用来打标)
  implemented: true
}
```

### 3. 坐标系统说明

所有坐标使用 **0~1 相对比例**,基准是"设备轮廓包围盒"。

**示例: 屏幕区域**
```typescript
overlayArea: {
  x: 0.1,      // 屏幕距左边 10%
  y: 0.15,     // 屏幕距顶部 15%
  width: 0.8,  // 屏幕宽度 80%
  height: 0.7  // 屏幕高度 70%
}
```

**如何确定坐标?**
1. 在图片编辑软件(如 Photoshop)中打开样本手机图
2. 测量屏幕区域的像素坐标
3. 转换为相对比例:
   ```
   x = (屏幕左边距 / 设备宽度)
   width = (屏幕宽度 / 设备宽度)
   ```

### 4. 运行并测试

```bash
# 启动开发服务器
npm run dev

# 检查是否报错(ID 重复会直接抛错)
```

**测试步骤:**
1. 打开应用,进入"选择产品"步骤
2. 找到新添加的服务,查看缩略图和标题是否正确
3. 选中该服务,上传配件图(如果需要)
4. 进入"生成下载"步骤,查看效果
5. 下载图片,检查:
   - 配件图位置是否正确
   - 效果叠加是否准确
   - 徽标位置是否合理
   - SKU 名称是否显示

### 5. 提交代码

```bash
# 添加并提交
git add src/data/services/xxx.ts
git commit -m "feat: 添加新服务 - 电池更换"

# 推送
git push
```

## 布局类型说明

### Side-by-Side (左右布局)

左侧显示处理后的效果图,右侧显示原图。

```typescript
layout: {
  type: 'side-by-side',
  dividerColor: '#e5e7eb',     // 中缝颜色
  dividerWidthRatio: 0.01,     // 中缝宽度
  leftHeightRatio: 0.80,       // 左侧高度
  rightHeightRatio: 0.80,      // 右侧高度

  // 左侧按宽度缩放(适合小配件)
  leftScaleMode: 'width',
  leftWidthRatio: 0.52,

  // 或者使用绝对宽度(更精确)
  leftWidthCanvasRatio: 0.38,  // 左侧占画布 38%
  leftCanvasOffsetRatioX: 0.10 // 左边距占画布 10%
}
```

### Single-Centered (单图居中)

只显示处理后的图片,居中放置。

```typescript
layout: {
  type: 'single-centered',
  targetHeightRatio: 0.8,      // 高度占画布 80%
  centerOffsetRatioX: 0,       // 水平偏移(可选)

  // 边缘徽标(可选)
  edgeBadges: [
    {
      src: '/assets/badges/logo.png',
      widthRatio: 0.15,
      yRatio: 0.5,
      side: 'left'             // 'left' 或 'right'
    }
  ]
}
```

## 资源文件规范

### 缩略图 (thumbnails/)

- **尺寸**: 200×200 px
- **格式**: PNG (透明背景) 或 JPG
- **命名**: 小写字母+连字符,如 `battery-replacement.png`
- **路径**: `/assets/thumbnails/xxx.png`

### 配件图 (parts/)

- **格式**: PNG (必须透明背景)
- **大小**: < 2MB
- **命名**: 描述性,如 `battery-generic.png`
- **路径**: `/assets/parts/xxx.png`

### 效果贴图 (effects/)

- **格式**: PNG (透明背景)
- **用途**: 裂纹/污渍/划痕等叠加效果
- **路径**: `/assets/effects/xxx.png`

### 徽标 (badges/)

- **格式**: PNG (透明背景)
- **大小**: < 500KB
- **路径**: `/assets/badges/xxx.png`

## 代码规范

### TypeScript

- 使用严格模式(已启用)
- 所有函数必须有类型注解
- 避免 `any`,使用具体类型

### 命名规范

- **文件名**: 小写字母+连字符,如 `battery-replacement.ts`
- **组件**: PascalCase,如 `BatteryService`
- **函数**: camelCase,如 `processBatteryImage`
- **常量**: UPPER_SNAKE_CASE,如 `MAX_IMAGE_SIZE`

### 注释

服务配置**必须**添加注释说明:

```typescript
{
  id: 'special-service',
  // 说明: 这个服务的特殊处理逻辑是...
  overlayArea: { ... }
}
```

## 常见错误

### ID 重复

```
Error: [services] Duplicate service id detected: "battery-replacement"
```

**解决**: 修改 `id` 为全局唯一值。

### 坐标超出范围

坐标必须在 0~1 之间:

```typescript
// ❌ 错误
overlayArea: { x: 1.2, y: 0.5, width: 0.8, height: 0.7 }

// ✅ 正确
overlayArea: { x: 0.1, y: 0.5, width: 0.8, height: 0.7 }
```

### 图片路径错误

所有路径相对于 `public/` 目录:

```typescript
// ❌ 错误
thumbnail: 'assets/thumbnails/battery.png'

// ✅ 正确
thumbnail: '/assets/thumbnails/battery.png'
```

## 需要帮助?

- 查看现有服务配置作为参考
- 阅读 [ARCHITECTURE.md](./ARCHITECTURE.md)
- 使用 DevTools 检查内存/性能
- 提 Issue: https://github.com/xxx/issues

---

**祝编码愉快！** 🎉
