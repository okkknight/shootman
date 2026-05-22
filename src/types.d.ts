import type { GameScene } from './game/GameScene';
import type { Hud } from './ui/Hud';

declare global {
  interface Window {
    __shootmanScene?: GameScene;
    __shootmanHud?: Hud;
    __shootmanGame?: import('phaser').Game;
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

export {};
