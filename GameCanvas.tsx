import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, DinoState, Obstacle, ObstacleType, Rect, Coin, UpgradeState } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CONFIG, DINO_CONFIG, ASSETS, THEMES, SKINS, COIN_CONFIG, UPGRADES } from './constants';
import { soundManager } from './audio';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dinoImgRef = useRef<HTMLImageElement | null>(null);

  // React state for UI
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  
  // Economy & Upgrades
  const [totalCoins, setTotalCoins] = useState(0);
  const [upgrades, setUpgrades] = useState<UpgradeState>({ jumpLevel: 0, speedLevel: 0, magnetLevel: 0 });

  // Menu Selection State
  const [selectedThemeId, setSelectedThemeId] = useState<string>('DESERT');
  const [selectedSkinId, setSelectedSkinId] = useState<string>('GREEN');

  // Refs for Game Loop Access to Selection
  const themeRef = useRef(THEMES['DESERT']);
  const skinRef = useRef(SKINS[0]);
  const upgradesRef = useRef(upgrades);

  // Sync refs when selection/upgrades change
  useEffect(() => {
    themeRef.current = THEMES[selectedThemeId];
    const skin = SKINS.find(s => s.id === selectedSkinId);
    if (skin) skinRef.current = skin;
    upgradesRef.current = upgrades;
  }, [selectedThemeId, selectedSkinId, upgrades]);

  // Mutable Game State (Performance optimization for 60fps loop)
  const gameData = useRef({
    speed: CONFIG.baseSpeed,
    frameCount: 0,
    obstacles: [] as Obstacle[],
    coins: [] as Coin[],
    runCoins: 0,
    dino: {
      x: DINO_CONFIG.x,
      y: CANVAS_HEIGHT - CONFIG.groundHeight - DINO_CONFIG.h,
      w: DINO_CONFIG.w,
      h: DINO_CONFIG.h,
      vx: 0,
      vy: 0,
      isJumping: false,
      isDucking: false,
      grounded: true,
      originalHeight: DINO_CONFIG.h,
      color: DINO_CONFIG.color,
      hasShield: false
    } as DinoState
  });

  // --- Logic Helpers ---

  const calculateUpgradeCost = (type: 'JUMP' | 'SPEED' | 'MAGNET', currentLevel: number) => {
    const config = UPGRADES[type];
    return Math.floor(config.baseCost * Math.pow(config.costMult, currentLevel));
  };

  const buyUpgrade = (type: 'JUMP' | 'SPEED' | 'MAGNET') => {
    const key = type === 'JUMP' ? 'jumpLevel' : type === 'SPEED' ? 'speedLevel' : 'magnetLevel';
    const currentLevel = upgrades[key];
    
    const cost = calculateUpgradeCost(type, currentLevel);
    if (totalCoins >= cost) {
      setTotalCoins(prev => prev - cost);
      setUpgrades(prev => ({
        ...prev,
        [key]: currentLevel + 1
      }));
    }
  };

  const spawnCoin = () => {
    const { speed, coins, obstacles } = gameData.current;
    
    // Check overlap with last obstacle
    const lastObs = obstacles[obstacles.length - 1];
    if (lastObs && lastObs.x > CANVAS_WIDTH - 150) return; // Too close to obstacle
    
    // Check overlap with last coin
    const lastCoin = coins[coins.length - 1];
    if (lastCoin && lastCoin.x > CANVAS_WIDTH - 50) return;

    if (Math.random() > COIN_CONFIG.spawnChance) return;

    // Determine type (Blue/Shield or Gold)
    const isBlue = Math.random() < COIN_CONFIG.blueSpawnChance;

    // Determine Y position (Ground or Jump Arc)
    const groundY = CANVAS_HEIGHT - CONFIG.groundHeight - COIN_CONFIG.h - 10;
    const airY = groundY - 120;
    const isAir = Math.random() > 0.5;

    coins.push({
      x: CANVAS_WIDTH,
      y: isAir ? airY : groundY,
      w: COIN_CONFIG.w,
      h: COIN_CONFIG.h,
      collected: false,
      val: isBlue ? 0 : 1, // Blue coins are powerups, no value? Or maybe bonus?
      type: isBlue ? 'BLUE' : 'GOLD',
      floatOffset: Math.random() * Math.PI * 2
    });
  };

  const spawnObstacle = (currentLevel: number) => {
    const { speed, obstacles } = gameData.current;
    
    // Minimum distance between obstacles based on speed
    const minGap = 200 + (speed * 10); 
    const lastObstacle = obstacles[obstacles.length - 1];

    if (lastObstacle && (CANVAS_WIDTH - lastObstacle.x) < minGap) {
      return;
    }

    // Spawn chance logic
    const spawnChance = 0.01 + (currentLevel * 0.001); 
    if (Math.random() > spawnChance && obstacles.length > 0) return;

    let type: ObstacleType = ObstacleType.CACTUS_SMALL;
    const rand = Math.random();

    // Probability distribution changes with level
    if (currentLevel > 2 && rand > 0.7) type = ObstacleType.BIRD;
    else if (currentLevel > 4 && rand > 0.9) type = ObstacleType.RIVER;
    else if (rand > 0.5) type = ObstacleType.CACTUS_LARGE;

    const theme = themeRef.current;
    const obsColor = theme.obstacleColors[type];

    let obs: Obstacle = {
      x: CANVAS_WIDTH,
      y: 0,
      w: 0,
      h: 0,
      vx: -speed,
      vy: 0,
      color: obsColor,
      type: type,
      passed: false
    };

    const groundY = CANVAS_HEIGHT - CONFIG.groundHeight;

    switch (type) {
      case ObstacleType.CACTUS_SMALL:
        obs.w = 20; obs.h = 40; obs.y = groundY - obs.h;
        break;
      case ObstacleType.CACTUS_LARGE:
        obs.w = 30; obs.h = 60; obs.y = groundY - obs.h;
        break;
      case ObstacleType.BIRD:
        obs.w = 40; obs.h = 30; obs.y = groundY - 80 - (Math.random() * 40);
        // Birds move faster than the ground
        obs.vx = -(speed + 2); 
        break;
      case ObstacleType.RIVER:
        obs.w = 120; obs.h = 20; obs.y = groundY;
        break;
    }
    
    gameData.current.obstacles.push(obs);
  };

  const checkCollision = (r1: Rect, r2: Rect): boolean => {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  };

  const resetGame = () => {
    // Resume context if suspended (browser requirement)
    soundManager.ensureContext();

    // Apply "Time Snail" upgrade (Run Slower)
    // Speed reduction uses exponential decay to handle infinite levels: 0.95^level
    const speedMult = Math.pow(1 - UPGRADES.SPEED.bonusPerLevel, upgradesRef.current.speedLevel);
    const startSpeed = CONFIG.baseSpeed * speedMult;

    gameData.current = {
      speed: startSpeed,
      frameCount: 0,
      obstacles: [],
      coins: [],
      runCoins: 0,
      dino: {
        x: DINO_CONFIG.x,
        y: CANVAS_HEIGHT - CONFIG.groundHeight - DINO_CONFIG.h,
        w: DINO_CONFIG.w,
        h: DINO_CONFIG.h,
        vx: 0,
        vy: 0,
        isJumping: false,
        isDucking: false,
        grounded: true,
        originalHeight: DINO_CONFIG.h,
        color: skinRef.current.color,
        hasShield: false
      }
    };
    scoreRef.current = 0;
    startTimeRef.current = Date.now();
    setScore(0);
    setLevel(1);
    setGameState(GameState.PLAYING);
  };

  // --- Main Loop ---

  const update = (time: number) => {
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // In START/GAME_OVER, we still draw the background to show the selected map preview
    if (gameState !== GameState.PLAYING) {
         draw();
         requestRef.current = requestAnimationFrame(update);
         return;
    }

    const currentPlayTime = (Date.now() - startTimeRef.current) / 1000;
    const currentLevel = Math.min(Math.floor(currentPlayTime / CONFIG.levelDuration) + 1, CONFIG.maxLevels);
    
    // Level Management
    if (currentLevel !== level) {
      setLevel(currentLevel);
      // Speed scales with level, but also respects the Upgrade multiplier
      // Using exponential decay for infinite scaling support
      const speedMult = Math.pow(1 - UPGRADES.SPEED.bonusPerLevel, upgradesRef.current.speedLevel);
      gameData.current.speed = (CONFIG.baseSpeed + (currentLevel * 0.5)) * speedMult;
    }

    const { dino } = gameData.current;

    // Physics: Gravity
    if (!dino.grounded) {
      dino.vy += CONFIG.gravity;
    }

    dino.y += dino.vy;

    // Ground Collision
    const groundLevel = CANVAS_HEIGHT - CONFIG.groundHeight;
    if (dino.y + dino.h >= groundLevel) {
      dino.y = groundLevel - dino.h;
      dino.vy = 0;
      dino.grounded = true;
      dino.isJumping = false;
    } else {
      dino.grounded = false;
    }

    // Update Entities
    spawnObstacle(currentLevel);
    spawnCoin();

    // Move Coins & Check Collection
    const magnetLevel = upgradesRef.current.magnetLevel;
    const magnetRadius = UPGRADES.MAGNET.baseRadius + (magnetLevel * UPGRADES.MAGNET.bonusPerLevel);

    for (let i = gameData.current.coins.length - 1; i >= 0; i--) {
      const coin = gameData.current.coins[i];
      
      // Magnet Logic
      if (magnetLevel > 0 && !coin.collected) {
         const dinoCenter = { x: dino.x + dino.w/2, y: dino.y + dino.h/2 };
         const coinCenter = { x: coin.x + coin.w/2, y: coin.y + coin.h/2 };
         const dist = Math.hypot(dinoCenter.x - coinCenter.x, dinoCenter.y - coinCenter.y);
         
         if (dist < magnetRadius) {
             // Move coin towards dino (simple ease in)
             coin.x += (dinoCenter.x - coinCenter.x) * 0.15;
             coin.y += (dinoCenter.y - coinCenter.y) * 0.15;
         }
      }

      // Standard Movement
      coin.x -= gameData.current.speed;
      
      // Animate Float
      coin.floatOffset += 0.1;

      // Collection
      const dinoHitbox = { x: dino.x, y: dino.y, w: dino.w, h: dino.h };
      if (!coin.collected && checkCollision(dinoHitbox, coin)) {
         coin.collected = true;
         
         if (coin.type === 'BLUE') {
            dino.hasShield = true;
            soundManager.playCoin(); // Using coin sound for now, it's positive feedback
         } else {
            gameData.current.runCoins += 1;
            setTotalCoins(prev => prev + 1); // Realtime update for UI
            soundManager.playCoin();
         }
         
         gameData.current.coins.splice(i, 1);
         continue;
      }

      if (coin.x + coin.w < 0) {
        gameData.current.coins.splice(i, 1);
      }
    }

    // Move Obstacles
    for (let i = gameData.current.obstacles.length - 1; i >= 0; i--) {
      const obs = gameData.current.obstacles[i];
      obs.x += obs.vx;

      // Collision Detection
      const dinoHitbox = {
        x: dino.x + 5,
        y: dino.y + 5,
        w: dino.w - 10,
        h: dino.h - 10
      };
      
      const obsHitbox = {
        x: obs.x + 2,
        y: obs.y + 2,
        w: obs.w - 4,
        h: obs.h - 4
      };

      if (checkCollision(dinoHitbox, obsHitbox)) {
        if (dino.hasShield) {
            // Use shield
            dino.hasShield = false;
            soundManager.playShieldBreak();
            // Remove obstacle so it doesn't hit again
            gameData.current.obstacles.splice(i, 1);
        } else {
            soundManager.playGameOver();
            setGameState(GameState.GAME_OVER);
            if (scoreRef.current > highScore) setHighScore(Math.floor(scoreRef.current));
        }
      }

      // Cleanup off-screen
      if (obs.x + obs.w < 0) {
        gameData.current.obstacles.splice(i, 1);
        scoreRef.current += 10;
        setScore(Math.floor(scoreRef.current));
      }
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = themeRef.current;
    const skin = skinRef.current;

    // Clear Screen
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Sky
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, theme.sky[0]);
    grad.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Ground
    ctx.fillStyle = theme.ground;
    ctx.fillRect(0, CANVAS_HEIGHT - CONFIG.groundHeight, CANVAS_WIDTH, CONFIG.groundHeight);
    
    // Draw Ground Detail (Stripes)
    ctx.fillStyle = theme.groundDetail;
    const offset = (Date.now() / 2 * (gameData.current.speed / 5)) % 40;
    for(let i=0; i<CANVAS_WIDTH/40 + 1; i++) {
        ctx.fillRect((i * 40) - offset, CANVAS_HEIGHT - CONFIG.groundHeight, 10, 5);
    }

    // Draw Coins
    gameData.current.coins.forEach(coin => {
       const bobY = Math.sin(coin.floatOffset) * 5;
       const isBlue = coin.type === 'BLUE';
       
       ctx.fillStyle = isBlue ? COIN_CONFIG.blueColor : COIN_CONFIG.color;
       
       // Draw coin circle
       ctx.beginPath();
       ctx.arc(coin.x + coin.w/2, coin.y + coin.h/2 + bobY, coin.w/2, 0, Math.PI * 2);
       ctx.fill();
       
       ctx.strokeStyle = isBlue ? '#2563EB' : '#B45309';
       ctx.lineWidth = 2;
       ctx.stroke();

       // Shine
       ctx.fillStyle = 'rgba(255,255,255,0.6)';
       ctx.beginPath();
       ctx.arc(coin.x + coin.w/2 - 4, coin.y + coin.h/2 + bobY - 4, 3, 0, Math.PI * 2);
       ctx.fill();
    });

    // Draw Obstacles
    gameData.current.obstacles.forEach(obs => {
      ctx.fillStyle = obs.color;
      
      if (obs.type === ObstacleType.RIVER) {
        // Draw River water
        ctx.fillStyle = theme.obstacleColors.RIVER;
        ctx.fillRect(obs.x, CANVAS_HEIGHT - CONFIG.groundHeight + 5, obs.w, CONFIG.groundHeight - 5);
        // Shimmer
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(obs.x + 10, CANVAS_HEIGHT - CONFIG.groundHeight + 10, obs.w - 20, 5);
      } else if (obs.type === ObstacleType.BIRD) {
         // Bird
         ctx.beginPath();
         ctx.moveTo(obs.x, obs.y + obs.h/2);
         ctx.lineTo(obs.x + obs.w/2, obs.y);
         ctx.lineTo(obs.x + obs.w, obs.y + obs.h/2);
         ctx.lineTo(obs.x + obs.w/2, obs.y + obs.h);
         ctx.fill();
         // Wing
         ctx.fillStyle = 'rgba(0,0,0,0.2)';
         if (Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.fillRect(obs.x + 10, obs.y - 10, 10, 20);
         } else {
            ctx.fillRect(obs.x + 10, obs.y + 10, 10, 20);
         }
      } else {
        // Cactus / Rock
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      }
    });

    // Draw Dino
    const { dino } = gameData.current;
    
    // Draw Shield Effect
    if (dino.hasShield) {
        ctx.save();
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#60A5FA';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        const radius = Math.max(dino.w, dino.h) / 2 + 15;
        ctx.arc(dino.x + dino.w/2, dino.y + dino.h/2, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.fill();
        ctx.restore();
    }
    
    // If skin uses image and image is loaded, use it
    if (skin.useImage && dinoImgRef.current && dinoImgRef.current.complete && dinoImgRef.current.naturalWidth > 0) {
        ctx.drawImage(dinoImgRef.current, dino.x, dino.y, dino.w, dino.h);
    } else {
        // Draw skin color rect
        ctx.fillStyle = skin.color;
        ctx.fillRect(dino.x, dino.y, dino.w, dino.h);
        // Eye
        ctx.fillStyle = 'white';
        ctx.fillRect(dino.x + dino.w - 15, dino.y + 10, 10, 10);
        ctx.fillStyle = 'black';
        ctx.fillRect(dino.x + dino.w - 10, dino.y + 12, 4, 4);
    }
  };

  // --- Input Handling ---

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== GameState.PLAYING) {
        if ((e.code === 'Enter') && (gameState === GameState.START || gameState === GameState.GAME_OVER)) {
            resetGame();
        }
        return;
    }

    const { dino } = gameData.current;

    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
        if (dino.grounded) {
          // Apply "Moon Boots" upgrade (High Jump)
          // Jump Force increases (becomes more negative): base * (1 + 0.08 * level)
          const jumpMult = 1 + (upgradesRef.current.jumpLevel * UPGRADES.JUMP.bonusPerLevel);
          dino.vy = CONFIG.jumpForce * jumpMult;
          
          dino.grounded = false;
          dino.isJumping = true;
          soundManager.playJump();
        }
        break;
      case 'ArrowDown':
        if (!dino.isDucking) {
          dino.isDucking = true;
          dino.h = DINO_CONFIG.duckH;
          dino.y += (DINO_CONFIG.h - DINO_CONFIG.duckH); // Push down to ground
        }
        break;
    }
  }, [gameState]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const { dino } = gameData.current;
    if (e.code === 'ArrowDown' && dino.isDucking) {
      dino.isDucking = false;
      dino.y -= (DINO_CONFIG.h - DINO_CONFIG.duckH); // Pop back up
      dino.h = DINO_CONFIG.h;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Load Asset
    const img = new Image();
    img.src = ASSETS.dino;
    dinoImgRef.current = img;

    requestRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleKeyDown, handleKeyUp]); 

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-gray-800">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block bg-gray-900"
      />
      
      {/* UI Overlay */}
      {gameState === GameState.PLAYING && (
        <div className="absolute top-4 right-4 flex flex-col items-end pointer-events-none">
            <div className="text-xl font-bold text-gray-800 bg-white/80 p-2 rounded mb-2">
            Score: {score.toString().padStart(5, '0')}
            </div>
            <div className="text-sm font-bold text-gray-700 bg-white/80 p-1 rounded mb-2">
            Level: {level}
            </div>
            <div className="flex gap-2">
                {gameData.current.dino.hasShield && (
                    <div className="text-sm font-bold text-blue-700 bg-blue-100 p-1 rounded border border-blue-500 animate-pulse">
                        🛡️ SHIELD
                    </div>
                )}
                <div className="text-sm font-bold text-yellow-700 bg-yellow-100 p-1 rounded border border-yellow-500">
                 💰 {gameData.current.runCoins}
                </div>
            </div>
        </div>
      )}

      {gameState === GameState.START && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="flex justify-between w-full max-w-2xl items-center mb-4">
            <h1 className="text-3xl text-green-400 font-bold text-shadow">DINO DASH</h1>
            <div className="text-yellow-400 font-bold text-xl border-2 border-yellow-500 px-3 py-1 rounded bg-black/50">
                💰 {totalCoins}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 w-full max-w-4xl">
              {/* Left Column: Settings */}
              <div className="space-y-6">
                {/* Map Selection */}
                <div>
                    <h3 className="text-white mb-2 font-bold text-xs uppercase tracking-wider border-b border-gray-700 pb-1">Select Map</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.values(THEMES).map(theme => (
                            <button
                                key={theme.id}
                                onClick={() => setSelectedThemeId(theme.id)}
                                className={`p-2 text-xs font-bold rounded border-2 transition-all ${
                                    selectedThemeId === theme.id 
                                    ? 'border-green-400 bg-green-900/50 text-white' 
                                    : 'border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                {theme.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Skin Selection */}
                <div>
                    <h3 className="text-white mb-2 font-bold text-xs uppercase tracking-wider border-b border-gray-700 pb-1">Select Skin</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {SKINS.map(skin => (
                            <button
                                key={skin.id}
                                onClick={() => setSelectedSkinId(skin.id)}
                                className={`w-10 h-10 rounded border-2 transition-all relative ${
                                    selectedSkinId === skin.id 
                                    ? 'border-white scale-110 shadow-[0_0_10px_white]' 
                                    : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'
                                }`}
                                style={{ backgroundColor: skin.color }}
                                title={skin.name}
                            >
                                {selectedSkinId === skin.id && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
              </div>

              {/* Right Column: Upgrades Shop */}
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <h3 className="text-yellow-400 mb-4 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                     <span>🛠️ Shop</span>
                  </h3>
                  
                  <div className="space-y-4">
                      {/* Jump Upgrade */}
                      <div className="flex items-center justify-between bg-gray-900 p-3 rounded border border-gray-700">
                          <div>
                              <div className="text-white font-bold text-sm">{UPGRADES.JUMP.name}</div>
                              <div className="text-xs text-gray-400">{UPGRADES.JUMP.description}</div>
                              <div className="text-xs text-green-400 mt-1">Lvl {upgrades.jumpLevel}</div>
                          </div>
                          <button
                            onClick={() => buyUpgrade('JUMP')}
                            disabled={totalCoins < calculateUpgradeCost('JUMP', upgrades.jumpLevel)}
                            className={`px-3 py-2 rounded text-xs font-bold transition-all flex flex-col items-center min-w-[80px] ${
                                totalCoins >= calculateUpgradeCost('JUMP', upgrades.jumpLevel)
                                    ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg'
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                            }`}
                          >
                                  <>
                                    <span>BUY</span>
                                    <span className="flex items-center gap-1">💰 {calculateUpgradeCost('JUMP', upgrades.jumpLevel)}</span>
                                  </>
                          </button>
                      </div>

                      {/* Speed Upgrade */}
                      <div className="flex items-center justify-between bg-gray-900 p-3 rounded border border-gray-700">
                          <div>
                              <div className="text-white font-bold text-sm">{UPGRADES.SPEED.name}</div>
                              <div className="text-xs text-gray-400">{UPGRADES.SPEED.description}</div>
                              <div className="text-xs text-green-400 mt-1">Lvl {upgrades.speedLevel}</div>
                          </div>
                          <button
                            onClick={() => buyUpgrade('SPEED')}
                            disabled={totalCoins < calculateUpgradeCost('SPEED', upgrades.speedLevel)}
                            className={`px-3 py-2 rounded text-xs font-bold transition-all flex flex-col items-center min-w-[80px] ${
                                totalCoins >= calculateUpgradeCost('SPEED', upgrades.speedLevel)
                                    ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg'
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                            }`}
                          >
                                  <>
                                    <span>BUY</span>
                                    <span className="flex items-center gap-1">💰 {calculateUpgradeCost('SPEED', upgrades.speedLevel)}</span>
                                  </>
                          </button>
                      </div>

                      {/* Magnet Upgrade */}
                      <div className="flex items-center justify-between bg-gray-900 p-3 rounded border border-gray-700">
                          <div>
                              <div className="text-white font-bold text-sm">{UPGRADES.MAGNET.name}</div>
                              <div className="text-xs text-gray-400">{UPGRADES.MAGNET.description}</div>
                              <div className="text-xs text-green-400 mt-1">Lvl {upgrades.magnetLevel}</div>
                          </div>
                          <button
                            onClick={() => buyUpgrade('MAGNET')}
                            disabled={totalCoins < calculateUpgradeCost('MAGNET', upgrades.magnetLevel)}
                            className={`px-3 py-2 rounded text-xs font-bold transition-all flex flex-col items-center min-w-[80px] ${
                                totalCoins >= calculateUpgradeCost('MAGNET', upgrades.magnetLevel)
                                    ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg'
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                            }`}
                          >
                                  <>
                                    <span>BUY</span>
                                    <span className="flex items-center gap-1">💰 {calculateUpgradeCost('MAGNET', upgrades.magnetLevel)}</span>
                                  </>
                          </button>
                      </div>
                  </div>
              </div>
          </div>

          <button 
                onClick={resetGame}
                className="w-full max-w-md px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-[0_4px_0_rgb(20,83,45)] active:shadow-[0_0px_0_rgb(20,83,45)] active:translate-y-[4px] transition-all text-xl"
            >
              START RUN
            </button>
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 backdrop-blur-sm">
          <div className="text-center text-white p-8 border-4 border-red-500 bg-gray-900 rounded-lg shadow-2xl max-w-sm w-full">
            <h2 className="text-4xl mb-4 text-red-500 font-bold">GAME OVER</h2>
            <div className="bg-gray-800 p-4 rounded mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs uppercase">Score</span>
                    <span className="text-2xl font-mono text-white">{score}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs uppercase">Coins</span>
                    <span className="text-xl font-mono text-yellow-400">+ {gameData.current.runCoins}</span>
                </div>
                {score >= highScore && score > 0 && (
                    <p className="text-yellow-400 text-xs mt-4 font-bold animate-bounce">NEW HIGH SCORE!</p>
                )}
            </div>
            
            <button 
                onClick={resetGame}
                className="w-full px-6 py-3 bg-white text-red-900 font-bold rounded hover:bg-gray-200 shadow-[0_4px_0_rgb(153,27,27)] active:shadow-[0_0px_0_rgb(153,27,27)] active:translate-y-[4px] transition-all"
            >
              TRY AGAIN
            </button>
            <button 
                onClick={() => setGameState(GameState.START)}
                className="mt-4 text-sm text-gray-400 hover:text-white underline"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
