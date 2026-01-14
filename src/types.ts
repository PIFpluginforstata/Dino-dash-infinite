export interface KeyBindings {
  left: string;
  right: string;
  jump: string;
  attack: string;
  block: string;
  special: string;
}

export interface PlayerConfig {
  name: string;
  color: string;
  keys: KeyBindings;
}

export interface Fighter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  facing: 1 | -1;
  state: FighterState;
  stateTimer: number;
  isGrounded: boolean;
  isBlocking: boolean;
  comboCount: number;
}

export type FighterState =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'attack'
  | 'special'
  | 'block'
  | 'hit'
  | 'ko';

export type GameScreen = 'start' | 'config' | 'game' | 'result';

export interface GameState {
  player1: Fighter;
  player2: Fighter;
  timeLeft: number;
  isPaused: boolean;
  winner: 1 | 2 | 'draw' | null;
}

export const DEFAULT_P1_KEYS: KeyBindings = {
  left: 'a',
  right: 'd',
  jump: 'w',
  attack: 'f',
  block: 'g',
  special: 'h',
};

export const DEFAULT_P2_KEYS: KeyBindings = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  jump: 'ArrowUp',
  attack: 'j',
  block: 'k',
  special: 'l',
};
