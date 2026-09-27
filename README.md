# 摄像头延伸开发 — 技术分析与项目集合

## 项目概述

本目录包含两个摄像头实时处理项目的原型实现：
- `web/` — 可运行的纯 Web Demo（MediaPipe Face Mesh + Canvas）
- `flutter/` — Flutter 技术草稿，尚未生成 Android/iOS 工程

两个项目共同验证以下核心场景：
1. **实时摄像头捕捉** — getUserMedia / Camera 组件
2. **面部关键点检测** — 468/478 个 3D 面部标记点
3. **AR 贴纸** — 基于关键点的贴图叠加（如鼻子贴纸）
4. **美颜滤镜** — 磨皮、美白等实时画面后处理
5. **实时变脸** — WebGL 瘦脸与脸长调节

---

## 核心技术栈

### MediaPipe Face Mesh（Google 开源）

使用单 RGB 摄像头，无需深度传感器，实时输出 468 个 3D 面部关键点：

```
鼻梁: 点 6, 168, 195, 197, 5, 4
鼻尖: 点 1, 2, 98, 327
鼻翼: 点 64, 240, 102, 331, 294, 334
眉眼: 点 33, 133, 362, 263 等
嘴唇外/内轮廓: 各 20 个点
```

- 每个点带 x/y/z 坐标（z 为深度，用于 3D 贴图不"飘"）
- GPU 加速（WebGL / Metal / Vulkan）
- 移动端也能稳定 30FPS+
- 支持 Web / Android / iOS / Python / C++ 全平台

### 平台方案对比

| 维度 | 纯 Web | React Native / Expo | Flutter | 原生 iOS/Android |
|------|--------|---------------------|---------|------------------|
| 开发速度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 性能上限 | ⭐⭐⭐ WebGL | ⭐⭐⭐⭐ 原生桥接 | ⭐⭐⭐⭐⭐ Impeller | ⭐⭐⭐⭐⭐ Metal/Vulkan |
| 美颜效果 | ⭐⭐⭐ 片段着色器 | ⭐⭐⭐⭐ 原生 SDK | ⭐⭐⭐⭐⭐ 腾讯/字节 SDK | ⭐⭐⭐⭐⭐ |
| 代码复用 | 100% | 85%+ | 100% | 双端各一套 |
| 是否需要原生开发 | **不需要** | 部分需要 | 插件需要 | **需要** |
| 适合场景 | 网页/小程序/H5 | 跨平台 App | 高性能跨平台 App | 旗舰级美颜相机 |

---

## 技术要点

### 1. 实时捕捉
- **Web**: `navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })`
- **Flutter**: `camera` 插件 + `CameraController`

### 2. 美颜滤镜实现原理

**磨皮 (Skin Smoothing)**：
- 双边滤波 (Bilateral Filter)：保留边缘的同时平滑皮肤区域
- 高通滤波叠加：提取皮肤细节 → 减弱 → 叠回原图
- WebGL 片段着色器实现：对每个像素采样周围 13x13 邻域，按亮度差异加权模糊

当前 Web Demo 为保证实时性，使用 Canvas GPU 滤镜做轻量全画面柔化，不等同于正式的肤色分区磨皮。后续产品化时应替换为 WebGL shader + 肤色蒙版。

**美白 (Whitening)**：
- LUT (Look-Up Table) 查找表：将肤色区域色调向粉白色映射
- 简单实现：提高亮度 + 降低饱和度 + 微调色温

### 3. AR 贴纸对齐

核心思路：
1. 从 Face Mesh 取目标关键点的归一化坐标 (0-1)
2. 计算贴纸位置 = (x × canvas.width, y × canvas.height)
3. 用两眼间距或鼻梁长度计算缩放比例
4. 用多个关键点计算旋转角度（如鼻梁方向向量）
5. Canvas 2D 绘制：ctx.translate → ctx.rotate → ctx.drawImage

### 4. 性能优化要点

- 人脸检测不必每帧跑：隔帧检测 + 光流跟踪可以兼顾性能
- Web Worker 中跑推理，不阻塞主线程
- Canvas 分层：视频层 + 滤镜层 + 贴纸层分离渲染
- 移动端降分辨率到 640×480 再做人脸检测
- MediaPipe 推理使用单帧锁，上一帧结束前不提交下一帧

### 5. WebGL 变脸

Web Demo 已实现基于动态脸部轮廓的实时几何形变：

- 瘦脸：根据太阳穴、颧骨、下颌与下巴关键点构建连续宽度曲线，从上脸到下颌平滑收窄
- 脸长：仅在鼻尖到下巴的脸部蒙版内做纵向渐变形变，并在下巴边界快速衰减
- 边缘填充：让原脸部轮廓完整参与位移，并在轮廓外使用背景采样过渡带填补收窄后的区域
- 组合位移：瘦脸和脸长均基于原始坐标计算，合并后只进行一次纹理采样，减少叠加撕裂
- 中心保护：降低鼻子、眼睛和嘴部区域的横向压缩，避免五官被一起挤扁
- 关键点平滑：对连续帧关键点进行低通平滑，降低边缘抖动
- 侧脸保护：根据鼻尖相对两侧脸颊的位置自动降低形变强度

变脸由 WebGL fragment shader 完成，不在 JavaScript 主线程逐像素处理。当前动态蒙版会把位移限制在头部轮廓内，避免形变持续影响颈部、衣服和画面底部；产品化时仍可继续升级为三角网格形变和更完整的 3D 姿态估计。

---

## 延伸方向脑图

```
摄像头实时捕捉
  ├── 美颜赛道
  │   ├── 磨皮（双边滤波 / 高通保留边缘）
  │   ├── 美白（LUT 查找表 / 色彩迁移）
  │   ├── 瘦脸/大眼（关键点局部网格变形）
  │   └── 虚拟化妆（口红/眉毛/腮红定位叠加）
  │
  ├── AR 贴纸赛道
  │   ├── 面部贴纸（鼻子/额头/脸颊）
  │   ├── 3D 面具（Face Mesh → Three.js 3D 模型绑定）
  │   └── 手势联动（手部关键点 + 面部互动）
  │
  ├── 表情/交互赛道
  │   ├── 眨眼检测 → 触发拍照
  │   ├── 张嘴检测 → 触发特效
  │   ├── 头部姿态 → 3D 视角跟随（欧拉角）
  │   └── 表情识别 → emoji / 动画映射
  │
  └── 实用工具赛道
      ├── 虚拟试戴（眼镜/帽子/耳环）
      ├── 人脸考勤/活体检测
      ├── 视频通话实时美颜（虚拟摄像头）
      └── 姿态纠正（低头提醒/坐姿检测）
```

---

## 运行方式

### Web Demo
```bash
cd web
npm install
npm start
```

浏览器打开 `http://localhost:8080`。可以通过以下命令运行静态检查和测试：

```bash
npm run check
npm test
```

### Flutter（工程尚未初始化）
```bash
cd flutter
flutter create . --platforms=android,ios
flutter pub get
flutter run
```

执行 `flutter create` 前应先确认生成的平台工程配置，随后补充 Android/iOS 摄像头权限。

---

## 参考资料

- [MediaPipe Face Mesh](https://developers.google.com/mediapipe/solutions/vision/face_landmarker)
- [MediaPipe JS API](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/face_mesh.md)
- [WebGL 美颜着色器原理](https://www.shadertoy.com/)
- [Flutter Camera Plugin](https://pub.dev/packages/camera)
- [GPUImage (iOS)](https://github.com/BradLarson/GPUImage3)
- [Android CameraX](https://developer.android.com/training/camerax)
