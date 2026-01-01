import { GameConfig, ObstacleType, Theme, Skin } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 400;

export const CONFIG: GameConfig = {
  gravity: 0.8,
  baseSpeed: 9,
  jumpForce: -11.5,
  groundHeight: 50,
  levelDuration: 15,
  maxLevels: 80
};

export const DINO_CONFIG = {
  w: 44,
  h: 47,
  duckH: 25,
  x: 50,
  color: '#4ADE80'
};

export const COIN_CONFIG = {
  w: 24,
  h: 24,
  color: '#FBBF24', // Gold
  blueColor: '#3B82F6', // Blue for Shield
  spawnChance: 0.02,
  blueSpawnChance: 0.05 // 5% chance when a coin spawns to be blue
};

export const UPGRADES = {
  JUMP: {
    id: 'JUMP',
    name: 'Moon Boots',
    description: 'Jump Higher',
    baseCost: 10,
    costMult: 1.5,
    bonusPerLevel: 0.08 // 8% higher jump per level
  },
  SPEED: {
    id: 'SPEED',
    name: 'Time Snail',
    description: 'Run Slower',
    baseCost: 10,
    costMult: 1.5,
    bonusPerLevel: 0.05 // 5% slower speed per level
  },
  MAGNET: {
    id: 'MAGNET',
    name: 'Magnetic Skin',
    description: 'Attract Coins',
    baseCost: 20,
    costMult: 1.6,
    baseRadius: 100, // Starting pixel radius
    bonusPerLevel: 40 // Radius increase per level
  }
};

export const ASSETS = {
  dino: 'https://file.rendit.io/n/u6Y1N6s02z1a9mX0q3c8.png'
};

export const THEMES: Record<string, Theme> = {
  DESERT: {
    id: 'DESERT',
    name: 'Desert',
    sky: ['#87CEEB', '#E0F2FE'],
    ground: '#D97706',
    groundDetail: '#B45309',
    obstacleColors: {
      [ObstacleType.CACTUS_SMALL]: '#166534',
      [ObstacleType.CACTUS_LARGE]: '#14532D',
      [ObstacleType.BIRD]: '#DC2626',
      [ObstacleType.RIVER]: '#3B82F6'
    },
    textColor: 'text-gray-800'
  },
  JUNGLE: {
    id: 'JUNGLE',
    name: 'Deep Jungle',
    sky: ['#064E3B', '#34D399'],
    ground: '#365314',
    groundDetail: '#14532D',
    obstacleColors: {
      [ObstacleType.CACTUS_SMALL]: '#831843', // Exotic plants
      [ObstacleType.CACTUS_LARGE]: '#831843',
      [ObstacleType.BIRD]: '#FCD34D', // Bright birds
      [ObstacleType.RIVER]: '#0EA5E9'
    },
    textColor: 'text-white'
  },
  NEON: {
    id: 'NEON',
    name: 'Neon City',
    sky: ['#111827', '#4C1D95'],
    ground: '#1F2937',
    groundDetail: '#EC4899', // Pink grid lines
    obstacleColors: {
      [ObstacleType.CACTUS_SMALL]: '#34D399', // Neon Green
      [ObstacleType.CACTUS_LARGE]: '#34D399',
      [ObstacleType.BIRD]: '#F472B6', // Neon Pink
      [ObstacleType.RIVER]: '#60A5FA'
    },
    textColor: 'text-white'
  },
  VOLCANO: {
    id: 'VOLCANO',
    name: 'Volcano',
    sky: ['#450A0A', '#F87171'],
    ground: '#27272A',
    groundDetail: '#EF4444', // Lava cracks
    obstacleColors: {
      [ObstacleType.CACTUS_SMALL]: '#7F1D1D', // Dark rocks
      [ObstacleType.CACTUS_LARGE]: '#7F1D1D',
      [ObstacleType.BIRD]: '#F97316', // Fire birds
      [ObstacleType.RIVER]: '#EA580C' // Lava river
    },
    textColor: 'text-white'
  }
};

export const SKINS: Skin[] = [
  { id: 'GREEN', name: 'Classic', color: '#4ADE80', useImage: true },
  { id: 'RED', name: 'Red Rex', color: '#EF4444', useImage: false },
  { id: 'BLUE', name: 'Cyber', color: '#06B6D4', useImage: false },
  { id: 'GOLD', name: 'Golden', color: '#FBBF24', useImage: false },
  { id: 'DARK', name: 'Shadow', color: '#111827', useImage: false },
];