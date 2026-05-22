export type GameMode = 'READY' | 'CHARGING' | 'SHOOTING' | 'SCORED' | 'RESETTING';
export type RoundKind = 'NORMAL' | 'BOUNCE';

export interface Point {
  x: number;
  y: number;
}

export interface PlayerState {
  x: number;
  y: number;
  facingRight: boolean;
}

export interface HoopState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShotSolution {
  angle: number;
  power: number;
  time: number;
  weirdness: number;
}

export interface RoundState {
  id: number;
  kind: RoundKind;
  gravity: number;
  player: PlayerState;
  hoop: HoopState;
  hand: Point;
  launchAngle: number;
  solutionPower: number;
  minPower: number;
  maxPower: number;
  targetTime: number;
  maxFlightTime: number;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
  elapsed: number;
  trail: Point[];
}
