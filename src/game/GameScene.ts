import Phaser from 'phaser';
import { createRound } from './RoundGenerator';
import { installPixelArtTextures, PixelArtPalette } from './PixelArtFactory';
import type { BallState, GameMode, Point, RoundState } from './types';
import { clamp, formatPowerRatio, lerp } from './utils';

const CHARGE_DURATION = 1180;
const SCORED_DELAY = 620;
const RESETTING_DELAY = 140;
const BALL_RADIUS = 8;
const SCREEN_MARGIN_FACTOR = 0.28;
const TRAIL_LENGTH = 12;
const AIM_SPRITES = 4;
const TRAIL_SPRITES = 8;
const STORAGE_KEY = 'shootman.progress.v1';

function getHud(): Window['__shootmanHud'] {
  return window.__shootmanHud;
}

function getGameSize(scene: Phaser.Scene): { width: number; height: number } {
  return {
    width: Math.max(1, scene.scale.width),
    height: Math.max(1, scene.scale.height),
  };
}

function getHandPoint(round: RoundState): Point {
  const dir = round.player.facingRight ? 1 : -1;
  return {
    x: round.player.x + dir * 20,
    y: round.player.y - 14,
  };
}

function createBallAtHand(round: RoundState): BallState {
  const hand = getHandPoint(round);
  return {
    x: hand.x,
    y: hand.y,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    active: false,
    elapsed: 0,
    trail: [],
  };
}

function loadSavedScore(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { score?: unknown };
    const score = Number(parsed?.score);
    if (!Number.isFinite(score) || score < 0) return 0;
    return Math.floor(score);
  } catch {
    return 0;
  }
}

function saveProgress(score: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ score: Math.max(0, Math.floor(score)) }));
  } catch {
    // Ignore storage failures in private / restricted modes.
  }
}

export class GameScene extends Phaser.Scene {
  private sky!: Phaser.GameObjects.Rectangle;
  private sun!: Phaser.GameObjects.Image;
  private clouds: Phaser.GameObjects.Image[] = [];
  private stands: Phaser.GameObjects.Image[] = [];
  private courtSurface!: Phaser.GameObjects.TileSprite;
  private courtBackEdge!: Phaser.GameObjects.Rectangle;
  private courtMarks!: Phaser.GameObjects.Graphics;
  private courtLine!: Phaser.GameObjects.Rectangle;
  private courtCenterLine!: Phaser.GameObjects.Rectangle;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private playerSprite!: Phaser.GameObjects.Image;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private ballSprite!: Phaser.GameObjects.Image;
  private hoopSprite!: Phaser.GameObjects.Image;
  private aimSprites: Phaser.GameObjects.Image[] = [];
  private trailSprites: Phaser.GameObjects.Image[] = [];
  private round!: RoundState;
  private ball!: BallState;
  private mode: GameMode = 'READY';
  private score = 0;
  private chargeElapsed = 0;
  private chargeRatio = 0;
  private stateTimer = 0;
  private nextRoundId = 1;
  private hasAwardedScore = false;
  private lastRenderState = '';
  private resizeHandler?: (size: Phaser.Structs.Size) => void;
  private windowKeyDownHandler?: (event: KeyboardEvent) => void;
  private windowKeyUpHandler?: (event: KeyboardEvent) => void;
  private windowBlurHandler?: () => void;

  create(): void {
    installPixelArtTextures(this);
    this.cameras.main.roundPixels = true;
    this.cameras.main.setBackgroundColor(PixelArtPalette.sky);
    this.ensureVisuals();
    this.score = loadSavedScore();
    this.round = createRound(getGameSize(this), this.nextRoundId);
    this.nextRoundId += 1;
    this.ball = createBallAtHand(this.round);
    this.installInput();
    this.installResizeHook();
    window.__shootmanScene = this;
    getHud()?.primeLegendaryState(this.score);
    this.refreshHud();
    this.renderWorld();
    this.syncTextHooks();
  }

  private ensureVisuals(): void {
    const { width, height } = getGameSize(this);

    this.sky = this.add.rectangle(width / 2, height / 2, width, height, Phaser.Display.Color.HexStringToColor(PixelArtPalette.sky).color);
    this.sky.setDepth(0);

    this.sun = this.add.image(width * 0.78, height * 0.18, 'shootman-sun');
    this.sun.setDepth(1);
    this.sun.setAlpha(0.78);

    this.clouds = [0, 1, 2, 3].map((index) => {
      const cloud = this.add.image(0, 0, 'shootman-cloud');
      cloud.setDepth(1);
      cloud.setAlpha(0.92);
      cloud.setScale(2.4 + index * 0.28);
      return cloud;
    });

    this.stands = [0, 1, 2].map((index) => {
      const stand = this.add.image(0, 0, 'shootman-stand');
      stand.setDepth(2);
      stand.setAlpha(0.82 - index * 0.06);
      stand.setScale(6.0 + index * 0.8);
      return stand;
    });

    this.courtBackEdge = this.add.rectangle(width / 2, height * 0.61, width, 18, 0xfff1d2, 0.45);
    this.courtBackEdge.setDepth(3);

    this.courtSurface = this.add.tileSprite(0, height * 0.58, width, height * 0.42, 'shootman-court');
    this.courtSurface.setOrigin(0, 0);
    this.courtSurface.setDepth(4);
    this.courtSurface.setTileScale(3.5, 3.5);

    this.courtMarks = this.add.graphics();
    this.courtMarks.setDepth(5);

    this.courtLine = this.add.rectangle(width / 2, height - 126, width * 0.92, 4, 0xfff7d1, 1);
    this.courtLine.setDepth(6);

    this.courtCenterLine = this.add.rectangle(width / 2, height - 174, width * 0.82, 4, 0xfff0bc, 0.95);
    this.courtCenterLine.setDepth(6);

    this.playerShadow = this.add.ellipse(0, 0, 42, 10, 0x000000, 0.18);
    this.playerShadow.setDepth(6);

    this.playerSprite = this.add.image(0, 0, 'shootman-player-idle');
    this.playerSprite.setOrigin(0.5, 0.5);
    this.playerSprite.setDepth(8);
    this.playerSprite.setScale(3.25);

    this.ballShadow = this.add.ellipse(0, 0, 18, 6, 0x000000, 0.16);
    this.ballShadow.setDepth(7);

    this.ballSprite = this.add.image(0, 0, 'shootman-ball');
    this.ballSprite.setOrigin(0.5, 0.5);
    this.ballSprite.setDepth(9);
    this.ballSprite.setScale(2.6);

    this.hoopSprite = this.add.image(0, 0, 'shootman-hoop');
    this.hoopSprite.setOrigin(0.5, 0.5);
    this.hoopSprite.setDepth(10);
    this.hoopSprite.setScale(3.0);

    this.aimSprites = Array.from({ length: AIM_SPRITES }, () => {
      const aim = this.add.image(0, 0, 'shootman-sparkle');
      aim.setDepth(11);
      aim.setVisible(false);
      aim.setScale(0.65);
      return aim;
    });

    this.trailSprites = Array.from({ length: TRAIL_SPRITES }, () => {
      const trail = this.add.image(0, 0, 'shootman-sparkle');
      trail.setDepth(9);
      trail.setVisible(false);
      trail.setScale(0.38);
      trail.setTint(0xf3a52d);
      return trail;
    });
  }

  private installInput(): void {
    this.windowKeyDownHandler = (event) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        this.beginCharge(event.repeat);
        return;
      }

      if (event.code === 'KeyF' || event.key.toLowerCase() === 'f') {
        event.preventDefault();
        this.toggleFullscreen();
      }
    };

    this.windowKeyUpHandler = (event) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        this.releaseCharge();
      }
    };

    this.windowBlurHandler = () => {
      if (this.mode === 'CHARGING') {
        this.releaseCharge();
      }
    };

    window.addEventListener('keydown', this.windowKeyDownHandler, true);
    window.addEventListener('keyup', this.windowKeyUpHandler, true);
    window.addEventListener('blur', this.windowBlurHandler);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.windowKeyDownHandler) {
        window.removeEventListener('keydown', this.windowKeyDownHandler, true);
      }
      if (this.windowKeyUpHandler) {
        window.removeEventListener('keyup', this.windowKeyUpHandler, true);
      }
      if (this.windowBlurHandler) {
        window.removeEventListener('blur', this.windowBlurHandler);
      }
    });
  }

  private installResizeHook(): void {
    this.resizeHandler = (size) => {
      this.layoutWorld(size.width, size.height);
      if (size.width > 0 && size.height > 0 && this.mode !== 'SHOOTING') {
        this.startFreshRound(false);
      }
      this.renderWorld();
      this.refreshHud();
    };
    this.scale.on('resize', this.resizeHandler);
  }

  beginCharge(isRepeat = false): void {
    if (isRepeat || this.mode !== 'READY') {
      return;
    }
    this.mode = 'CHARGING';
    this.chargeElapsed = 0;
    this.chargeRatio = 0;
    this.ball = createBallAtHand(this.round);
    this.refreshHud();
  }

  releaseCharge(): void {
    if (this.mode !== 'CHARGING') {
      return;
    }
    this.fireShot();
  }

  private toggleFullscreen(): void {
    const element = this.game.canvas?.parentElement ?? document.documentElement;
    if (!document.fullscreenElement) {
      void element.requestFullscreen?.();
      return;
    }
    void document.exitFullscreen?.();
  }

  private fireShot(): void {
    this.chargeRatio = formatPowerRatio(this.chargeElapsed / CHARGE_DURATION);
    const power = lerp(this.round.minPower, this.round.maxPower, this.chargeRatio);
    const hand = getHandPoint(this.round);
    const vx = Math.cos(this.round.launchAngle) * power;
    const vy = Math.sin(this.round.launchAngle) * power;

    this.ball = {
      x: hand.x,
      y: hand.y,
      vx,
      vy,
      radius: BALL_RADIUS,
      active: true,
      elapsed: 0,
      trail: [{ x: hand.x, y: hand.y }],
    };
    this.mode = 'SHOOTING';
    this.stateTimer = 0;
    this.hasAwardedScore = false;
    this.refreshHud();
  }

  update(_time: number, delta: number): void {
    this.step(delta);
  }

  step(deltaMs: number): void {
    const delta = Math.max(0, deltaMs);

    if (this.mode === 'CHARGING') {
      this.chargeElapsed = Math.min(CHARGE_DURATION, this.chargeElapsed + delta);
      this.chargeRatio = formatPowerRatio(this.chargeElapsed / CHARGE_DURATION);
      this.ball = createBallAtHand(this.round);
    }

    if (this.mode === 'SHOOTING') {
      this.updateProjectile(delta);
    } else if (this.mode === 'SCORED' || this.mode === 'RESETTING') {
      this.stateTimer += delta;
      if (this.mode === 'SCORED' && this.stateTimer >= SCORED_DELAY) {
        this.mode = 'RESETTING';
        this.stateTimer = 0;
        this.renderWorld();
        this.refreshHud();
        this.startFreshRound(true);
        return;
      }
      if (this.mode === 'RESETTING' && this.stateTimer >= RESETTING_DELAY) {
        this.mode = 'READY';
        this.ball = createBallAtHand(this.round);
        this.renderWorld();
        this.refreshHud();
      }
    }

    this.renderWorld();
    this.refreshHud();
  }

  private updateProjectile(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const gravity = this.round.gravity;
    this.ball.elapsed += deltaMs;
    this.ball.vy += gravity * dt;
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
    this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
    if (this.ball.trail.length > TRAIL_LENGTH) {
      this.ball.trail.shift();
    }

    const size = getGameSize(this);
    const leftWall = this.ball.radius;
    const rightWall = size.width - this.ball.radius;
    if (this.ball.x <= leftWall && this.ball.vx < 0) {
      this.ball.x = leftWall;
      this.ball.vx = Math.abs(this.ball.vx);
      this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
    } else if (this.ball.x >= rightWall && this.ball.vx > 0) {
      this.ball.x = rightWall;
      this.ball.vx = -Math.abs(this.ball.vx);
      this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
    }
    if (this.ball.trail.length > TRAIL_LENGTH) {
      this.ball.trail.shift();
    }

    if (this.checkHit()) {
      this.handleScore();
      return;
    }

    const boundary = Math.max(size.width, size.height) * SCREEN_MARGIN_FACTOR + 120;
    const tooFar = this.ball.x < -boundary || this.ball.x > size.width + boundary || this.ball.y > size.height + boundary;
    const timeout = this.ball.elapsed > this.round.maxFlightTime * 1000;
    const groundHit = this.ball.y >= size.height - 14 && this.ball.vy > 120;

    if (tooFar || timeout || groundHit) {
      this.handleMiss();
    }
  }

  private checkHit(): boolean {
    const hoop = this.round.hoop;
    const hitRect = new Phaser.Geom.Rectangle(
      hoop.x - hoop.width * 0.5,
      hoop.y - hoop.height * 0.34,
      hoop.width,
      hoop.height * 0.72,
    );
    const point = new Phaser.Geom.Point(this.ball.x, this.ball.y);
    return Phaser.Geom.Rectangle.Contains(hitRect, point.x, point.y);
  }

  private handleScore(): void {
    if (this.hasAwardedScore) {
      return;
    }
    this.hasAwardedScore = true;
    this.score += 1;
    saveProgress(this.score);
    this.mode = 'SCORED';
    this.stateTimer = 0;
    this.ball.active = false;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.spawnScoreText();
    this.spawnSparkles();
    this.refreshHud();
  }

  private handleMiss(): void {
    this.mode = 'READY';
    this.chargeElapsed = 0;
    this.chargeRatio = 0;
    this.ball = createBallAtHand(this.round);
    this.refreshHud();
  }

  private startFreshRound(preserveMode = false): void {
    this.round = createRound(getGameSize(this), this.nextRoundId);
    this.nextRoundId += 1;
    this.chargeElapsed = 0;
    this.chargeRatio = 0;
    this.hasAwardedScore = false;
    this.ball = createBallAtHand(this.round);
    if (!preserveMode) {
      this.mode = 'READY';
      this.stateTimer = 0;
    }
  }

  restartProgress(): void {
    this.score = 0;
    saveProgress(this.score);
    this.nextRoundId = 1;
    this.mode = 'READY';
    this.stateTimer = 0;
    this.chargeElapsed = 0;
    this.chargeRatio = 0;
    this.hasAwardedScore = false;
    this.round = createRound(getGameSize(this), this.nextRoundId);
    this.nextRoundId += 1;
    this.ball = createBallAtHand(this.round);
    this.refreshHud();
    this.renderWorld();
  }

  private spawnScoreText(): void {
    const { x, y } = this.round.hoop;
    const text = this.add.text(x, y - 14, '甩锅 +1', {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '14px',
      fontStyle: '700',
      color: '#fff1b0',
      stroke: '#1d120c',
      strokeThickness: 4,
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(20);
    this.tweens.add({
      targets: text,
      y: y - 54,
      alpha: 0,
      duration: 720,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private spawnSparkles(): void {
    const sparkCount = 6;
    const baseX = this.round.hoop.x;
    const baseY = this.round.hoop.y - 8;
    for (let index = 0; index < sparkCount; index += 1) {
      const angle = (Math.PI * 2 * index) / sparkCount - Math.PI / 2;
      const distance = 18 + index * 5;
      const x = baseX + Math.cos(angle) * distance;
      const y = baseY + Math.sin(angle) * distance;
      const sparkle = this.add.image(x, y, 'shootman-sparkle');
      sparkle.setDepth(19);
      sparkle.setTint(0xffdf73);
      sparkle.setScale(0.6 + index * 0.08);
      this.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * 8,
        y: y + Math.sin(angle) * 8,
        alpha: 0,
        scale: sparkle.scale * 1.35,
        duration: 520,
        ease: 'Sine.easeOut',
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  private layoutWorld(width: number, height: number): void {
    this.sky.setPosition(width / 2, height / 2);
    this.sky.setSize(width, height);

    this.sun.setPosition(width * 0.78, height * 0.16);
    this.sun.setScale(Math.max(2.2, Math.min(width, height) / 220));

    const cloudYPositions = [0.12, 0.18, 0.08, 0.24];
    const cloudXPositions = [0.16, 0.44, 0.70, 0.84];
    this.clouds.forEach((cloud, index) => {
      cloud.setPosition(width * cloudXPositions[index], height * cloudYPositions[index]);
      cloud.setScale(Math.max(2.0, Math.min(width, height) / 260) * (1 + index * 0.08));
    });

    const standY = height * 0.31;
    this.stands.forEach((stand, index) => {
      stand.setPosition(width * (0.18 + index * 0.32), standY + index * 4);
      stand.setScale(Math.max(4.2, Math.min(width, height) / 150) * (1 - index * 0.08));
    });

    const courtHeight = clamp(height * 0.42, 190, 320);
    this.courtBackEdge.setPosition(width / 2, height - courtHeight - 8);
    this.courtBackEdge.setSize(width, 18);
    this.courtSurface.setPosition(0, height - courtHeight);
    this.courtSurface.setDisplaySize(width, courtHeight);
    this.courtSurface.setTileScale(Math.max(3.1, Math.min(width, height) / 240), Math.max(3.1, Math.min(width, height) / 240));
    this.courtMarks.clear();
    this.courtMarks.lineStyle(3, 0xfff6cf, 0.9);
    this.courtMarks.lineBetween(width * 0.08, height - courtHeight + 18, width * 0.92, height - courtHeight + 18);
    this.courtMarks.lineBetween(width * 0.06, height - 132, width * 0.94, height - 132);
    this.courtMarks.lineBetween(width * 0.5, height - courtHeight + 18, width * 0.5, height - 124);
    this.courtMarks.strokeCircle(width * 0.5, height - courtHeight * 0.5, Math.max(44, Math.min(width, height) * 0.09));
    this.courtMarks.strokeRect(width * 0.08, height - courtHeight + 28, width * 0.84, courtHeight - 60);
    this.courtLine.setPosition(width / 2, height - 126);
    this.courtLine.setSize(width * 0.92, 4);
    this.courtCenterLine.setPosition(width / 2, height - courtHeight * 0.48);
    this.courtCenterLine.setSize(width * 0.82, 4);
  }

  private updateActorSprites(): void {
    const size = getGameSize(this);
    const baseScale = Math.max(2.6, Math.min(size.width, size.height) / 220);
    const player = this.round.player;
    const hand = this.mode === 'SHOOTING' ? { x: this.ball.x, y: this.ball.y } : getHandPoint(this.round);

    const playerTexture =
      this.mode === 'CHARGING'
        ? 'shootman-player-charge'
        : this.mode === 'SHOOTING' || this.mode === 'SCORED' || this.mode === 'RESETTING'
          ? 'shootman-player-shoot'
          : 'shootman-player-idle';

    this.playerSprite.setTexture(playerTexture);
    this.playerSprite.setFlipX(!player.facingRight);
    this.playerSprite.setPosition(player.x, player.y + (this.mode === 'CHARGING' ? 1.5 : this.mode === 'SHOOTING' ? -1.5 : 0));
    this.playerSprite.setScale(baseScale * 1.05 + this.chargeRatio * 0.18);

    const shadowSpread = 36 + this.chargeRatio * 12;
    const shadowHeight = 9 + this.chargeRatio * 2;
    this.playerShadow.setPosition(player.x, player.y + 26 + this.chargeRatio * 2);
    this.playerShadow.setSize(shadowSpread, shadowHeight);
    this.playerShadow.setAlpha(0.18 + this.chargeRatio * 0.06);

    this.ballSprite.setVisible(this.mode !== 'CHARGING');
    this.ballSprite.setPosition(
      this.mode === 'SHOOTING' ? this.ball.x : hand.x,
      this.mode === 'SHOOTING' ? this.ball.y : hand.y,
    );
    this.ballSprite.setScale(baseScale * 0.8);

    this.ballShadow.setPosition(
      this.mode === 'SHOOTING' ? this.ball.x + 1 : hand.x,
      this.mode === 'SHOOTING' ? this.ball.y + 7 : hand.y + 6,
    );
    this.ballShadow.setSize(18 + this.chargeRatio * 6, 6 + this.chargeRatio * 2);
    this.ballShadow.setVisible(this.mode !== 'SCORED');

    this.hoopSprite.setPosition(this.round.hoop.x, this.round.hoop.y);
    this.hoopSprite.setScale(baseScale * 0.92);
    this.hoopSprite.setFlipX(false);
    this.hoopSprite.setAngle(this.mode === 'SCORED' ? Math.sin(this.stateTimer / 60) * 2 : 0);

    this.updateAimSprites(baseScale, hand);
    this.updateTrailSprites(baseScale);
  }

  private updateAimSprites(baseScale: number, start: Point): void {
    if (this.mode === 'SHOOTING') {
      this.aimSprites.forEach((sprite) => {
        sprite.setVisible(false);
      });
      return;
    }

    const angle = this.round.launchAngle;
    const length = 40;
    const endX = start.x + Math.cos(angle) * length;
    const endY = start.y + Math.sin(angle) * length;

    this.aimSprites.forEach((sprite, index) => {
      const t = (index + 1) / (this.aimSprites.length + 1);
      sprite.setVisible(true);
      sprite.setPosition(lerp(start.x, endX, t), lerp(start.y, endY, t));
      sprite.setScale(baseScale * (0.28 + index * 0.03));
      sprite.setAlpha(0.95 - index * 0.12);
      sprite.setTint(index % 2 === 0 ? 0xfff0a1 : 0xffcc58);
    });
  }

  private updateTrailSprites(baseScale: number): void {
    if (this.mode !== 'SHOOTING' || this.ball.trail.length === 0) {
      this.trailSprites.forEach((sprite) => {
        sprite.setVisible(false);
      });
      return;
    }

    const points = this.ball.trail.slice(-this.trailSprites.length);
    this.trailSprites.forEach((sprite, index) => {
      const point = points[index];
      if (!point) {
        sprite.setVisible(false);
        return;
      }
      const t = index / Math.max(1, points.length - 1);
      sprite.setVisible(true);
      sprite.setPosition(point.x, point.y);
      sprite.setScale(baseScale * (0.18 + t * 0.16));
      sprite.setAlpha(0.82 - t * 0.6);
      sprite.setTint(t < 0.5 ? 0xffe08a : 0xffb23d);
    });
  }

  private renderWorld(): void {
    const size = getGameSize(this);
    this.layoutWorld(size.width, size.height);
    this.updateActorSprites();
    this.syncTextHooks();
  }

  private refreshHud(): void {
    const hud = getHud();
    hud?.update({
      score: this.score,
      chargeRatio: this.mode === 'CHARGING' ? this.chargeRatio : 0,
      mode: this.mode,
      roundKind: this.round.kind,
    });
  }

  private syncTextHooks(): void {
    const state = this.renderToText();
    if (state !== this.lastRenderState) {
      this.lastRenderState = state;
    }
  }

  renderToText(): string {
    return JSON.stringify({
      origin: {
        x: 0,
        y: 0,
        xRight: true,
        yDown: true,
      },
      mode: this.mode,
      score: this.score,
      roundKind: this.round.kind,
      roundId: this.round.id,
      chargeRatio: this.mode === 'CHARGING' ? this.chargeRatio : 0,
      player: this.round.player,
      hoop: this.round.hoop,
      hand: this.mode === 'SHOOTING' ? this.round.hand : getHandPoint(this.round),
      ball: {
        x: this.mode === 'SHOOTING' ? this.ball.x : getHandPoint(this.round).x,
        y: this.mode === 'SHOOTING' ? this.ball.y : getHandPoint(this.round).y,
        vx: this.mode === 'SHOOTING' ? this.ball.vx : 0,
        vy: this.mode === 'SHOOTING' ? this.ball.vy : 0,
        active: this.mode === 'SHOOTING',
      },
      shot: {
        angle: this.round.launchAngle,
        solutionPower: this.round.solutionPower,
        minPower: this.round.minPower,
        maxPower: this.round.maxPower,
        gravity: this.round.gravity,
        targetTime: this.round.targetTime,
        maxFlightTime: this.round.maxFlightTime,
      },
    });
  }

  advanceTime(ms: number): void {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    const slice = ms / steps;
    for (let index = 0; index < steps; index += 1) {
      this.step(slice);
    }
  }
}
