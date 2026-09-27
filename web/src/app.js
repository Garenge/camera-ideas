import { CameraController } from './camera-controller.js';
import { createNoseSticker } from './effects/nose-sticker.js';
import { FaceTracker } from './face-tracker.js';
import { RenderLoop } from './render-loop.js';
import { UiState } from './ui-state.js';

const elements = {
  button: document.querySelector('#btn-camera'),
  canvas: document.querySelector('#output'),
  detail: document.querySelector('#placeholder-detail'),
  loading: document.querySelector('#loading'),
  loadingText: document.querySelector('#loading-text'),
  meshCanvas: document.querySelector('#mesh-overlay'),
  placeholder: document.querySelector('#placeholder'),
  placeholderText: document.querySelector('#placeholder-text'),
  status: document.querySelector('#status'),
  video: document.querySelector('#video'),
  viewport: document.querySelector('#viewport'),
};
const controls = {
  beauty: document.querySelector('#toggle-beauty'),
  faces: document.querySelector('#faces'),
  fps: document.querySelector('#fps'),
  mesh: document.querySelector('#toggle-mesh'),
  length: document.querySelector('#slider-length'),
  lengthValue: document.querySelector('#val-length'),
  smooth: document.querySelector('#slider-smooth'),
  smoothValue: document.querySelector('#val-smooth'),
  slim: document.querySelector('#slider-slim'),
  slimValue: document.querySelector('#val-slim'),
  sticker: document.querySelector('#toggle-sticker'),
  warp: document.querySelector('#toggle-warp'),
  whiten: document.querySelector('#slider-whiten'),
  whitenValue: document.querySelector('#val-whiten'),
};

const camera = new CameraController(elements.video);
const tracker = new FaceTracker();
const ui = new UiState(elements);
const sticker = createNoseSticker();
let renderer = null;
let running = false;
let busy = false;

async function start() {
  setBusy(true);
  try {
    ui.set('loadingModel', '首次初始化可能需要几秒');
    await tracker.initialize();
    ui.set('requestingCamera', '请在权限提示中允许摄像头访问');
    const size = await camera.start();
    configureCanvas(size);
    renderer = new RenderLoop({
      canvas: elements.canvas,
      controls,
      faceTracker: tracker,
      meshCanvas: elements.meshCanvas,
      sticker,
      video: elements.video,
    });
    running = true;
    ui.setRunningView({ canvas: elements.canvas, meshCanvas: elements.meshCanvas, running });
    ui.set('running');
    renderer.start();
  } catch (error) {
    console.error('[app.js][start] Startup failed:', error);
    await releaseResources();
    ui.setRunningView({ canvas: elements.canvas, meshCanvas: elements.meshCanvas, running: false });
    ui.set('error', getErrorMessage(error));
  } finally {
    setBusy(false);
  }
}

async function stop() {
  setBusy(true);
  ui.set('stopping');
  await releaseResources();
  ui.setRunningView({ canvas: elements.canvas, meshCanvas: elements.meshCanvas, running: false });
  ui.set('idle', '模型与特效均在本地运行');
  controls.fps.textContent = '-- FPS';
  controls.faces.textContent = '0 张脸';
  setBusy(false);
}

async function releaseResources() {
  running = false;
  renderer?.stop();
  renderer = null;
  camera.stop();
  await tracker.close();
}

function configureCanvas({ height, width }) {
  elements.canvas.width = width;
  elements.canvas.height = height;
  elements.meshCanvas.width = width;
  elements.meshCanvas.height = height;
  elements.viewport.style.aspectRatio = `${width} / ${height}`;
}

function getErrorMessage(error) {
  if (error?.name === 'NotAllowedError') return '摄像头权限被拒绝，请在浏览器设置中重新允许';
  if (error?.name === 'NotFoundError') return '未检测到可用摄像头';
  return error?.message || '未知错误，请查看浏览器控制台';
}

function setBusy(value) {
  busy = value;
  ui.setBusy(value);
}

elements.button.addEventListener('click', () => {
  if (busy) return;
  if (running) stop();
  else start();
});
controls.whiten.addEventListener('input', () => {
  controls.whitenValue.textContent = controls.whiten.value;
});
controls.smooth.addEventListener('input', () => {
  controls.smoothValue.textContent = controls.smooth.value;
});
controls.slim.addEventListener('input', () => {
  controls.slimValue.textContent = controls.slim.value;
});
controls.length.addEventListener('input', () => {
  controls.lengthValue.textContent = controls.length.value;
});
window.addEventListener('pagehide', () => {
  renderer?.stop();
  camera.stop();
  tracker.close();
});

ui.set('idle', '模型与特效均在本地运行');
console.info('[app.js][initialize] Demo ready');
