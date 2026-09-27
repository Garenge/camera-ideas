import { LandmarkSmoother } from './face-warp/landmark-smoother.js';

const MODEL_PATH = 'node_modules/@mediapipe/face_mesh/';

export class FaceTracker {
  constructor() {
    this.instance = null;
    this.isProcessing = false;
    this.latestLandmarks = [];
    this.lastErrorAt = 0;
    this.smoother = new LandmarkSmoother();
  }

  async initialize() {
    if (this.instance) return;
    if (typeof window.FaceMesh !== 'function') {
      throw new Error('MediaPipe FaceMesh 脚本未加载');
    }

    const instance = new window.FaceMesh({
      locateFile: (file) => `${MODEL_PATH}${file}`,
    });

    instance.setOptions({
      maxNumFaces: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      refineLandmarks: true,
    });
    instance.onResults((results) => {
      const faces = results.multiFaceLandmarks || [];
      this.latestLandmarks = faces.length
        ? [this.smoother.update(faces[0])]
        : [];
    });

    await instance.initialize();
    this.instance = instance;
    console.info('[face-tracker.js][initialize] FaceMesh ready');
  }

  async detect(videoElement) {
    if (!this.instance || this.isProcessing || videoElement.readyState < 2) return;

    this.isProcessing = true;
    try {
      await this.instance.send({ image: videoElement });
    } catch (error) {
      this.logDetectionError(error);
    } finally {
      this.isProcessing = false;
    }
  }

  async close() {
    const instance = this.instance;
    this.instance = null;
    this.latestLandmarks = [];
    this.isProcessing = false;
    this.smoother.reset();
    if (instance) await instance.close();
    console.info('[face-tracker.js][close] FaceMesh closed');
  }

  logDetectionError(error) {
    const now = Date.now();
    if (now - this.lastErrorAt < 2000) return;
    this.lastErrorAt = now;
    console.error('[face-tracker.js][detect] Detection failed:', error);
  }
}
