import { clamp, distance, rand, randInt } from './utils';
import { solveShot } from './ShotSolver';
import type { HoopState, Point, RoundKind, RoundState } from './types';

export interface WorldSize {
  width: number;
  height: number;
}

function getSafeMargin(size: WorldSize): number {
  const minSide = Math.min(size.width, size.height);
  return clamp(minSide * 0.08, 42, 88);
}

function getPlayerHand(player: { x: number; y: number; facingRight: boolean }): Point {
  const dir = player.facingRight ? 1 : -1;
  return {
    x: player.x + dir * 20,
    y: player.y - 14,
  };
}

function buildHoop(size: WorldSize, x: number, y: number): HoopState {
  const base = Math.min(size.width, size.height);
  return {
    x,
    y,
    width: clamp(base * 0.085, 48, 74),
    height: clamp(base * 0.06, 30, 46),
  };
}

function createRandomPoint(size: WorldSize, margin: number, halfWidth: number, halfHeight: number): Point {
  return {
    x: rand(margin + halfWidth, size.width - margin - halfWidth),
    y: rand(margin + halfHeight, size.height - margin - halfHeight),
  };
}

interface SolveCandidate {
  angle: number;
  power: number;
  time: number;
}

interface SimulatedShotResult {
  hit: boolean;
  bounceCount: number;
}

function simulateShot(
  size: WorldSize,
  start: Point,
  angle: number,
  power: number,
  gravity: number,
  hoop: HoopState,
  maxFlightTime: number,
): SimulatedShotResult {
  const dt = 1 / 120;
  const radius = 8;
  let x = start.x;
  let y = start.y;
  let vx = Math.cos(angle) * power;
  let vy = Math.sin(angle) * power;
  let elapsed = 0;
  let bounceCount = 0;

  while (elapsed <= maxFlightTime + 0.2) {
    vy += gravity * dt;
    x += vx * dt;
    y += vy * dt;

    if (x <= radius && vx < 0) {
      x = radius;
      vx = Math.abs(vx);
      bounceCount += 1;
    } else if (x >= size.width - radius && vx > 0) {
      x = size.width - radius;
      vx = -Math.abs(vx);
      bounceCount += 1;
    }

    const hitLeft = hoop.x - hoop.width * 0.5;
    const hitTop = hoop.y - hoop.height * 0.34;
    const hitWidth = hoop.width;
    const hitHeight = hoop.height * 0.72;
    const hitRight = hitLeft + hitWidth;
    const hitBottom = hitTop + hitHeight;
    if (x >= hitLeft && x <= hitRight && y >= hitTop && y <= hitBottom) {
      return { hit: true, bounceCount };
    }

    if (y > size.height + 180) {
      break;
    }

    elapsed += dt;
  }

  return { hit: false, bounceCount };
}

function buildRoundFromSolution(
  roundId: number,
  kind: RoundKind,
  size: WorldSize,
  gravity: number,
  player: { x: number; y: number; facingRight: boolean },
  hoop: HoopState,
  solution: SolveCandidate,
): RoundState {
  return {
    id: roundId,
    kind,
    gravity,
    player: { ...player },
    hoop,
    hand: getPlayerHand(player),
    launchAngle: solution.angle,
    solutionPower: solution.power,
    minPower: solution.power * 0.45,
    maxPower: solution.power * 1.55,
    targetTime: solution.time,
    maxFlightTime: solution.time + clamp(size.height / 320, 0.85, 1.65),
  };
}

function tryBuildNormalRound(size: WorldSize, roundId: number): RoundState | null {
  const safeMargin = getSafeMargin(size);
  const minDistance = Math.max(180, Math.min(size.width, size.height) * 0.28);
  const gravity = clamp(size.height * 3.15, 1300, 2200);
  const minSpeed = clamp(size.height * 0.95, 540, 1200);
  const maxSpeed = clamp(size.height * 4.2, 1800, 3800);
  const playerHalfWidth = 24;
  const playerHalfHeight = 44;
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const player = createRandomPoint(size, safeMargin, playerHalfWidth, playerHalfHeight);
    const hoop = buildHoop(
      size,
      rand(safeMargin + 30, size.width - safeMargin - 30),
      rand(safeMargin + 40, size.height - safeMargin - 40),
    );

    if (distance(player.x, player.y, hoop.x, hoop.y) < minDistance) {
      continue;
    }

    const facingRight = hoop.x >= player.x;
    const hand = getPlayerHand({ ...player, facingRight });

    if (distance(hand.x, hand.y, hoop.x, hoop.y) < 110) {
      continue;
    }

    const solution = solveShot({
      start: hand,
      target: { x: hoop.x, y: hoop.y },
      gravity,
      minSpeed,
      maxSpeed,
    });

    if (!solution) {
      continue;
    }

    return buildRoundFromSolution(roundId, 'NORMAL', size, gravity, { ...player, facingRight }, hoop, solution);
  }

  return null;
}

function tryBuildBounceRound(size: WorldSize, roundId: number): RoundState | null {
  const safeMargin = getSafeMargin(size);
  const minDistance = Math.max(180, Math.min(size.width, size.height) * 0.28);
  const gravity = clamp(size.height * 3.15, 1300, 2200);
  const minSpeed = clamp(size.height * 0.95, 540, 1200);
  const maxSpeed = clamp(size.height * 4.2, 1800, 3800);
  const playerHalfWidth = 24;
  const playerHalfHeight = 44;
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const player = createRandomPoint(size, safeMargin, playerHalfWidth, playerHalfHeight);
    const hoop = buildHoop(
      size,
      rand(safeMargin + 30, size.width - safeMargin - 30),
      rand(safeMargin + 40, size.height - safeMargin - 40),
    );

    if (distance(player.x, player.y, hoop.x, hoop.y) < minDistance) {
      continue;
    }

    const facingRight = hoop.x >= player.x;
    const hand = getPlayerHand({ ...player, facingRight });

    if (distance(hand.x, hand.y, hoop.x, hoop.y) < 110) {
      continue;
    }

    const mirrorTargets = [
      { x: -hoop.x, y: hoop.y },
      { x: size.width * 2 - hoop.x, y: hoop.y },
    ];

    for (const mirroredTarget of mirrorTargets) {
      const solution = solveShot({
        start: hand,
        target: mirroredTarget,
        gravity,
        minSpeed,
        maxSpeed,
      });

      if (!solution) {
        continue;
      }

      const simulated = simulateShot(size, hand, solution.angle, solution.power, gravity, hoop, solution.time + clamp(size.height / 320, 0.85, 1.65));
      if (!simulated.hit || simulated.bounceCount < 1) {
        continue;
      }

      return buildRoundFromSolution(roundId, 'BOUNCE', size, gravity, { ...player, facingRight }, hoop, solution);
    }
  }

  return null;
}

export function createRound(size: WorldSize, roundId: number): RoundState {
  const wantsBounce = rand(0, 1) < 1 / 3;
  const round = wantsBounce ? tryBuildBounceRound(size, roundId) : tryBuildNormalRound(size, roundId);
  if (round) {
    return round;
  }

  const fallback = tryBuildNormalRound(size, roundId);
  if (fallback) {
    return fallback;
  }

  const fallbackFacingRight = randInt(0, 1) === 1;
  const fallbackPlayer = {
    x: size.width * 0.28,
    y: size.height * 0.62,
    facingRight: fallbackFacingRight,
  };
  const fallbackHoop = buildHoop(size, size.width * 0.72, size.height * 0.36);
  const fallbackHand = getPlayerHand(fallbackPlayer);
  const gravity = clamp(size.height * 3.15, 1300, 2200);
  const minSpeed = clamp(size.height * 0.95, 540, 1200);
  const maxSpeed = clamp(size.height * 4.2, 1800, 3800);
  const fallbackSolution = solveShot({
    start: fallbackHand,
    target: { x: fallbackHoop.x, y: fallbackHoop.y },
    gravity,
    minSpeed,
    maxSpeed,
  }) ?? {
    angle: Math.atan2(fallbackHoop.y - fallbackHand.y, fallbackHoop.x - fallbackHand.x),
    power: clamp(distance(fallbackHand.x, fallbackHand.y, fallbackHoop.x, fallbackHoop.y) * 2.2, minSpeed, maxSpeed),
    time: 1,
    weirdness: 0,
  };

  return {
    id: roundId,
    kind: 'NORMAL',
    gravity,
    player: fallbackPlayer,
    hoop: fallbackHoop,
    hand: fallbackHand,
    launchAngle: fallbackSolution.angle,
    solutionPower: fallbackSolution.power,
    minPower: fallbackSolution.power * 0.45,
    maxPower: fallbackSolution.power * 1.55,
    targetTime: fallbackSolution.time,
    maxFlightTime: fallbackSolution.time + clamp(size.height / 320, 0.85, 1.65),
  };
}
