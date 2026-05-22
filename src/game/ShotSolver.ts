import type { Point, ShotSolution } from './types';
import { normalizeAngle } from './utils';

export interface SolveShotInput {
  start: Point;
  target: Point;
  gravity: number;
  minSpeed: number;
  maxSpeed: number;
}

function scoreCandidate(baseAngle: number, angle: number): number {
  const offset = Math.abs(normalizeAngle(angle - baseAngle));
  return offset * 100 + Math.abs(angle) * 3;
}

export function solveShot(input: SolveShotInput): ShotSolution | null {
  const dx = input.target.x - input.start.x;
  const dy = input.target.y - input.start.y;

  if (Math.abs(dx) < 40) {
    return null;
  }

  const baseAngle = Math.atan2(dy, dx);
  const offsets = [
    0,
    0.14,
    -0.14,
    0.28,
    -0.28,
    0.46,
    -0.46,
    0.64,
    -0.64,
    0.84,
    -0.84,
    1.04,
    -1.04,
    1.24,
    -1.24,
  ];

  let best: ShotSolution | null = null;
  let bestScore = -Infinity;

  for (const offset of offsets) {
    const angle = normalizeAngle(baseAngle + offset);
    const cos = Math.cos(angle);
    const tan = Math.tan(angle);

    if (Math.abs(cos) < 0.12) {
      continue;
    }

    if (Math.sign(cos) !== Math.sign(dx)) {
      continue;
    }

    const denominator = dy - dx * tan;
    if (denominator <= 8) {
      continue;
    }

    const speedSq = (input.gravity * dx * dx) / (2 * cos * cos * denominator);
    if (!Number.isFinite(speedSq) || speedSq <= 0) {
      continue;
    }

    const power = Math.sqrt(speedSq);
    if (power < input.minSpeed || power > input.maxSpeed) {
      continue;
    }

    const time = dx / (power * cos);
    if (!Number.isFinite(time) || time <= 0) {
      continue;
    }

    const weirdness = scoreCandidate(baseAngle, angle);
    if (weirdness > bestScore) {
      bestScore = weirdness;
      best = {
        angle,
        power,
        time,
        weirdness,
      };
    }
  }

  return best;
}
