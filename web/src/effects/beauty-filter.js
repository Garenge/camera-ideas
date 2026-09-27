export function buildBeautyFilter({ enabled, smooth, whiten }) {
  if (!enabled) return 'none';

  const whitenRatio = Number(whiten) / 100;
  const smoothRatio = Number(smooth) / 100;
  const brightness = 1 + whitenRatio * 0.2;
  const saturation = 1 - whitenRatio * 0.12;
  const blur = smoothRatio * 1.2;

  return [
    `brightness(${brightness.toFixed(3)})`,
    `saturate(${saturation.toFixed(3)})`,
    `blur(${blur.toFixed(2)}px)`,
  ].join(' ');
}
