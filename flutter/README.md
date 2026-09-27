# Flutter 跨平台技术草稿

> 当前目录还不是完整 Flutter 工程：缺少 `android/`、`ios/`、`.metadata` 和测试目录，暂时不能按正式 App 验收。

## 依赖

| 包 | 用途 |
|---|------|
| `camera` | 摄像头预览与帧流 |
| `google_mlkit_face_detection` | 人脸检测（边界框 + 轮廓 + 关键点） |
| `permission_handler` | 运行时权限请求 |
| `image` | 图片像素处理（美颜滤镜） |

## 实现状态

- [ ] 生成 Android/iOS Flutter 工程
- [ ] 真机验证摄像头预览
- [ ] 真机验证 ML Kit 人脸检测 + 关键点 + 轮廓
- [ ] 修复相机帧并发处理和生命周期
- [ ] 验证覆盖层坐标与前置摄像头镜像
- [ ] AR 贴纸叠加（鼻子/面部）
- [ ] 美颜滤镜（磨皮/美白）
- [ ] MediaPipe Flutter 方案（468点，更高精度）

## 运行

```bash
cd flutter
flutter create . --platforms=android,ios
flutter pub get
flutter run
```

## 架构说明

```
lib/main.dart
  ├── CameraMagicApp          # MaterialApp 入口
  ├── CameraScreen            # 主界面 StatefulWidget
  │   ├── _initCamera()       # 权限 + 摄像头初始化
  │   ├── _startDetection()   # 图像流 → 人脸检测循环
  │   ├── _buildInputImage()  # CameraImage → InputImage 转换
  │   └── _buildCameraPreview() # 预览 + 覆盖层
  └── FaceMeshPainter         # 技术草稿，后续应改名 FaceOverlayPainter
```

## 后续方向

1. **AR 贴纸**：在 FaceMeshPainter 中使用 `canvas.drawImage()` 在鼻尖/脸颊绘制贴纸
2. **美颜滤镜**：使用 `image` 包对每帧做像素级美白/磨皮，或接腾讯/字节原生美颜 SDK
3. **MediaPipe 升级**：替换 ML Kit 为 MediaPipe Flutter 获取 468 点，贴纸更精准
