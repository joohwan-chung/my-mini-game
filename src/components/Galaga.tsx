'use client'

import React, { useState, useEffect, useRef } from 'react';

type Position = {
  x: number;
  y: number;
};

type GameObject = Position & {
  width: number;
  height: number;
  emoji: string;
};

type Bullet = GameObject & {
  speed: number;
};

type Enemy = GameObject & {
  movePattern: string;
  points: number;
  health?: number;
  initialX: number;  // 초기 위치 저장
  initialY: number;
  isAttacking: boolean;  // 공격 중인지 여부
  attackPath?: number;   // 공격 패턴 번호
  pathProgress: number;  // 공격 경로상 진행도 (0-1)
};

type Player = GameObject & {
  lives: number;
};

type Explosion = Position & {
  duration: number;
};

type GameSize = {
  width: number;
  height: number;
};

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 10;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 40;
const PLAYER_SPEED = 15; // 이동 속도 증가

// 기본 이모지 설정
const DEFAULT_BULLET_EMOJI = '💫';
const DEFAULT_EXPLOSION_EMOJI = '💥';

const Galaga = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameSize, setGameSize] = useState<GameSize>({ width: 800, height: 600 });
  
  // 게임 요소 크기 계산 함수
  const calculateSizes = (width: number, height: number) => {
    const scale = Math.min(width / 800, height / 600);
    return {
      playerWidth: 50 * scale,
      playerHeight: 50 * scale,
      bulletWidth: 4 * scale,
      bulletHeight: 10 * scale,
      enemyWidth: 40 * scale,
      enemyHeight: 40 * scale,
      playerSpeed: 15 * scale
    };
  };

  const sizes = calculateSizes(gameSize.width, gameSize.height);

  const [player, setPlayer] = useState<Player>({
    x: gameSize.width / 2 - sizes.playerWidth / 2,
    y: gameSize.height - sizes.playerHeight - 10,
    width: sizes.playerWidth,
    height: sizes.playerHeight,
    lives: 3,
    emoji: '🚀'
  });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // 스테이지별 적 패턴 설정
  const enemyPatterns = {
    basic: '👾',
    fast: '👻',
    tough: '👹',
    boss: '👿'
  };

  // 스테이지별 적 생성
  const generateEnemies = (currentStage: number): Enemy[] => {
    const enemies: Enemy[] = [];
    const rows = Math.min(3 + Math.floor(currentStage / 2), 5);
    const cols = Math.min(6 + Math.floor(currentStage / 3), 10);
    const padding = 20;

    // 전체 적 그룹의 너비 계산
    const totalWidth = cols * (ENEMY_WIDTH + padding) - padding;
    // 시작 x 좌표 (중앙 정렬)
    const startX = (GAME_WIDTH - totalWidth) / 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * (ENEMY_WIDTH + padding);
        const y = row * (ENEMY_HEIGHT + padding) + padding + 50; // 상단 여백 추가
        
        let enemyType: Enemy = {
          x: x,
          y: y,
          initialX: x,
          initialY: y,
          width: ENEMY_WIDTH,
          height: ENEMY_HEIGHT,
          movePattern: 'basic',
          points: 100,
          emoji: enemyPatterns.basic,
          isAttacking: false,
          pathProgress: 0
        };

        // 스테이지별 특수 적 추가
        if (currentStage > 2 && Math.random() < 0.2) {
          enemyType = {
            ...enemyType,
            movePattern: 'fast',
            points: 200,
            emoji: enemyPatterns.fast
          };
        }
        
        if (currentStage > 4 && Math.random() < 0.1) {
          enemyType = {
            ...enemyType,
            movePattern: 'tough',
            health: 2,
            points: 300,
            emoji: enemyPatterns.tough
          };
        }

        enemies.push(enemyType);
      }
    }

    // 보스 추가 (5스테이지마다)
    if (currentStage % 5 === 0) {
      enemies.push({
        x: (GAME_WIDTH - ENEMY_WIDTH * 2) / 2,
        y: 50,
        width: ENEMY_WIDTH * 2,
        height: ENEMY_HEIGHT * 2,
        movePattern: 'boss',
        health: 5,
        points: 1000,
        emoji: enemyPatterns.boss,
        initialX: (GAME_WIDTH - ENEMY_WIDTH * 2) / 2,
        initialY: 50,
        isAttacking: false,
        pathProgress: 0
      });
    }

    return enemies;
  };

  // 게임 초기화
  const initGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setStage(1);
    setEnemies(generateEnemies(1));
    setBullets([]);
    setExplosions([]);
    setPlayer({
      x: gameSize.width / 2 - sizes.playerWidth / 2,
      y: gameSize.height - sizes.playerHeight - 10,
      width: sizes.playerWidth,
      height: sizes.playerHeight,
      lives: 3,
      emoji: '🚀'
    });
  };

  // 적 이동 패턴 수정
  const moveEnemy = (enemy: Enemy) => {
    if (!enemy.isAttacking) {
      // 제자리에서 약간의 움직임
      return {
        x: enemy.initialX + Math.sin(Date.now() / 1000) * (gameSize.width * 0.01), // 화면 크기에 비례한 움직임
        y: enemy.initialY + Math.sin(Date.now() / 1500) * (gameSize.height * 0.01)
      };
    }

    // 공격 패턴별 경로 계산
    const attackPatterns = [
      // 패턴 1: S자 곡선으로 플레이어 추적
      (progress: number) => ({
        x: enemy.initialX + Math.sin(progress * Math.PI * 2) * (gameSize.width * 0.25),
        y: enemy.initialY + (player.y - enemy.initialY + sizes.playerHeight) * progress
      }),
      // 패턴 2: 원형 곡선으로 플레이어 추적
      (progress: number) => ({
        x: enemy.initialX + Math.cos(progress * Math.PI * 2) * (gameSize.width * 0.2),
        y: enemy.initialY + (player.y - enemy.initialY + sizes.playerHeight) * Math.pow(progress, 1.5)
      }),
      // 패턴 3: 직선으로 플레이어 추적
      (progress: number) => ({
        x: enemy.initialX + (player.x - enemy.initialX) * progress,
        y: enemy.initialY + (player.y - enemy.initialY + sizes.playerHeight) * progress
      })
    ];

    const pattern = attackPatterns[enemy.attackPath || 0];
    const newPos = pattern(enemy.pathProgress);

    return newPos;
  };

  // 충돌 감지 함수 추가
  const checkCollision = (obj1: GameObject, obj2: GameObject) => {
    const obj1Center = {
      x: obj1.x + obj1.width / 2,
      y: obj1.y + obj1.height / 2
    };
    
    const obj2Center = {
      x: obj2.x + obj2.width / 2,
      y: obj2.y + obj2.height / 2
    };
    
    // 두 객체 중심점 간의 거리 계산
    const distance = Math.sqrt(
      Math.pow(obj1Center.x - obj2Center.x, 2) + 
      Math.pow(obj1Center.y - obj2Center.y, 2)
    );
    
    // 충돌 반경 (두 객체의 크기를 고려)
    const collisionRadius = (obj1.width + obj2.width) / 4;
    
    return distance < collisionRadius;
  };

  // 게임 루프
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = setInterval(() => {
      // 적 이동 및 충돌 감지
      setEnemies(prev => {
        const movedEnemies = prev.map(enemy => {
          if (enemy.isAttacking) {
            const newProgress = enemy.pathProgress + (0.01 * (gameSize.height / 600)); // 화면 크기에 비례한 속도
            if (newProgress >= 1) {
              return {
                ...enemy,
                isAttacking: false,
                pathProgress: 0,
                x: enemy.initialX,
                y: enemy.initialY
              };
            }
            const newPos = moveEnemy({...enemy, pathProgress: newProgress});
            
            // 플레이어와 충돌 체크
            if (checkCollision(enemy, player) && !gameOver) {
              setPlayer(prev => ({
                ...prev,
                lives: Math.max(0, prev.lives - 1)
              }));
              setExplosions(prev => [...prev, {
                x: player.x,
                y: player.y,
                duration: 30
              }]);
              
              if (player.lives <= 1) {
                setGameOver(true);
              }

              return {
                ...enemy,
                isAttacking: false,
                pathProgress: 0,
                x: enemy.initialX,
                y: enemy.initialY
              };
            }

            return {
              ...enemy,
              pathProgress: newProgress,
              x: newPos.x,
              y: newPos.y
            };
          } else if (Math.random() < 0.002 * (gameSize.height / 600)) { // 화면 크기에 비례한 공격 확률
            return {
              ...enemy,
              isAttacking: true,
              pathProgress: 0,
              attackPath: Math.floor(Math.random() * 3)
            };
          }
          const newPos = moveEnemy(enemy);
          return {
            ...enemy,
            x: newPos.x,
            y: newPos.y
          };
        });

        return movedEnemies;
      });

      // 플레이어 생명력 체크
      if (player.lives <= 0) {
        setGameOver(true);
      }

      // 총알 이동
      setBullets(prev => prev.map(bullet => ({
        ...bullet,
        y: bullet.y - bullet.speed
      })).filter(bullet => bullet.y > 0));

      // 적 이동
      setEnemies(prev => {
        const movedEnemies = prev.map(enemy => {
          const newPos = moveEnemy(enemy);
          return {
            ...enemy,
            x: newPos.x,
            y: newPos.y
          };
        });

        // 충돌 감지
        const remainingEnemies = movedEnemies.filter(enemy => {
          // 총알과 적 충돌 체크
          const isHit = bullets.some(bullet => checkCollision(bullet, enemy));
          if (isHit) {
            setScore(s => s + (enemy.points || 100));
            setExplosions(prev => [...prev, {
              x: enemy.x,
              y: enemy.y,
              duration: 20
            }]);
            return false;
          }
          return true;
        });

        return remainingEnemies;
      });

      // 폭발 효과 업데이트
      setExplosions(prev => 
        prev.map(exp => ({...exp, duration: exp.duration - 1}))
          .filter(exp => exp.duration > 0)
      );

      // 스테이지 클리어 체크
      if (enemies.length === 0) {
        setStage(s => s + 1);
        setEnemies(generateEnemies(stage + 1));
      }
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver, stage, bullets, enemies, player, gameSize, sizes]);

  // 키보드 입력 처리
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          setPlayer(prev => ({
            ...prev,
            x: Math.max(0, prev.x - sizes.playerSpeed)
          }));
          break;
        case 'ArrowRight':
          setPlayer(prev => ({
            ...prev,
            x: Math.min(gameSize.width - sizes.playerWidth, prev.x + sizes.playerSpeed)
          }));
          break;
        case ' ':
          setBullets(prev => [...prev, {
            x: player.x + sizes.playerWidth / 2 - sizes.bulletWidth / 2,
            y: player.y,
            width: sizes.bulletWidth,
            height: sizes.bulletHeight,
            speed: 10 * (gameSize.height / 600),
            emoji: DEFAULT_BULLET_EMOJI
          }]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver, player.x, player.y, gameSize, sizes]);

  // 화면 크기 변경 감지 및 처리
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const maxWidth = Math.min(window.innerWidth - 32, 1200); // 패딩 고려
        const maxHeight = window.innerHeight - 200; // 상단 UI 공간 고려
        const aspectRatio = 4/3;
        
        let width = maxWidth;
        let height = width / aspectRatio;
        
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }
        
        setGameSize({ width, height });
        
        // 플레이어 위치 재조정
        const newSizes = calculateSizes(width, height);
        setPlayer(prev => ({
          ...prev,
          width: newSizes.playerWidth,
          height: newSizes.playerHeight,
          x: Math.min(width - newSizes.playerWidth, prev.x * (width / gameSize.width)),
          y: height - newSizes.playerHeight - 10
        }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 터치 컨트롤 처리
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      
      setPlayer(prev => ({
        ...prev,
        x: Math.max(0, Math.min(gameSize.width - sizes.playerWidth, x - sizes.playerWidth / 2))
      }));
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      // 터치할 때마다 총알 발사
      setBullets(prev => [...prev, {
        x: player.x + sizes.playerWidth / 2 - sizes.bulletWidth / 2,
        y: player.y,
        width: sizes.bulletWidth,
        height: sizes.bulletHeight,
        speed: 10 * (gameSize.height / 600), // 화면 크기에 비례한 속도
        emoji: DEFAULT_BULLET_EMOJI
      }]);
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchmove', handleTouchMove);
      canvas.addEventListener('touchstart', handleTouchStart);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchstart', handleTouchStart);
      }
    };
  }, [gameStarted, gameOver, player.x, player.y, gameSize, sizes]);

  // 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 클리어
    ctx.clearRect(0, 0, gameSize.width, gameSize.height);

    // 배경
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, gameSize.width, gameSize.height);

    if (gameStarted && !gameOver) {
      // 플레이어 이모지 그리기
      ctx.font = `${sizes.playerHeight}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.emoji, player.x + sizes.playerWidth/2, player.y + sizes.playerHeight/2);

      // 총알 그리기
      ctx.fillStyle = '#fff';
      bullets.forEach(bullet => {
        ctx.fillText(bullet.emoji, bullet.x + bullet.width/2, bullet.y + bullet.height/2);
      });

      // 적 이모지 그리기
      enemies.forEach(enemy => {
        ctx.font = `${sizes.enemyHeight}px Arial`;
        ctx.fillText(enemy.emoji, enemy.x + sizes.enemyWidth/2, enemy.y + sizes.enemyHeight/2);
      });

      // 폭발 효과 그리기
      explosions.forEach(exp => {
        ctx.fillText(DEFAULT_EXPLOSION_EMOJI, exp.x, exp.y);
      });
    }
  }, [gameStarted, gameOver, player, bullets, enemies, explosions, gameSize, sizes]);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="text-white mb-4">
        <div className="text-2xl">점수: {score}</div>
        <div>스테이지: {stage}</div>
        <div>생명: {'❤️'.repeat(Math.max(0, player.lives))}</div>
      </div>
      <canvas
        ref={canvasRef}
        width={gameSize.width}
        height={gameSize.height}
        className="border-4 border-white rounded-lg"
        style={{
          maxWidth: '100%',
          touchAction: 'none'
        }}
      />
      {!gameStarted || gameOver ? (
        <div className="mt-4">
          <button
            onClick={initGame}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {gameOver ? '다시 시작' : '게임 시작'}
          </button>
        </div>
      ) : null}
      <div className="mt-4 text-white text-center">
        <p>조작 방법:</p>
        <p className="hidden md:block">← → : 이동</p>
        <p className="hidden md:block">스페이스바 : 발사</p>
        <p className="md:hidden">터치로 이동 및 발사</p>
      </div>
    </div>
  );
};

export default Galaga; 