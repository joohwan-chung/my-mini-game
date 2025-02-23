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
  const [player, setPlayer] = useState<Player>({
    x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: GAME_HEIGHT - PLAYER_HEIGHT - 10,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
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
      x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: GAME_HEIGHT - PLAYER_HEIGHT - 10,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      lives: 3,
      emoji: '🚀'
    });
  };

  // 적 이동 패턴 수정
  const moveEnemy = (enemy: Enemy) => {
    if (!enemy.isAttacking) {
      // 제자리에서 약간의 움직임
      return {
        x: enemy.initialX + Math.sin(Date.now() / 1000) * 5,
        y: enemy.initialY + Math.sin(Date.now() / 1500) * 3
      };
    }

    // 공격 패턴별 경로 계산
    const attackPatterns = [
      // 패턴 1: S자 곡선으로 플레이어 추적
      (progress: number) => ({
        x: enemy.initialX + Math.sin(progress * Math.PI * 2) * 200,
        y: enemy.initialY + (GAME_HEIGHT - enemy.initialY) * progress
      }),
      // 패턴 2: 원형 곡선으로 플레이어 추적
      (progress: number) => ({
        x: enemy.initialX + Math.cos(progress * Math.PI * 2) * 150,
        y: enemy.initialY + (GAME_HEIGHT - enemy.initialY) * Math.pow(progress, 2)
      }),
      // 패턴 3: 직선으로 플레이어 추적
      (progress: number) => ({
        x: enemy.initialX + (player.x - enemy.initialX) * progress,
        y: enemy.initialY + (GAME_HEIGHT - enemy.initialY) * progress
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
            const newProgress = enemy.pathProgress + 0.01;
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
          } else if (Math.random() < 0.002) { // 공격 확률 증가
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
  }, [gameStarted, gameOver, stage, bullets, enemies, player]);

  // 키보드 입력 처리
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          setPlayer(prev => ({
            ...prev,
            x: Math.max(0, prev.x - PLAYER_SPEED)
          }));
          break;
        case 'ArrowRight':
          setPlayer(prev => ({
            ...prev,
            x: Math.min(GAME_WIDTH - PLAYER_WIDTH, prev.x + PLAYER_SPEED)
          }));
          break;
        case ' ':
          setBullets(prev => [...prev, {
            x: player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
            y: player.y,
            width: BULLET_WIDTH,
            height: BULLET_HEIGHT,
            speed: 10,
            emoji: DEFAULT_BULLET_EMOJI
          }]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver, player.x, player.y]);

  // 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 클리어
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 배경
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (gameStarted && !gameOver) {
      // 플레이어 이모지 그리기
      ctx.font = `${PLAYER_HEIGHT}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.emoji, player.x + PLAYER_WIDTH/2, player.y + PLAYER_HEIGHT/2);

      // 총알 그리기
      ctx.fillStyle = '#fff';
      bullets.forEach(bullet => {
        ctx.fillText(bullet.emoji, bullet.x + bullet.width/2, bullet.y + bullet.height/2);
      });

      // 적 이모지 그리기
      enemies.forEach(enemy => {
        ctx.font = `${enemy.height}px Arial`;
        ctx.fillText(enemy.emoji, enemy.x + enemy.width/2, enemy.y + enemy.height/2);
      });

      // 폭발 효과 그리기
      explosions.forEach(exp => {
        ctx.fillText(DEFAULT_EXPLOSION_EMOJI, exp.x, exp.y);
      });
    }
  }, [gameStarted, gameOver, player, bullets, enemies, explosions]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="text-white mb-4">
        <div className="text-2xl">점수: {score}</div>
        <div>스테이지: {stage}</div>
        <div>생명: {'❤️'.repeat(Math.max(0, player.lives))}</div>
      </div>
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="border-4 border-white"
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
        <p>← → : 이동</p>
        <p>스페이스바 : 발사</p>
      </div>
    </div>
  );
};

export default Galaga; 