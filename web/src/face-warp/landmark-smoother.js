export class LandmarkSmoother {
  constructor(alpha = 0.38) {
    this.alpha = alpha;
    this.previous = null;
  }

  update(landmarks) {
    if (!landmarks?.length) {
      this.previous = null;
      return [];
    }

    if (!this.previous || this.previous.length !== landmarks.length) {
      this.previous = landmarks.map((point) => ({ ...point }));
      return this.previous;
    }

    this.previous = landmarks.map((point, index) => {
      const previous = this.previous[index];
      return {
        ...point,
        x: previous.x + (point.x - previous.x) * this.alpha,
        y: previous.y + (point.y - previous.y) * this.alpha,
        z: previous.z + (point.z - previous.z) * this.alpha,
      };
    });
    return this.previous;
  }

  reset() {
    this.previous = null;
  }
}
