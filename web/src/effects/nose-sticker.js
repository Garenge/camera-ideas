import { calculateNoseTransform } from '../coordinate-mapper.js';

export function createNoseSticker() {
  const sticker = document.createElement('canvas');
  sticker.width = 160;
  sticker.height = 160;
  const context = sticker.getContext('2d');
  const gradient = context.createRadialGradient(56, 48, 8, 80, 80, 80);

  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.15, 'rgba(255,180,180,0.95)');
  gradient.addColorStop(0.4, 'rgba(255,60,60,0.95)');
  gradient.addColorStop(0.8, 'rgba(200,20,20,0.9)');
  gradient.addColorStop(1, 'rgba(140,10,10,0.8)');

  context.beginPath();
  context.arc(80, 80, 76, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();
  return sticker;
}

export function drawNoseSticker(context, sticker, landmarks, width, height) {
  const transform = calculateNoseTransform(landmarks, width, height);
  if (!transform || transform.size <= 0) return;

  const halfSize = transform.size / 2;
  context.save();
  context.translate(transform.x, transform.y);
  context.rotate(transform.angle);
  context.drawImage(sticker, -halfSize, -halfSize, transform.size, transform.size);
  context.restore();
}
