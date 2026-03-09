import React, { useEffect, useRef, useState } from 'react';
import { Trophy, RotateCcw, Play } from 'lucide-react';

// Constants
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const SCALE = 4; // Scale factor for pixel art
const GRID_SIZE = 16;
const GRAVITY = 0.5;
const JUMP_FORCE = -8;
const MOVE_SPEED = 3;

// 1-bit colors
const INK = '#1a1a1a';
const PAPER = '#f8f8f0';

type Entity = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  onGround: boolean;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'won'>('start');
  const [score, setScore] = useState(0);
  
  // Game state refs to avoid re-renders in the loop
  const playerRef = useRef<Entity>({
    x: 50,
    y: 350,
    width: 12 * SCALE,
    height: 16 * SCALE,
    vx: 0,
    vy: 0,
    onGround: false,
  });

  const friendRef = useRef<Rect>({
    x: 550,
    y: 100,
    width: 12 * SCALE,
    height: 16 * SCALE,
  });

  const platformsRef = useRef<Rect[]>([
    { x: 0, y: 440, width: 640, height: 40 }, // Ground
    { x: 100, y: 350, width: 100, height: 20 },
    { x: 250, y: 300, width: 100, height: 20 },
    { x: 400, y: 250, width: 100, height: 20 },
    { x: 520, y: 150, width: 100, height: 20 },
    { x: 50, y: 200, width: 100, height: 20 },
    { x: 200, y: 150, width: 100, height: 20 },
  ]);

  const keysRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (gameState === 'start' && e.code === 'Space') startGame();
      if (gameState === 'won' && e.code === 'Space') resetGame();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const startGame = () => {
    playerRef.current = {
      x: 50,
      y: 350,
      width: 12 * SCALE,
      height: 16 * SCALE,
      vx: 0,
      vy: 0,
      onGround: false,
    };
    setGameState('playing');
  };

  const resetGame = () => {
    setGameState('start');
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    let animationFrameId: number;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const update = () => {
      const player = playerRef.current;

      // Input
      if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
        player.vx = -MOVE_SPEED;
      } else if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
        player.vx = MOVE_SPEED;
      } else {
        player.vx = 0;
      }

      if ((keysRef.current['ArrowUp'] || keysRef.current['Space'] || keysRef.current['KeyW']) && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
      }

      // Physics
      player.vy += GRAVITY;
      player.x += player.vx;
      player.y += player.vy;

      // Collision Detection
      player.onGround = false;
      for (const plat of platformsRef.current) {
        if (
          player.x < plat.x + plat.width &&
          player.x + player.width > plat.x &&
          player.y < plat.y + plat.height &&
          player.y + player.height > plat.y
        ) {
          // Resolve vertical collision
          if (player.vy > 0 && player.y + player.height - player.vy <= plat.y) {
            player.y = plat.y - player.height;
            player.vy = 0;
            player.onGround = true;
          } else if (player.vy < 0 && player.y - player.vy >= plat.y + plat.height) {
            player.y = plat.y + plat.height;
            player.vy = 0;
          } else {
            // Horizontal collision
            if (player.vx > 0) {
              player.x = plat.x - player.width;
            } else if (player.vx < 0) {
              player.x = plat.x + plat.width;
            }
          }
        }
      }

      // Boundaries
      if (player.x < 0) player.x = 0;
      if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;
      if (player.y > CANVAS_HEIGHT) {
        // Fall off screen -> reset position
        player.x = 50;
        player.y = 350;
        player.vy = 0;
      }

      // Goal Check
      const friend = friendRef.current;
      if (
        player.x < friend.x + friend.width &&
        player.x + player.width > friend.x &&
        player.y < friend.y + friend.height &&
        player.y + player.height > friend.y
      ) {
        setGameState('won');
      }
    };

    const gameLoop = () => {
      update();
      
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Platforms
      ctx.fillStyle = INK;
      for (const plat of platformsRef.current) {
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.strokeStyle = PAPER;
        ctx.lineWidth = 1;
        ctx.strokeRect(plat.x + 2, plat.y + 2, plat.width - 4, plat.height - 4);
      }

      // Draw Friend
      const friend = friendRef.current;
      drawKnight(ctx, friend.x, friend.y, true);

      // Draw Player
      const player = playerRef.current;
      drawKnight(ctx, player.x, player.y, false);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const drawKnight = (ctx: CanvasRenderingContext2D, x: number, y: number, isFriend: boolean) => {
      ctx.fillStyle = INK;
      ctx.fillRect(x + 2 * SCALE, y + 4 * SCALE, 8 * SCALE, 10 * SCALE);
      ctx.fillRect(x + 3 * SCALE, y, 6 * SCALE, 5 * SCALE);
      ctx.fillStyle = PAPER;
      ctx.fillRect(x + 4 * SCALE, y + 2 * SCALE, SCALE, SCALE);
      ctx.fillRect(x + 7 * SCALE, y + 2 * SCALE, SCALE, SCALE);
      
      if (isFriend) {
        ctx.fillStyle = INK;
        ctx.fillRect(x + 4 * SCALE, y - SCALE, 4 * SCALE, SCALE);
      } else {
        ctx.fillStyle = INK;
        ctx.fillRect(x + 10 * SCALE, y + 6 * SCALE, 2 * SCALE, 6 * SCALE);
        ctx.fillRect(x + 9 * SCALE, y + 10 * SCALE, 4 * SCALE, SCALE);
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

  return (
    <div className="game-container">
      <div className="flex flex-col items-center mb-4">
        <h1 className="text-4xl font-bold ui-text mb-2">Knight's Rescue</h1>
        <p className="text-sm opacity-60 ui-text">A 1-bit medieval quest</p>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          id="game-canvas"
        />

        {gameState === 'start' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f8f8f0]/90 backdrop-blur-sm">
            <div className="p-8 border-4 border-[#1a1a1a] bg-[#f8f8f0] flex flex-col items-center text-center">
              <Play size={48} className="mb-4" />
              <h2 className="text-2xl font-bold ui-text mb-4">Rescue Your Friend!</h2>
              <p className="mb-6 max-w-xs">Reach the top platform to save your companion from the tower.</p>
              <div className="flex flex-col gap-2 text-sm ui-text">
                <p>ARROWS / WASD to move</p>
                <p>SPACE to jump</p>
              </div>
              <button
                onClick={startGame}
                className="mt-8 px-6 py-3 bg-[#1a1a1a] text-[#f8f8f0] ui-text hover:opacity-90 transition-opacity"
              >
                Start Quest
              </button>
            </div>
          </div>
        )}

        {gameState === 'won' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f8f8f0]/90 backdrop-blur-sm">
            <div className="p-8 border-4 border-[#1a1a1a] bg-[#f8f8f0] flex flex-col items-center text-center">
              <Trophy size={48} className="mb-4 text-yellow-600" />
              <h2 className="text-3xl font-bold ui-text mb-4">Victory!</h2>
              <p className="mb-6">You have rescued your friend and returned peace to the kingdom.</p>
              <button
                onClick={resetGame}
                className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] text-[#f8f8f0] ui-text hover:opacity-90 transition-opacity"
              >
                <RotateCcw size={18} />
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs ui-text opacity-50">
        Built with 1-bit pixel art & medieval spirit
      </div>
    </div>
  );
}

