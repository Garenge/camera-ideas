import { buildBeautyFilter } from './effects/beauty-filter.js';
import { drawNoseSticker } from './effects/nose-sticker.js';
import { drawFaceLandmarks } from './face-overlay.js';
import { FaceWarpRenderer } from './face-warp/face-warp-renderer.js';

export class RenderLoop {
  constructor({ canvas, controls, faceTracker, meshCanvas, sticker, video }) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.controls = controls;
    this.faceTracker = faceTracker;
    this.meshCanvas = meshCanvas;
    this.meshContext = meshCanvas.getContext('2d');
    this.sticker = sticker;
    this.video = video;
    this.warpRenderer = new FaceWarpRenderer(canvas.width, canvas.height);
    this.animationFrame = null;
    this.frameCount = 0;
    this.lastFpsAt = 0;
  }

  start() {
    this.lastFpsAt = performance.now();
    this.render();
  }

  stop() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.meshContext.clearRect(0, 0, this.meshCanvas.width, this.meshCanvas.height);
    this.warpRenderer.destroy();
  }

  render = () => {
    const { width, height } = this.canvas;
    this.faceTracker.detect(this.video);
    this.drawVideo(width, height);
    this.drawEffects(width, height);
    this.updatePerformance();
    this.animationFrame = requestAnimationFrame(this.render);
  };

  drawVideo(width, height) {
    const warpedFrame = this.warpRenderer.render(
      this.video,
      this.faceTracker.latestLandmarks[0],
      {
        enabled: this.controls.warp.checked,
        length: this.controls.length.value,
        slim: this.controls.slim.value,
      },
    );
    this.context.save();
    this.context.filter = buildBeautyFilter({
      enabled: this.controls.beauty.checked,
      smooth: this.controls.smooth.value,
      whiten: this.controls.whiten.value,
    });
    this.context.drawImage(warpedFrame, 0, 0, width, height);
    this.context.restore();
  }

  drawEffects(width, height) {
    const landmarks = this.faceTracker.latestLandmarks[0];
    if (this.controls.mesh.checked) {
      drawFaceLandmarks(this.meshContext, landmarks, width, height);
    } else {
      this.meshContext.clearRect(0, 0, width, height);
    }

    if (this.controls.sticker.checked && landmarks) {
      drawNoseSticker(this.context, this.sticker, landmarks, width, height);
    }
    this.controls.faces.textContent = `${this.faceTracker.latestLandmarks.length} 张脸`;
  }

  updatePerformance() {
    this.frameCount += 1;
    const now = performance.now();
    if (now - this.lastFpsAt < 1000) return;

    const fps = Math.round(this.frameCount / ((now - this.lastFpsAt) / 1000));
    this.controls.fps.textContent = `${fps} FPS`;
    this.frameCount = 0;
    this.lastFpsAt = now;
  }
}
