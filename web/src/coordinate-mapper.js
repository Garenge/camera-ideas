export function normalizedPointToCanvas(point, width, height) {
  return {
    x: point.x * width,
    y: point.y * height,
  };
}

export function calculateNoseTransform(landmarks, width, height) {
  if (!landmarks || landmarks.length < 295) return null;

  const tip = normalizedPointToCanvas(landmarks[4], width, height);
  const bridge = normalizedPointToCanvas(landmarks[6], width, height);
  const leftAla = normalizedPointToCanvas(landmarks[64], width, height);
  const rightAla = normalizedPointToCanvas(landmarks[294], width, height);
  const alaX = rightAla.x - leftAla.x;
  const alaY = rightAla.y - leftAla.y;

  return {
    angle: Math.atan2(bridge.y - tip.y, bridge.x - tip.x) + Math.PI / 2,
    size: Math.hypot(alaX, alaY) * 1.6,
    x: tip.x,
    y: tip.y,
  };
}
