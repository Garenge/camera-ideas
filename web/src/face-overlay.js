import { normalizedPointToCanvas } from './coordinate-mapper.js';

export function drawFaceLandmarks(context, landmarks, width, height) {
  context.clearRect(0, 0, width, height);
  if (!landmarks?.length) return;

  context.fillStyle = 'rgba(0, 255, 128, 0.62)';
  for (const landmark of landmarks) {
    const point = normalizedPointToCanvas(landmark, width, height);
    context.beginPath();
    context.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
    context.fill();
  }

  const noseTip = normalizedPointToCanvas(landmarks[4], width, height);
  context.fillStyle = 'rgba(255, 0, 255, 0.92)';
  context.beginPath();
  context.arc(noseTip.x, noseTip.y, 5, 0, Math.PI * 2);
  context.fill();
}
