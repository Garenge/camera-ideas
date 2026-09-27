const FACE_INDEX = {
  chin: 152,
  forehead: 10,
  jawLeft: 172,
  jawRight: 397,
  cheekLeft: 234,
  cheekRight: 454,
  nose: 1,
  templeLeft: 127,
  templeRight: 356,
};

export function buildFaceWarpParameters(landmarks, settings) {
  if (!hasRequiredLandmarks(landmarks) || !settings.enabled) {
    return disabledParameters();
  }

  const forehead = landmarks[FACE_INDEX.forehead];
  const nose = landmarks[FACE_INDEX.nose];
  const chin = landmarks[FACE_INDEX.chin];
  const temple = readPair(landmarks, FACE_INDEX.templeLeft, FACE_INDEX.templeRight);
  const cheek = readPair(landmarks, FACE_INDEX.cheekLeft, FACE_INDEX.cheekRight);
  const jaw = readPair(landmarks, FACE_INDEX.jawLeft, FACE_INDEX.jawRight);
  const faceWidth = Math.max(temple.width, cheek.width, jaw.width);
  const faceHeight = Math.abs(chin.y - forehead.y);
  const yawRatio = faceWidth > 0
    ? Math.abs(nose.x - cheek.centerX) / faceWidth
    : 1;
  const poseFactor = clamp(1 - yawRatio * 4, 0, 1);

  return {
    cheekHalfWidth: cheek.width / 2,
    cheekY: cheek.centerY,
    chin: [chin.x, chin.y],
    enabled: 1,
    faceCenterX: cheek.centerX,
    faceHeight,
    faceWidth,
    jawHalfWidth: jaw.width / 2,
    jawY: jaw.centerY,
    length: clamp(Number(settings.length) / 50, -1, 1) * poseFactor,
    noseY: nose.y,
    slim: clamp(Number(settings.slim) / 100, 0, 1) * poseFactor,
    templeHalfWidth: temple.width / 2,
    templeY: temple.centerY,
    topY: forehead.y,
  };
}

function hasRequiredLandmarks(landmarks) {
  return Boolean(
    landmarks
    && landmarks.length > FACE_INDEX.cheekRight
    && landmarks[FACE_INDEX.forehead]
    && landmarks[FACE_INDEX.chin],
  );
}

function readPair(landmarks, leftIndex, rightIndex) {
  const left = landmarks[leftIndex];
  const right = landmarks[rightIndex];
  return {
    centerX: (left.x + right.x) / 2,
    centerY: (left.y + right.y) / 2,
    width: Math.abs(right.x - left.x),
  };
}

function disabledParameters() {
  return {
    cheekHalfWidth: 0.2,
    cheekY: 0.5,
    chin: [0.5, 0.8],
    enabled: 0,
    faceCenterX: 0.5,
    faceHeight: 0.6,
    faceWidth: 0.4,
    jawHalfWidth: 0.16,
    jawY: 0.68,
    length: 0,
    noseY: 0.48,
    slim: 0,
    templeHalfWidth: 0.2,
    templeY: 0.38,
    topY: 0.2,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
