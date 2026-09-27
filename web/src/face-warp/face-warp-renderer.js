import { buildFaceWarpParameters } from './face-shape.js';
import { fragmentShaderSource, vertexShaderSource } from './shaders.js';

export class FaceWarpRenderer {
  constructor(width, height) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl = this.canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!this.gl) throw new Error('当前浏览器不支持 WebGL 变脸渲染');

    this.program = createProgram(this.gl, vertexShaderSource, fragmentShaderSource);
    this.texture = createTexture(this.gl);
    this.buffer = createFullscreenBuffer(this.gl);
    this.locations = getLocations(this.gl, this.program);
    this.configurePipeline();
  }

  render(video, landmarks, settings) {
    const gl = this.gl;
    const parameters = buildFaceWarpParameters(landmarks, settings);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      video,
    );
    this.setUniforms(parameters);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.flush();
    return this.canvas;
  }

  destroy() {
    const gl = this.gl;
    gl.deleteBuffer(this.buffer);
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  configurePipeline() {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.locations.position);
    gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(this.locations.texture, 0);
  }

  setUniforms(parameters) {
    const gl = this.gl;
    const locations = this.locations;
    gl.uniform1f(locations.enabled, parameters.enabled);
    gl.uniform1f(locations.faceCenterX, parameters.faceCenterX);
    gl.uniform1f(locations.faceWidth, parameters.faceWidth);
    gl.uniform1f(locations.faceHeight, parameters.faceHeight);
    gl.uniform1f(locations.topY, parameters.topY);
    gl.uniform1f(locations.templeY, parameters.templeY);
    gl.uniform1f(locations.templeHalfWidth, parameters.templeHalfWidth);
    gl.uniform1f(locations.cheekY, parameters.cheekY);
    gl.uniform1f(locations.cheekHalfWidth, parameters.cheekHalfWidth);
    gl.uniform1f(locations.jawY, parameters.jawY);
    gl.uniform1f(locations.jawHalfWidth, parameters.jawHalfWidth);
    gl.uniform1f(locations.noseY, parameters.noseY);
    gl.uniform1f(locations.slim, parameters.slim);
    gl.uniform1f(locations.length, parameters.length);
    gl.uniform2fv(locations.chin, parameters.chin);
  }
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`WebGL shader 编译失败: ${message}`);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`WebGL program 链接失败: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

function createTexture(gl) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

function createFullscreenBuffer(gl) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  return buffer;
}

function getLocations(gl, program) {
  return {
    cheekHalfWidth: gl.getUniformLocation(program, 'uCheekHalfWidth'),
    cheekY: gl.getUniformLocation(program, 'uCheekY'),
    chin: gl.getUniformLocation(program, 'uChin'),
    enabled: gl.getUniformLocation(program, 'uEnabled'),
    faceCenterX: gl.getUniformLocation(program, 'uFaceCenterX'),
    faceHeight: gl.getUniformLocation(program, 'uFaceHeight'),
    faceWidth: gl.getUniformLocation(program, 'uFaceWidth'),
    jawHalfWidth: gl.getUniformLocation(program, 'uJawHalfWidth'),
    jawY: gl.getUniformLocation(program, 'uJawY'),
    length: gl.getUniformLocation(program, 'uLength'),
    noseY: gl.getUniformLocation(program, 'uNoseY'),
    position: gl.getAttribLocation(program, 'aPosition'),
    slim: gl.getUniformLocation(program, 'uSlim'),
    templeHalfWidth: gl.getUniformLocation(program, 'uTempleHalfWidth'),
    templeY: gl.getUniformLocation(program, 'uTempleY'),
    texture: gl.getUniformLocation(program, 'uTexture'),
    topY: gl.getUniformLocation(program, 'uTopY'),
  };
}
