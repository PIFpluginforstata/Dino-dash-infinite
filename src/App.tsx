import { useState, useEffect, useCallback, useRef } from 'react';
import {
  KeyBindings,
  Fighter,
  GameScreen,
  DEFAULT_P1_KEYS,
  DEFAULT_P2_KEYS,
} from './types';
import {
  ARENA_WIDTH,
  GROUND_Y,
  FIGHTER_WIDTH,
  FIGHTER_HEIGHT,
  MOVE_SPEED,
  JUMP_FORCE,
  GRAVITY,
  ATTACK_DAMAGE,
  SPECIAL_DAMAGE,
  ATTACK_RANGE,
  SPECIAL_RANGE,
  ATTACK_DURATION,
  SPECIAL_DURATION,
  HIT_STUN,
  BLOCK_REDUCTION,
  MAX_ENERGY,
  ENERGY_REGEN,
  SPECIAL_COST,
  ROUND_TIME,
  MAX_HEALTH,
} from './constants';

// Create initial fighter state
const createFighter = (x: number, facing: 1 | -1): Fighter => ({
  x,
  y: GROUND_Y - FIGHTER_HEIGHT,
  vx: 0,
  vy: 0,
  health: MAX_HEALTH,
  maxHealth: MAX_HEALTH,
  energy: 0,
  maxEnergy: MAX_ENERGY,
  facing,
  state: 'idle',
  stateTimer: 0,
  isGrounded: true,
  isBlocking: false,
  comboCount: 0,
});

// Start Screen Component
function StartScreen({ onStart, onConfig }: { onStart: () => void; onConfig: () => void }) {
  return (
    <div className="start-screen container">
      <h1 className="title">FIGHTING ARENA</h1>
      <p className="subtitle">2 Player Local Battle</p>
      <div>
        <button className="btn btn-primary" onClick={onStart}>
          START GAME
        </button>
      </div>
      <div>
        <button className="btn btn-secondary" onClick={onConfig}>
          CONFIGURE KEYS
        </button>
      </div>
      <div className="controls-info">
        <p>Player 1: WASD + F(Attack) G(Block) H(Special)</p>
        <p>Player 2: Arrows + J(Attack) K(Block) L(Special)</p>
        <p>Press ESC to pause</p>
      </div>
    </div>
  );
}

// Key Config Component
function ConfigScreen({
  p1Keys,
  p2Keys,
  onP1KeyChange,
  onP2KeyChange,
  onBack,
}: {
  p1Keys: KeyBindings;
  p2Keys: KeyBindings;
  onP1KeyChange: (keys: KeyBindings) => void;
  onP2KeyChange: (keys: KeyBindings) => void;
  onBack: () => void;
}) {
  const [listening, setListening] = useState<{ player: 1 | 2; action: keyof KeyBindings } | null>(null);

  useEffect(() => {
    if (!listening) return;

    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      const key = e.key;

      if (listening.player === 1) {
        onP1KeyChange({ ...p1Keys, [listening.action]: key });
      } else {
        onP2KeyChange({ ...p2Keys, [listening.action]: key });
      }
      setListening(null);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [listening, p1Keys, p2Keys, onP1KeyChange, onP2KeyChange]);

  const formatKey = (key: string) => {
    const keyMap: Record<string, string> = {
      ArrowUp: '↑',
      ArrowDown: '↓',
      ArrowLeft: '←',
      ArrowRight: '→',
      ' ': 'Space',
    };
    return keyMap[key] || key.toUpperCase();
  };

  const KeyRow = ({
    label,
    action,
    player,
    currentKey,
  }: {
    label: string;
    action: keyof KeyBindings;
    player: 1 | 2;
    currentKey: string;
  }) => {
    const isListening = listening?.player === player && listening?.action === action;
    return (
      <div className="key-row">
        <label>{label}</label>
        <input
          type="text"
          className={`key-input ${isListening ? 'listening' : ''}`}
          value={isListening ? 'Press key...' : formatKey(currentKey)}
          onClick={() => setListening({ player, action })}
          readOnly
        />
      </div>
    );
  };

  return (
    <div className="config-screen">
      <h2>KEY CONFIGURATION</h2>
      <div className="config-container">
        <div className="player-config p1">
          <h3>PLAYER 1</h3>
          <KeyRow label="Move Left" action="left" player={1} currentKey={p1Keys.left} />
          <KeyRow label="Move Right" action="right" player={1} currentKey={p1Keys.right} />
          <KeyRow label="Jump" action="jump" player={1} currentKey={p1Keys.jump} />
          <KeyRow label="Attack" action="attack" player={1} currentKey={p1Keys.attack} />
          <KeyRow label="Block" action="block" player={1} currentKey={p1Keys.block} />
          <KeyRow label="Special" action="special" player={1} currentKey={p1Keys.special} />
        </div>
        <div className="player-config p2">
          <h3>PLAYER 2</h3>
          <KeyRow label="Move Left" action="left" player={2} currentKey={p2Keys.left} />
          <KeyRow label="Move Right" action="right" player={2} currentKey={p2Keys.right} />
          <KeyRow label="Jump" action="jump" player={2} currentKey={p2Keys.jump} />
          <KeyRow label="Attack" action="attack" player={2} currentKey={p2Keys.attack} />
          <KeyRow label="Block" action="block" player={2} currentKey={p2Keys.block} />
          <KeyRow label="Special" action="special" player={2} currentKey={p2Keys.special} />
        </div>
      </div>
      <button className="btn btn-primary" onClick={onBack}>
        BACK TO MENU
      </button>
    </div>
  );
}

// Fighter Component
function FighterSprite({ fighter, playerNum }: { fighter: Fighter; playerNum: 1 | 2 }) {
  const stateClass =
    fighter.state === 'attack' ? 'attacking' :
    fighter.state === 'block' ? 'blocking' :
    fighter.state === 'hit' ? 'hit' :
    fighter.state === 'special' ? 'special' : '';

  const facingClass = fighter.facing === 1 ? 'facing-right' : 'facing-left';

  return (
    <div
      className={`fighter p${playerNum} ${stateClass} ${facingClass}`}
      style={{
        left: fighter.x,
        top: fighter.y,
        transform: `scaleX(${fighter.facing})`,
      }}
    >
      <div className="fighter-body">
        <div className="fighter-head">
          <div className="fighter-eye left" />
          <div className="fighter-eye right" />
        </div>
      </div>
      {fighter.state === 'attack' && <div className="attack-effect" />}
      {fighter.state === 'special' && <div className="special-effect" />}
    </div>
  );
}

// Game Screen Component
function GameScreenComponent({
  p1Keys,
  p2Keys,
  onGameEnd,
}: {
  p1Keys: KeyBindings;
  p2Keys: KeyBindings;
  onGameEnd: () => void;
}) {
  const [gameState, setGameState] = useState(() => ({
    p1: createFighter(150, 1),
    p2: createFighter(ARENA_WIDTH - 150 - FIGHTER_WIDTH, -1),
    timeLeft: ROUND_TIME,
    winner: null as 1 | 2 | 'draw' | null,
  }));
  const [isPaused, setIsPaused] = useState(false);

  const keysPressed = useRef(new Set<string>());
  const attackHitRef = useRef({ p1: false, p2: false });

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPaused(p => !p);
        return;
      }
      keysPressed.current.add(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Process fighter input
  const processInput = useCallback((fighter: Fighter, keys: KeyBindings, opponent: Fighter): Fighter => {
    if (fighter.state === 'ko' || fighter.state === 'hit') return fighter;

    const pressed = keysPressed.current;
    const f = { ...fighter };
    const canAct = f.stateTimer <= 0;

    if (canAct) {
      f.vx = 0;

      if (pressed.has(keys.left)) {
        f.vx = -MOVE_SPEED;
        f.state = 'walk';
      }
      if (pressed.has(keys.right)) {
        f.vx = MOVE_SPEED;
        f.state = 'walk';
      }

      // Face opponent
      f.facing = opponent.x > f.x ? 1 : -1;

      // Jump
      if (pressed.has(keys.jump) && f.isGrounded) {
        f.vy = JUMP_FORCE;
        f.isGrounded = false;
        f.state = 'jump';
      }

      // Block
      f.isBlocking = pressed.has(keys.block);
      if (f.isBlocking) {
        f.state = 'block';
        f.vx = 0;
      }

      // Attack
      if (pressed.has(keys.attack) && !f.isBlocking) {
        f.state = 'attack';
        f.stateTimer = ATTACK_DURATION;
      }

      // Special
      if (pressed.has(keys.special) && f.energy >= SPECIAL_COST && !f.isBlocking) {
        f.state = 'special';
        f.stateTimer = SPECIAL_DURATION;
        f.energy -= SPECIAL_COST;
      }

      // Idle
      if (f.vx === 0 && f.isGrounded && !f.isBlocking && f.state !== 'attack' && f.state !== 'special') {
        f.state = 'idle';
      }
    }

    return f;
  }, []);

  // Physics update
  const updatePhysics = useCallback((fighter: Fighter): Fighter => {
    const f = { ...fighter };

    f.vy += GRAVITY;
    f.x += f.vx;
    f.y += f.vy;

    // Ground
    const groundLevel = GROUND_Y - FIGHTER_HEIGHT;
    if (f.y >= groundLevel) {
      f.y = groundLevel;
      f.vy = 0;
      f.isGrounded = true;
    }

    // Boundaries
    f.x = Math.max(0, Math.min(ARENA_WIDTH - FIGHTER_WIDTH, f.x));

    // State timer
    if (f.stateTimer > 0) {
      f.stateTimer--;
      if (f.stateTimer <= 0) {
        f.state = 'idle';
      }
    }

    // Energy regen
    f.energy = Math.min(f.maxEnergy, f.energy + ENERGY_REGEN);

    return f;
  }, []);

  // Combat check
  const checkHit = useCallback((
    attacker: Fighter,
    defender: Fighter,
    attackerKey: 'p1' | 'p2'
  ): { attacker: Fighter; defender: Fighter } => {
    const a = { ...attacker };
    const d = { ...defender };

    const isAttackFrame = a.state === 'attack' && a.stateTimer === ATTACK_DURATION - 5;
    const isSpecialFrame = a.state === 'special' && a.stateTimer === SPECIAL_DURATION - 10;

    // Reset hit tracking when starting new attack
    if (a.stateTimer === ATTACK_DURATION || a.stateTimer === SPECIAL_DURATION) {
      attackHitRef.current[attackerKey] = false;
    }

    if ((isAttackFrame || isSpecialFrame) && !attackHitRef.current[attackerKey]) {
      const range = isSpecialFrame ? SPECIAL_RANGE : ATTACK_RANGE;
      const damage = isSpecialFrame ? SPECIAL_DAMAGE : ATTACK_DAMAGE;

      const aCenter = a.x + FIGHTER_WIDTH / 2;
      const dCenter = d.x + FIGHTER_WIDTH / 2;
      const distance = Math.abs(aCenter - dCenter);

      const facingRight = a.facing === 1;
      const defenderOnRight = dCenter > aCenter;
      const correctDir = (facingRight && defenderOnRight) || (!facingRight && !defenderOnRight);

      if (distance <= range && correctDir) {
        attackHitRef.current[attackerKey] = true;
        let actualDamage = damage;

        if (d.isBlocking) {
          actualDamage = Math.floor(damage * (1 - BLOCK_REDUCTION));
          d.energy = Math.min(d.maxEnergy, d.energy + 10);
        } else {
          d.state = 'hit';
          d.stateTimer = HIT_STUN;
          a.comboCount++;
        }

        d.health = Math.max(0, d.health - actualDamage);
        if (d.health <= 0) d.state = 'ko';
      }
    }

    // Reset combo if defender recovered
    if (d.state !== 'hit' && d.stateTimer <= 0) {
      a.comboCount = 0;
    }

    return { attacker: a, defender: d };
  }, []);

  // Main game loop
  useEffect(() => {
    if (isPaused || gameState.winner) return;

    const gameLoop = () => {
      setGameState(prev => {
        let p1 = processInput(prev.p1, p1Keys, prev.p2);
        let p2 = processInput(prev.p2, p2Keys, prev.p1);

        p1 = updatePhysics(p1);
        p2 = updatePhysics(p2);

        const hit1 = checkHit(p1, p2, 'p1');
        p1 = hit1.attacker;
        p2 = hit1.defender;

        const hit2 = checkHit(p2, p1, 'p2');
        p2 = hit2.attacker;
        p1 = hit2.defender;

        return { ...prev, p1, p2 };
      });
    };

    const interval = setInterval(gameLoop, 1000 / 60);
    return () => clearInterval(interval);
  }, [isPaused, gameState.winner, p1Keys, p2Keys, processInput, updatePhysics, checkHit]);

  // Timer
  useEffect(() => {
    if (isPaused || gameState.winner) return;

    const timer = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        timeLeft: Math.max(0, prev.timeLeft - 1),
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, gameState.winner]);

  // Win condition
  useEffect(() => {
    if (gameState.winner) return;

    const { p1, p2, timeLeft } = gameState;
    let winner: 1 | 2 | 'draw' | null = null;

    if (p1.health <= 0) winner = 2;
    else if (p2.health <= 0) winner = 1;
    else if (timeLeft <= 0) {
      winner = p1.health > p2.health ? 1 : p2.health > p1.health ? 2 : 'draw';
    }

    if (winner) {
      setGameState(prev => ({ ...prev, winner }));
    }
  }, [gameState]);

  const { p1, p2, timeLeft, winner } = gameState;

  return (
    <div className="game-screen">
      <div className="game-hud">
        <div className="player-hud p1">
          <div className="player-name">PLAYER 1</div>
          <div className="health-bar-container">
            <div className="health-bar" style={{ width: `${(p1.health / p1.maxHealth) * 100}%` }} />
          </div>
          <div className="energy-bar-container">
            <div className="energy-bar" style={{ width: `${(p1.energy / p1.maxEnergy) * 100}%` }} />
          </div>
        </div>

        <div className={`timer ${timeLeft <= 10 ? 'warning' : ''}`}>{timeLeft}</div>

        <div className="player-hud p2">
          <div className="player-name">PLAYER 2</div>
          <div className="health-bar-container">
            <div className="health-bar" style={{ width: `${(p2.health / p2.maxHealth) * 100}%` }} />
          </div>
          <div className="energy-bar-container">
            <div className="energy-bar" style={{ width: `${(p2.energy / p2.maxEnergy) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="arena">
        <div className="ground" />
        <FighterSprite fighter={p1} playerNum={1} />
        <FighterSprite fighter={p2} playerNum={2} />

        {p1.comboCount > 1 && <div className="combo-display p1">{p1.comboCount} COMBO!</div>}
        {p2.comboCount > 1 && <div className="combo-display p2">{p2.comboCount} COMBO!</div>}

        {isPaused && !winner && (
          <div className="pause-overlay">
            <h2>PAUSED</h2>
            <p>Press ESC to resume</p>
          </div>
        )}

        {winner && (
          <div className="result-overlay">
            <div className={`result-text ${winner === 1 ? 'p1-wins' : winner === 2 ? 'p2-wins' : 'draw'}`}>
              {winner === 'draw' ? 'DRAW!' : `PLAYER ${winner} WINS!`}
            </div>
            <button className="btn btn-primary" onClick={onGameEnd}>
              BACK TO MENU
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Main App
export default function App() {
  const [screen, setScreen] = useState<GameScreen>('start');
  const [p1Keys, setP1Keys] = useState<KeyBindings>(DEFAULT_P1_KEYS);
  const [p2Keys, setP2Keys] = useState<KeyBindings>(DEFAULT_P2_KEYS);

  useEffect(() => {
    const savedP1 = localStorage.getItem('p1Keys');
    const savedP2 = localStorage.getItem('p2Keys');
    if (savedP1) setP1Keys(JSON.parse(savedP1));
    if (savedP2) setP2Keys(JSON.parse(savedP2));
  }, []);

  useEffect(() => {
    localStorage.setItem('p1Keys', JSON.stringify(p1Keys));
    localStorage.setItem('p2Keys', JSON.stringify(p2Keys));
  }, [p1Keys, p2Keys]);

  return (
    <>
      {screen === 'start' && (
        <StartScreen onStart={() => setScreen('game')} onConfig={() => setScreen('config')} />
      )}
      {screen === 'config' && (
        <ConfigScreen
          p1Keys={p1Keys}
          p2Keys={p2Keys}
          onP1KeyChange={setP1Keys}
          onP2KeyChange={setP2Keys}
          onBack={() => setScreen('start')}
        />
      )}
      {screen === 'game' && (
        <GameScreenComponent p1Keys={p1Keys} p2Keys={p2Keys} onGameEnd={() => setScreen('start')} />
      )}
    </>
  );
}
