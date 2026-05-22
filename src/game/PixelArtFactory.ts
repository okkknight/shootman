import Phaser from 'phaser';

const COLORS = {
  outline: '#1d120c',
  sky: '#79c8ff',
  sun: '#ffd76b',
  sunGlow: '#fff2bb',
  cloud: '#fff6ea',
  cloudShadow: '#f1d9bf',
  standDark: '#8a4e2a',
  standMid: '#b86b37',
  standLight: '#dc8d4b',
  courtBase: '#cc6e28',
  courtLight: '#f4a33b',
  courtDark: '#9a4a1e',
  courtLine: '#fff7d1',
  courtShadow: '#7b3817',
  hoopBoard: '#fff8ef',
  hoopBoardShadow: '#d9c8ab',
  rim: '#f08d16',
  rimDark: '#aa5407',
  net: '#f8f3e7',
  skin: '#f2c69c',
  skinShadow: '#d79b6a',
  hair: '#e23a25',
  hairDark: '#b01c15',
  hairLight: '#ff7460',
  band: '#efe7c2',
  shirt: '#ffffff',
  shirtDark: '#d6dadf',
  shirtAccent: '#d83f31',
  shorts: '#2e55c8',
  shortsDark: '#1d3380',
  shortsLight: '#6684ef',
  wrist: '#fff6ef',
  wristShadow: '#dcd0c2',
  shoe: '#7e431e',
  shoeDark: '#4f260f',
  ball: '#ef8a20',
  ballDark: '#b95c10',
  ballLine: '#6d2f05',
  star: '#ffdb66',
  standSeat: '#ffefb2',
} as const;

type DrawContext = CanvasRenderingContext2D;
type SpritePose = 'idle' | 'charge' | 'shoot';

function createTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: DrawContext) => void,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const texture = scene.textures.createCanvas(key, width, height);
  const ctx = texture.getContext() as DrawContext;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  draw(ctx);
  texture.refresh();
}

function px(ctx: DrawContext, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function frameRect(
  ctx: DrawContext,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline = COLORS.outline,
): void {
  px(ctx, x, y, w, h, outline);
  if (w > 2 && h > 2) {
    px(ctx, x + 1, y + 1, w - 2, h - 2, fill);
  }
}

function dotLine(
  ctx: DrawContext,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  if (steps <= 0) {
    px(ctx, Math.round(x0), Math.round(y0), 1, 1, color);
    return;
  }

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    px(ctx, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1, color);
  }
}

function drawSun(ctx: DrawContext): void {
  const map = [
    '...sssss....',
    '..sssssss...',
    '.sssSSSsss..',
    '.ssSSSSSss..',
    'sssSSYSSSss.',
    'ssSSYYYSSss.',
    'sssSSYSSSss.',
    '.ssSSSSSss..',
    '.sssSSSsss..',
    '..sssssss...',
    '...sssss....',
  ];
  drawMap(ctx, map, {
    s: COLORS.sunGlow,
    S: COLORS.sun,
    Y: '#fff7dd',
  });
}

function drawMap(ctx: DrawContext, map: readonly string[], palette: Record<string, string>): void {
  for (let y = 0; y < map.length; y += 1) {
    const row = map[y];
    for (let x = 0; x < row.length; x += 1) {
      const token = row[x];
      if (token === '.' || token === ' ') {
        continue;
      }
      const color = palette[token];
      if (color) {
        px(ctx, x, y, 1, 1, color);
      }
    }
  }
}

function drawCloud(ctx: DrawContext): void {
  const map = [
    '....wwww......',
    '..wwwwwwww....',
    '.wwwwwwwwwww..',
    '.wwwwwwwwwwww.',
    'wwwwwwwwwwwwww',
    'wwwWWWWWWWWwww',
    '.wwwWWWWWWwww.',
    '..wwwwwwwwww..',
  ];
  drawMap(ctx, map, {
    w: COLORS.cloud,
    W: COLORS.cloudShadow,
  });
}

function drawStand(ctx: DrawContext): void {
  const map = [
    '..rrrrrrrrrrrrrr..',
    '.rRRRRRRRRRRRRRRr.',
    'rRRYYYYYYYYYYYYYYRr',
    'rRYYyYyYyYyYyYyYRr',
    'rRYYyYyYyYyYyYyYRr',
    'rRRYYYYYYYYYYYYYYRr',
    '.rRRRRRRRRRRRRRRr.',
    '..kkkkkkkkkkkkkk..',
    '..kk..kk..kk..kk..',
    '....kk....kk....',
  ];
  drawMap(ctx, map, {
    r: COLORS.standDark,
    R: COLORS.standMid,
    Y: COLORS.standLight,
    y: COLORS.standSeat,
    k: COLORS.outline,
  });
}

function drawCourtTile(ctx: DrawContext): void {
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const checker = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
      const diag = (x + y) % 7 === 0 || (x - y + 16) % 7 === 0;
      let color = checker ? COLORS.courtLight : COLORS.courtBase;
      if (diag && y > 1) {
        color = COLORS.courtDark;
      }
      px(ctx, x, y, 1, 1, color);
    }
  }
  px(ctx, 0, 0, 16, 1, COLORS.courtLine);
  px(ctx, 0, 1, 16, 1, COLORS.courtLine);
  px(ctx, 1, 2, 14, 1, COLORS.courtShadow);
  px(ctx, 2, 13, 12, 1, COLORS.courtLine);
  px(ctx, 0, 14, 16, 1, COLORS.courtShadow);
}

function drawBall(ctx: DrawContext): void {
  const map = [
    '..oooo..',
    '.ooOOoo.',
    'ooOooOoo',
    'oOooOOOo',
    'oOooOOOo',
    'ooOooOoo',
    '.ooOOoo.',
    '..oooo..',
  ];
  drawMap(ctx, map, {
    o: COLORS.ball,
    O: COLORS.ballDark,
    R: COLORS.ballLine,
    l: COLORS.ballLine,
  });

  dotLine(ctx, 1, 2, 6, 5, COLORS.ballLine);
  dotLine(ctx, 1, 5, 6, 2, COLORS.ballLine);
  px(ctx, 5, 1, 1, 1, '#ffd79b');
  px(ctx, 4, 2, 1, 1, '#ffd79b');
}

function drawSparkle(ctx: DrawContext): void {
  const map = [
    '...y...',
    '..yYy..',
    '.yYYYy.',
    'yYYwYYy',
    '.yYYYy.',
    '..yYy..',
    '...y...',
  ];
  drawMap(ctx, map, {
    y: COLORS.star,
    Y: '#fff0a7',
    w: '#fff9df',
  });
}

function drawHoop(ctx: DrawContext): void {
  px(ctx, 7, 6, 4, 1, COLORS.outline);
  px(ctx, 8, 7, 5, 1, COLORS.outline);
  px(ctx, 12, 8, 2, 1, COLORS.outline);
  px(ctx, 13, 9, 1, 1, COLORS.outline);

  frameRect(ctx, 15, 2, 7, 10, COLORS.hoopBoard);
  px(ctx, 16, 4, 3, 3, '#ffd7cc');
  px(ctx, 17, 5, 1, 1, COLORS.hoopBoard);
  px(ctx, 15, 2, 1, 10, COLORS.outline);

  frameRect(ctx, 4, 8, 11, 4, COLORS.rim);
  px(ctx, 5, 9, 9, 1, COLORS.rimDark);
  px(ctx, 4, 9, 1, 1, COLORS.outline);
  px(ctx, 14, 9, 1, 1, COLORS.outline);

  dotLine(ctx, 6, 11, 8, 16, COLORS.net);
  dotLine(ctx, 8, 11, 10, 16, COLORS.net);
  dotLine(ctx, 10, 11, 12, 16, COLORS.net);
  px(ctx, 7, 13, 1, 1, COLORS.net);
  px(ctx, 9, 13, 1, 1, COLORS.net);
  px(ctx, 11, 13, 1, 1, COLORS.net);
  px(ctx, 8, 15, 2, 1, COLORS.hoopBoardShadow);
}

function drawPlayer(ctx: DrawContext, pose: SpritePose): void {
  const bodyTilt = pose === 'charge' ? -1 : pose === 'shoot' ? 1 : 0;
  const headLift = pose === 'charge' ? -1 : pose === 'shoot' ? 1 : 0;
  const armLift = pose === 'charge' ? -2 : pose === 'shoot' ? -4 : 0;
  const legSpread = pose === 'charge' ? 1 : pose === 'shoot' ? 0 : 0;

  // Shoes and feet.
  frameRect(ctx, 2 + bodyTilt, 24 + legSpread, 5, 3, COLORS.shoe);
  frameRect(ctx, 11 + bodyTilt, 24 + legSpread, 5, 3, COLORS.shoeDark);
  px(ctx, 3 + bodyTilt, 25 + legSpread, 3, 1, '#ac6a2a');
  px(ctx, 12 + bodyTilt, 25 + legSpread, 3, 1, '#6e3413');

  // Legs.
  frameRect(ctx, 4 + bodyTilt, 18 + legSpread, 4, 6, COLORS.shortsDark);
  frameRect(ctx, 10 + bodyTilt, 18 + legSpread, 4, 6, COLORS.shortsDark);
  px(ctx, 5 + bodyTilt, 20 + legSpread, 2, 3, COLORS.shorts);
  px(ctx, 11 + bodyTilt, 20 + legSpread, 2, 3, COLORS.shorts);
  px(ctx, 6 + bodyTilt, 18 + legSpread, 1, 1, COLORS.shortsLight);
  px(ctx, 12 + bodyTilt, 18 + legSpread, 1, 1, COLORS.shortsLight);

  // Torso.
  frameRect(ctx, 4 + bodyTilt, 10 + headLift, 10, 9, COLORS.shirt);
  px(ctx, 4 + bodyTilt, 10 + headLift, 10, 1, COLORS.shirtAccent);
  px(ctx, 5 + bodyTilt, 11 + headLift, 8, 1, COLORS.shirt);
  px(ctx, 5 + bodyTilt, 12 + headLift, 8, 5, COLORS.shirt);
  px(ctx, 7 + bodyTilt, 14 + headLift, 4, 1, COLORS.shirtAccent);
  px(ctx, 6 + bodyTilt, 12 + headLift, 1, 4, COLORS.shirtDark);
  px(ctx, 12 + bodyTilt, 12 + headLift, 1, 4, COLORS.shirtDark);
  px(ctx, 8 + bodyTilt, 13 + headLift, 2, 1, COLORS.shirtAccent);

  // Head and hair.
  frameRect(ctx, 6 + bodyTilt, 4 + headLift, 8, 7, COLORS.skin);
  px(ctx, 7 + bodyTilt, 2 + headLift, 1, 2, COLORS.hair);
  px(ctx, 9 + bodyTilt, 1 + headLift, 1, 3, COLORS.hairLight);
  px(ctx, 11 + bodyTilt, 2 + headLift, 1, 2, COLORS.hair);
  px(ctx, 6 + bodyTilt, 4 + headLift, 8, 1, COLORS.hairDark);
  px(ctx, 5 + bodyTilt, 5 + headLift, 2, 3, COLORS.hair);
  px(ctx, 13 + bodyTilt, 5 + headLift, 2, 3, COLORS.hair);
  px(ctx, 7 + bodyTilt, 5 + headLift, 6, 1, COLORS.hairLight);
  px(ctx, 7 + bodyTilt, 6 + headLift, 2, 1, COLORS.hairLight);
  px(ctx, 10 + bodyTilt, 6 + headLift, 2, 1, COLORS.hairLight);
  px(ctx, 6 + bodyTilt, 8 + headLift, 8, 1, COLORS.outline);
  px(ctx, 7 + bodyTilt, 7 + headLift, 1, 1, COLORS.outline);
  px(ctx, 11 + bodyTilt, 7 + headLift, 1, 1, COLORS.outline);
  px(ctx, 8 + bodyTilt, 9 + headLift, 2, 1, COLORS.outline);

  // Headband.
  px(ctx, 6 + bodyTilt, 8 + headLift, 8, 1, COLORS.band);
  px(ctx, 8 + bodyTilt, 8 + headLift, 2, 1, COLORS.hairDark);

  // Arms and hands.
  if (pose === 'idle') {
    frameRect(ctx, 1 + bodyTilt, 12 + armLift + headLift, 4, 3, COLORS.skin);
    px(ctx, 4 + bodyTilt, 13 + armLift + headLift, 1, 1, COLORS.skinShadow);
    frameRect(ctx, 13 + bodyTilt, 12 + armLift + headLift, 4, 3, COLORS.wrist);
    px(ctx, 14 + bodyTilt, 13 + armLift + headLift, 1, 1, COLORS.wristShadow);
  } else if (pose === 'charge') {
    frameRect(ctx, 0 + bodyTilt, 9 + armLift + headLift, 5, 3, COLORS.skin);
    px(ctx, 4 + bodyTilt, 10 + armLift + headLift, 1, 1, COLORS.skinShadow);
    frameRect(ctx, 12 + bodyTilt, 9 + armLift + headLift, 5, 4, COLORS.wrist);
    px(ctx, 13 + bodyTilt, 10 + armLift + headLift, 2, 1, COLORS.wristShadow);
  } else {
    frameRect(ctx, 1 + bodyTilt, 14 + armLift + headLift, 5, 3, COLORS.skin);
    px(ctx, 5 + bodyTilt, 15 + armLift + headLift, 1, 1, COLORS.skinShadow);
    frameRect(ctx, 12 + bodyTilt, 6 + armLift + headLift, 5, 4, COLORS.wrist);
    px(ctx, 13 + bodyTilt, 7 + armLift + headLift, 2, 1, COLORS.wristShadow);
  }
}

export function installPixelArtTextures(scene: Phaser.Scene): void {
  createTexture(scene, 'shootman-sun', 12, 11, drawSun);
  createTexture(scene, 'shootman-cloud', 14, 8, drawCloud);
  createTexture(scene, 'shootman-stand', 18, 10, drawStand);
  createTexture(scene, 'shootman-court', 16, 16, drawCourtTile);
  createTexture(scene, 'shootman-ball', 8, 8, drawBall);
  createTexture(scene, 'shootman-sparkle', 7, 7, drawSparkle);
  createTexture(scene, 'shootman-hoop', 24, 20, drawHoop);
  createTexture(scene, 'shootman-player-idle', 18, 28, (ctx) => drawPlayer(ctx, 'idle'));
  createTexture(scene, 'shootman-player-charge', 18, 28, (ctx) => drawPlayer(ctx, 'charge'));
  createTexture(scene, 'shootman-player-shoot', 18, 28, (ctx) => drawPlayer(ctx, 'shoot'));
}

export const PixelArtPalette = COLORS;
