import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:permission_handler/permission_handler.dart';

// ============================================================
// 摄像头魔法 - Flutter 原型
//
// 功能（逐步实现）：
//  1. ✅ 摄像头预览
//  2. ✅ ML Kit 人脸检测（含轮廓关键点）
//  3. ⬜ AR 贴纸叠加（鼻子/面部）
//  4. ⬜ 美颜滤镜（磨皮/美白）
//
// 架构说明：
//  - CameraController 管理摄像头生命周期
//  - FaceDetector (ML Kit) 处理每帧人脸检测
//  - CustomPainter 在预览层上方绘制 AR 元素
// ============================================================

/// 应用入口
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 获取可用摄像头列表
  final cameras = await availableCameras();

  runApp(CameraMagicApp(cameras: cameras));
}

class CameraMagicApp extends StatelessWidget {
  final List<CameraDescription> cameras;

  const CameraMagicApp({super.key, required this.cameras});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '摄像头魔法',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.green,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: CameraScreen(cameras: cameras),
    );
  }
}

// ============================================================
// 主界面
// ============================================================
class CameraScreen extends StatefulWidget {
  final List<CameraDescription> cameras;

  const CameraScreen({super.key, required this.cameras});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> with WidgetsBindingObserver {
  // --- 状态 ---
  CameraController? _controller;
  FaceDetector? _faceDetector;
  List<Face> _faces = [];
  bool _isDetecting = false;
  bool _isInitialized = false;
  bool _showMesh = true;
  bool _showSticker = false; // 贴纸功能待实现
  bool _showBeauty = false;  // 美颜功能待实现

  // 性能统计
  int _fps = 0;
  int _frameCount = 0;
  DateTime _lastFpsTime = DateTime.now();

  // --- 生命周期 ---
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopDetection();
    _controller?.dispose();
    _faceDetector?.close();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_controller == null || !_controller!.value.isInitialized) return;
    if (state == AppLifecycleState.inactive) {
      _controller?.dispose();
    } else if (state == AppLifecycleState.resumed) {
      _initCamera();
    }
  }

  // ============================================================
  // 摄像头初始化
  // ============================================================
  Future<void> _initCamera() async {
    // 请求权限
    final status = await Permission.camera.request();
    if (!status.isGranted) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('需要摄像头权限才能使用此功能')),
        );
      }
      return;
    }

    // 优先使用前置摄像头
    final frontCameras = widget.cameras
        .where((c) => c.lensDirection == CameraLensDirection.front)
        .toList();
    final camera = frontCameras.isNotEmpty ? frontCameras.first : widget.cameras.first;

    _controller = CameraController(
      camera,
      ResolutionPreset.medium, // 平衡画质和性能
      enableAudio: false,
      imageFormatGroup: Platform.isAndroid
          ? ImageFormatGroup.nv21
          : ImageFormatGroup.bgra8888,
    );

    try {
      await _controller!.initialize();
    } catch (e) {
      debugPrint('[Camera] 初始化失败: $e');
      return;
    }

    if (!mounted) return;

    // 初始化人脸检测器
    _faceDetector = FaceDetector(
      options: FaceDetectorOptions(
        enableClassification: false,   // 不需要微笑/睁眼分类
        enableContours: true,          // 需要轮廓点（用于鼻子定位）
        enableLandmarks: true,         // 需要关键点
        performanceMode: FaceDetectorMode.fast,
      ),
    );

    setState(() => _isInitialized = true);

    // 开始检测循环
    _startDetection();
  }

  // ============================================================
  // 人脸检测循环
  // ============================================================
  void _startDetection() {
    if (_isDetecting || _controller == null || !_controller!.value.isInitialized) return;
    _isDetecting = true;

    _controller!.startImageStream((CameraImage image) async {
      if (!_isDetecting) return;

      // FPS 统计
      _frameCount++;
      final now = DateTime.now();
      if (now.difference(_lastFpsTime).inMilliseconds >= 1000) {
        _fps = _frameCount;
        _frameCount = 0;
        _lastFpsTime = now;
      }

      // 构建 InputImage
      final inputImage = _buildInputImage(image);
      if (inputImage == null) return;

      // 执行检测
      final faces = await _faceDetector!.processImage(inputImage);

      if (mounted) {
        setState(() => _faces = faces);
      }
    });
  }

  void _stopDetection() {
    _isDetecting = false;
    _controller?.stopImageStream();
  }

  /// 将 CameraImage 转换为 ML Kit InputImage
  InputImage? _buildInputImage(CameraImage image) {
    final camera = _controller!.description;
    final sensorOrientation = camera.sensorOrientation;

    InputImageRotation? rotation;
    if (Platform.isIOS) {
      rotation = InputImageRotationValue.fromRawValue(sensorOrientation);
    } else if (Platform.isAndroid) {
      rotation = InputImageRotationValue.fromRawValue(sensorOrientation);
    }

    final format = Platform.isAndroid
        ? InputImageFormatValue.fromRawValue(image.format.raw)
        : InputImageFormat.bgra8888;

    if (format == null) return null;

    // 处理平面数据
    final plane = image.planes.first;
    return InputImage.fromBytes(
      bytes: plane.bytes,
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: rotation ?? InputImageRotation.rotation0deg,
        format: format,
        bytesPerRow: plane.bytesPerRow,
      ),
    );
  }

  // ============================================================
  // 构建 UI
  // ============================================================
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('📸 摄像头魔法'),
        centerTitle: true,
        actions: [
          // FPS 显示
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Text(
                '$_fps FPS',
                style: TextStyle(
                  fontSize: 12,
                  color: _fps > 20 ? Colors.greenAccent : Colors.orangeAccent,
                  fontFamily: 'monospace',
                ),
              ),
            ),
          ),
        ],
      ),
      body: _isInitialized ? _buildCameraPreview() : _buildLoading(),
      bottomNavigationBar: _buildControls(),
    );
  }

  Widget _buildLoading() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('正在启动摄像头...'),
        ],
      ),
    );
  }

  Widget _buildCameraPreview() {
    return Stack(
      fit: StackFit.expand,
      children: [
        // 层1: 摄像头预览
        CameraPreview(_controller!),

        // 层2: 人脸检测可视化（CustomPainter）
        if (_showMesh)
          CustomPaint(
            painter: FaceMeshPainter(
              faces: _faces,
              previewSize: _controller!.value.previewSize!,
              showSticker: _showSticker,
            ),
          ),
      ],
    );
  }

  Widget _buildControls() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
      ),
      child: SafeArea(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            // 面部网格开关
            FilterChip(
              label: const Text('🕸️ 网格'),
              selected: _showMesh,
              onSelected: (v) => setState(() => _showMesh = v),
            ),
            // 贴纸开关（待实现）
            FilterChip(
              label: const Text('🤡 贴纸'),
              selected: _showSticker,
              onSelected: (v) => setState(() => _showSticker = v),
            ),
            // 美颜开关（待实现）
            FilterChip(
              label: const Text('✨ 美颜'),
              selected: _showBeauty,
              onSelected: (v) => setState(() => _showBeauty = v),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// 面部网格绘制器
// ============================================================
class FaceMeshPainter extends CustomPainter {
  final List<Face> faces;
  final Size previewSize;
  final bool showSticker;

  FaceMeshPainter({
    required this.faces,
    required this.previewSize,
    this.showSticker = false,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (faces.isEmpty) return;

    // 计算缩放比例（预览尺寸 → 屏幕尺寸）
    final scaleX = size.width / previewSize.height; // 注意：预览旋转
    final scaleY = size.height / previewSize.width;

    // 绘制每张脸
    for (final face in faces) {
      _drawFaceRect(canvas, face, scaleX, scaleY, size);
      _drawLandmarks(canvas, face, scaleX, scaleY, size);
      _drawContours(canvas, face, scaleX, scaleY);
    }
  }

  /// 绘制人脸边界框
  void _drawFaceRect(Canvas canvas, Face face, double sx, double sy, Size size) {
    final rect = face.boundingBox;
    final paint = Paint()
      ..color = Colors.blue.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    // 坐标转换（ML Kit 坐标 → Canvas 坐标）
    // 注意：预览是横屏，屏幕是竖屏，需要旋转映射
    final left   = rect.top * sx;
    final top    = (previewSize.width - rect.right) * sy;
    final right  = rect.bottom * sx;
    final bottom = (previewSize.width - rect.left) * sy;

    canvas.drawRect(
      Rect.fromLTRB(left, top, right, bottom),
      paint,
    );
  }

  /// 绘制关键点（鼻尖、眼角等）
  void _drawLandmarks(Canvas canvas, Face face, double sx, double sy, Size size) {
    // ML Kit 提供的 landmark 类型：
    //   noseBase - 鼻梁底部
    //   leftEar / rightEar - 耳朵
    //   leftEye / rightEye - 眼睛中心
    //   leftMouth / rightMouth - 嘴角
    //   bottomMouth - 下唇中点

    for (final type in FaceLandmarkType.values) {
      final lm = face.landmarks[type];
      if (lm == null) continue;

      final x = lm.position.x * sx;
      final y = (previewSize.width - lm.position.y) * sy;

      final color = type == FaceLandmarkType.noseBase
          ? Colors.magenta
          : Colors.greenAccent;

      canvas.drawCircle(
        Offset(x, y),
        type == FaceLandmarkType.noseBase ? 6.0 : 3.0,
        Paint()..color = color.withOpacity(0.8),
      );
    }
  }

  /// 绘制面部轮廓（如果启用）
  void _drawContours(Canvas canvas, Face face, double sx, double sy) {
    final paint = Paint()
      ..color = Colors.greenAccent.withOpacity(0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    // ML Kit 提供 13 种轮廓：face, eyebrows, eyes, nose, lips 等
    for (final type in FaceContourType.values) {
      final contour = face.contours[type];
      if (contour == null || contour.points.length < 2) continue;

      final path = Path();
      for (int i = 0; i < contour.points.length; i++) {
        final p = contour.points[i];
        final x = p.x * sx;
        final y = (previewSize.width - p.y) * sy;

        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      path.close();
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant FaceMeshPainter oldDelegate) {
    return oldDelegate.faces != faces || oldDelegate.showSticker != showSticker;
  }
}
