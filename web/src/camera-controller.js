export class CameraController {
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.stream = null;
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前浏览器不支持摄像头 API');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        height: { ideal: 480 },
        width: { ideal: 640 },
      },
    });

    this.videoElement.srcObject = this.stream;
    await this.videoElement.play();
    await this.waitForMetadata();

    const { videoWidth: width, videoHeight: height } = this.videoElement;
    if (!width || !height) {
      throw new Error('摄像头未返回有效的视频尺寸');
    }

    console.info(`[camera-controller.js][start] Camera ready: ${width}x${height}`);
    return { height, width };
  }

  stop() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.videoElement.pause();
    this.videoElement.srcObject = null;
    console.info('[camera-controller.js][stop] Camera stopped');
  }

  waitForMetadata() {
    if (this.videoElement.videoWidth > 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.videoElement.addEventListener('loadedmetadata', resolve, { once: true });
    });
  }
}
