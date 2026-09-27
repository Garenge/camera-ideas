const STATE_CONFIG = {
  error: { icon: '❌', label: '启动失败', loading: false, statusClass: 'status-off' },
  idle: { icon: '📷', label: '点击下方按钮启动摄像头', loading: false, statusClass: 'status-off' },
  loadingModel: { icon: '⏳', label: '正在加载本地 AI 模型', loading: true, statusClass: 'status-off' },
  requestingCamera: { icon: '📷', label: '正在请求摄像头权限', loading: true, statusClass: 'status-off' },
  running: { icon: '🟢', label: '运行中', loading: false, statusClass: 'status-on' },
  stopping: { icon: '⏹', label: '正在停止', loading: true, statusClass: 'status-off' },
};

export class UiState {
  constructor(elements) {
    this.elements = elements;
  }

  set(state, detail = '') {
    const config = STATE_CONFIG[state];
    const { detail: detailElement, loading, loadingText, placeholder, placeholderText, status } = this.elements;
    status.textContent = `${config.icon} ${config.label}`;
    status.className = config.statusClass;
    placeholderText.textContent = config.label;
    detailElement.textContent = detail;
    loadingText.textContent = config.label;
    loading.classList.toggle('hidden', !config.loading);
    placeholder.classList.toggle('hidden', state === 'running');
  }

  setRunningView({ canvas, meshCanvas, running }) {
    canvas.style.display = running ? 'block' : 'none';
    meshCanvas.style.display = running ? 'block' : 'none';
    this.elements.button.textContent = running ? '⏹ 停止摄像头' : '🎥 启动摄像头';
    this.elements.button.classList.toggle('stop', running);
  }

  setBusy(isBusy) {
    this.elements.button.disabled = isBusy;
  }
}
