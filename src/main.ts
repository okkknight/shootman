import Phaser from 'phaser';
import '@fontsource/press-start-2p';
import { GameScene } from './game/GameScene';
import { Hud } from './ui/Hud';
import './ui/Overlay.css';

const hudRoot = document.getElementById('hud');

if (!hudRoot) {
  throw new Error('HUD root not found');
}

const hud = new Hud(hudRoot);
window.__shootmanHud = hud;

const restartBtn = document.getElementById('restartBtn');
const chargeBtn = document.getElementById('chargeBtn');

const isTouchPreferred =
  window.matchMedia('(pointer: coarse)').matches ||
  window.matchMedia('(hover: none)').matches ||
  navigator.maxTouchPoints > 0;

document.documentElement.dataset.inputMode = isTouchPreferred ? 'touch' : 'keyboard';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#79c8ff',
  pixelArt: true,
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
    preserveDrawingBuffer: true,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game',
  },
  scene: [GameScene],
});

window.__shootmanGame = game;

if (restartBtn) {
  const handleRestart = () => {
    window.__shootmanScene?.restartProgress();
  };
  restartBtn.addEventListener('click', handleRestart);
  hud.attachRestartHandler(handleRestart);
}

if (chargeBtn) {
  const handlePointerDown = (event: PointerEvent) => {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement | null;
    window.__shootmanScene?.beginCharge();
    try {
      target?.setPointerCapture?.(event.pointerId);
    } catch {
      // Some synthetic or restricted pointer events do not allow capture.
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    event.preventDefault();
    window.__shootmanScene?.releaseCharge();
  };

  const handlePointerCancel = (event: PointerEvent) => {
    event.preventDefault();
    window.__shootmanScene?.releaseCharge();
  };

  chargeBtn.addEventListener('pointerdown', handlePointerDown);
  chargeBtn.addEventListener('pointerup', handlePointerUp);
  chargeBtn.addEventListener('pointercancel', handlePointerCancel);
  chargeBtn.addEventListener('lostpointercapture', handlePointerCancel as EventListener);
}

window.render_game_to_text = () => {
  if (window.__shootmanScene) {
    return window.__shootmanScene.renderToText();
  }
  return JSON.stringify({ mode: 'BOOT', score: 0, origin: { x: 0, y: 0, xRight: true, yDown: true } });
};

window.advanceTime = (ms: number) => {
  window.__shootmanScene?.advanceTime(ms);
};
