import type { GameMode } from '../game/types';
import { getSlapbackTitle, isLegendaryRank } from './RankTitles';

export interface HudState {
  score: number;
  chargeRatio: number;
  mode: GameMode;
  roundKind: 'NORMAL' | 'BOUNCE';
}

export interface HudStorageState {
  score: number;
}

export class Hud {
  private readonly root: HTMLElement;
  private readonly scoreEl: HTMLElement;
  private readonly scoreTitleEl: HTMLElement;
  private readonly scoreValueEl: HTMLElement;
  private readonly powerFillEl: HTMLElement;
  private legendaryFlashTimeout: number | null = null;
  private wasLegendary = false;
  private restartHandler?: () => void;

  constructor(root: HTMLElement) {
    const scoreEl = root.querySelector<HTMLElement>('#score');
    const scoreTitleEl = root.querySelector<HTMLElement>('#scoreTitle');
    const scoreValueEl = root.querySelector<HTMLElement>('#scoreValue');
    const powerFillEl = root.querySelector<HTMLElement>('#powerFill');

    if (!scoreEl || !scoreTitleEl || !scoreValueEl || !powerFillEl) {
      throw new Error('HUD elements were not found.');
    }

    this.root = root;
    this.scoreEl = scoreEl;
    this.scoreTitleEl = scoreTitleEl;
    this.scoreValueEl = scoreValueEl;
    this.powerFillEl = powerFillEl;
  }

  attachRestartHandler(handler: () => void): void {
    this.restartHandler = handler;
  }

  primeLegendaryState(score: number): void {
    this.wasLegendary = isLegendaryRank(score);
  }

  update(state: HudState): void {
    const isLegendary = isLegendaryRank(state.score);
    this.root.dataset.mode = state.mode;
    this.root.classList.remove('mode-ready', 'mode-charging', 'mode-shooting', 'mode-scored', 'mode-resetting');
    this.root.classList.add(`mode-${state.mode.toLowerCase()}`);
    this.scoreTitleEl.textContent = getSlapbackTitle(state.score);
    this.scoreValueEl.textContent = `${Math.max(0, Math.floor(state.score))}`;
    this.scoreEl.classList.toggle('hud-score--legendary', isLegendary);
    if (isLegendary && !this.wasLegendary) {
      this.playLegendaryFlash();
    }
    this.wasLegendary = isLegendary;
    const pct = Math.max(0, Math.min(100, Math.round(state.chargeRatio * 100)));
    this.powerFillEl.style.width = `${pct}%`;
  }

  triggerRestart(): void {
    this.restartHandler?.();
  }

  private playLegendaryFlash(): void {
    if (this.legendaryFlashTimeout !== null) {
      window.clearTimeout(this.legendaryFlashTimeout);
      this.legendaryFlashTimeout = null;
    }

    this.scoreEl.classList.remove('hud-score--legendary-flash');
    void this.scoreEl.offsetWidth;
    this.scoreEl.classList.add('hud-score--legendary-flash');
    this.legendaryFlashTimeout = window.setTimeout(() => {
      this.scoreEl.classList.remove('hud-score--legendary-flash');
      this.legendaryFlashTimeout = null;
    }, 840);
  }
}
