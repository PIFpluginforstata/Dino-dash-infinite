export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum ObstacleType {
  CACTUS_SMALL = 'CACTUS_SMALL',
  CACTUS_LARGE = 'CACTUS_LARGE',
  BIRD = 'BIRD',
  RIVER = 'RIVER'
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Entity extends Rect {
  vx: number;
  vy: number;
  color: string;
}

export interface DinoState extends Entity {
  isJumping: boolean;
  isDucking: boolean;
  grounded: boolean;
  originalHeight: number;
  hasShield: boolean;
}

export interface Obstacle extends Entity {
  type: ObstacleType;
  passed: boolean;
}

export interface Coin extends Rect {
  collected: boolean;
  val: number;
  floatOffset: number; // For animation
  type: 'GOLD' | 'BLUE';
}

export interface UpgradeState {
  jumpLevel: number;
  speedLevel: number;
  magnetLevel: number;
}

export interface GameConfig {
  gravity: number;
  baseSpeed: number;
  jumpForce: number;
  groundHeight: number;
  levelDuration: number; // Seconds per level
  maxLevels: number;
}

export interface Theme {
  id: string;
  name: string;
  sky: string[]; // Gradient colors [top, bottom]
  ground: string;
  groundDetail: string;
  obstacleColors: {
    [key in ObstacleType]: string;
  };
  textColor: string; // For UI contrast
}

export interface Skin {
  id: string;
  name: string;
  color: string;
  useImage: boolean;
}