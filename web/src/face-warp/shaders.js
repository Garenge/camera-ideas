export const vertexShaderSource = `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

export const fragmentShaderSource = `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uEnabled;
  uniform float uFaceCenterX;
  uniform float uFaceWidth;
  uniform float uFaceHeight;
  uniform float uTopY;
  uniform float uTempleY;
  uniform float uTempleHalfWidth;
  uniform float uCheekY;
  uniform float uCheekHalfWidth;
  uniform float uJawY;
  uniform float uJawHalfWidth;
  uniform float uNoseY;
  uniform vec2 uChin;
  uniform float uSlim;
  uniform float uLength;

  float remap(float value, float start, float end) {
    return clamp((value - start) / max(end - start, 0.0001), 0.0, 1.0);
  }

  float faceCenterAtY(float y) {
    float lowerProgress = remap(y, uCheekY, uChin.y);
    return mix(uFaceCenterX, uChin.x, lowerProgress);
  }

  float faceHalfWidthAtY(float y) {
    float foreheadWidth = uTempleHalfWidth * 0.72;
    float chinWidth = uFaceWidth * 0.10;

    if (y < uTempleY) {
      return mix(foreheadWidth, uTempleHalfWidth, remap(y, uTopY, uTempleY));
    }
    if (y < uCheekY) {
      return mix(
        uTempleHalfWidth,
        uCheekHalfWidth,
        remap(y, uTempleY, uCheekY)
      );
    }
    if (y < uJawY) {
      return mix(
        uCheekHalfWidth,
        uJawHalfWidth,
        remap(y, uCheekY, uJawY)
      );
    }
    return mix(uJawHalfWidth, chinWidth, remap(y, uJawY, uChin.y));
  }

  float verticalInfluenceMask(float y) {
    float topMask = smoothstep(
      uTopY - uFaceHeight * 0.08,
      uTopY + uFaceHeight * 0.06,
      y
    );
    float bottomMask = 1.0 - smoothstep(
      uChin.y + uFaceHeight * 0.015,
      uChin.y + uFaceHeight * 0.08,
      y
    );
    return topMask * bottomMask;
  }

  float horizontalInfluenceMask(vec2 uv, float innerEdge, float outerEdge) {
    float halfWidth = max(faceHalfWidthAtY(uv.y), uFaceWidth * 0.08);
    float normalizedX = abs(uv.x - faceCenterAtY(uv.y)) / halfWidth;
    return 1.0 - smoothstep(innerEdge, outerEdge, normalizedX);
  }

  float slimProfile(float y) {
    if (y < uTempleY) {
      return mix(0.0, 0.22, remap(y, uTopY, uTempleY));
    }
    if (y < uCheekY) {
      return mix(0.22, 0.58, remap(y, uTempleY, uCheekY));
    }
    if (y < uJawY) {
      return mix(0.58, 1.0, remap(y, uCheekY, uJawY));
    }
    return mix(1.0, 0.12, remap(y, uJawY, uChin.y));
  }

  vec2 slimDisplacement(vec2 uv) {
    float centerX = faceCenterAtY(uv.y);
    float halfWidth = max(faceHalfWidthAtY(uv.y), uFaceWidth * 0.08);
    float deltaX = uv.x - centerX;
    float normalizedX = abs(deltaX) / halfWidth;
    float centerProtection = smoothstep(0.18, 0.62, normalizedX);
    float mask = verticalInfluenceMask(uv.y)
      * horizontalInfluenceMask(uv, 1.02, 1.34);
    float offset = sign(deltaX)
      * uSlim
      * uFaceWidth
      * 0.075
      * slimProfile(uv.y)
      * centerProtection
      * mask;
    return vec2(offset, 0.0);
  }

  vec2 lengthDisplacement(vec2 uv) {
    float lowerProgress = remap(uv.y, uNoseY, uChin.y);
    float startMask = smoothstep(uNoseY, uNoseY + uFaceHeight * 0.08, uv.y);
    float chinFade = 1.0 - smoothstep(
      uChin.y + uFaceHeight * 0.005,
      uChin.y + uFaceHeight * 0.035,
      uv.y
    );
    float mask = verticalInfluenceMask(uv.y)
      * horizontalInfluenceMask(uv, 1.0, 1.22);
    float offset = uLength
      * uFaceHeight
      * 0.075
      * lowerProgress
      * startMask
      * chinFade
      * mask;
    return vec2(0.0, -offset);
  }

  void main() {
    vec2 sourceUv = vec2(vUv.x, 1.0 - vUv.y);
    vec2 sampleUv = sourceUv;

    if (uEnabled > 0.5) {
      vec2 displacement = slimDisplacement(sourceUv)
        + lengthDisplacement(sourceUv);
      vec2 displacementLimit = vec2(uFaceWidth * 0.085, uFaceHeight * 0.085);
      sampleUv += clamp(displacement, -displacementLimit, displacementLimit);
    }

    gl_FragColor = texture2D(uTexture, clamp(sampleUv, 0.0, 1.0));
  }
`;
