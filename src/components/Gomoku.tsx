'use client'

import React, { useState, useEffect } from 'react';

interface GomokuProps {
  boardSize?: number;
}

type GameMode = 'pvp' | 'pvc';
type PlayerColor = 1 | 2; // 1: 흑돌, 2: 백돌

const Gomoku: React.FC<GomokuProps> = ({ boardSize = 15 }) => {
  const [board, setBoard] = useState<number[][]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [winCounts, setWinCounts] = useState({ black: 0, white: 0 });
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [playerColor, setPlayerColor] = useState<PlayerColor>(1);
  const [showColorSelect, setShowColorSelect] = useState(false);

  useEffect(() => {
    initializeBoard();
  }, [boardSize]);

  useEffect(() => {
    if (gameMode === 'pvc' && currentPlayer !== playerColor && !winner) {
      const timer = setTimeout(makeComputerMove, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, winner, playerColor]);

  const initializeBoard = () => {
    const newBoard = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
    setBoard(newBoard);
    setCurrentPlayer(1); // 항상 흑돌부터 시작
    setWinner(null);
    setGameStarted(true);

    // 컴퓨터가 흑돌이면 바로 첫 수 두기
    if (gameMode === 'pvc' && playerColor === 2) {
      setTimeout(() => {
        const center = Math.floor(boardSize / 2);
        handleCellClick(center, center);
      }, 500);
    }
  };

  const startGameWithColor = (color: PlayerColor) => {
    setPlayerColor(color);
    setShowColorSelect(false);
    setGameMode('pvc');
    initializeBoard();
  };

  // 특정 위치에서 연속된 돌의 개수를 확인하는 함수
  const getConsecutiveStones = (row: number, col: number, player: number, board: number[][]) => {
    const directions = [
      [1, 0],   // 가로
      [0, 1],   // 세로
      [1, 1],   // 대각선 ↘
      [1, -1],  // 대각선 ↗
    ];

    return directions.map(([dx, dy]) => {
      let count = 1;
      let openEnds = 0;
      
      // 정방향 확인
      let i = 1;
      while (i < 5) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (
          newRow < 0 || newRow >= boardSize ||
          newCol < 0 || newCol >= boardSize
        ) break;
        
        if (board[newRow][newCol] === player) {
          count++;
        } else if (board[newRow][newCol] === 0) {
          openEnds++;
          break;
        } else {
          break;
        }
        i++;
      }

      // 역방향 확인
      i = 1;
      while (i < 5) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (
          newRow < 0 || newRow >= boardSize ||
          newCol < 0 || newCol >= boardSize
        ) break;
        
        if (board[newRow][newCol] === player) {
          count++;
        } else if (board[newRow][newCol] === 0) {
          openEnds++;
          break;
        } else {
          break;
        }
        i++;
      }

      return { count, openEnds };
    });
  };

  // 위치의 점수를 계산하는 함수
  const evaluatePosition = (row: number, col: number, board: number[][]): number => {
    if (board[row][col] !== 0) return -1;

    const computerColor = playerColor === 1 ? 2 : 1;
    let score = 0;

    // 기본 위치 점수 (중앙에 가까울수록 높은 점수)
    const centerRow = Math.floor(boardSize / 2);
    const centerCol = Math.floor(boardSize / 2);
    const distanceFromCenter = Math.abs(row - centerRow) + Math.abs(col - centerCol);
    score += Math.max(0, 10 - distanceFromCenter);

    // 컴퓨터의 연속된 돌 평가
    const computerLines = getConsecutiveStones(row, col, computerColor, board);
    computerLines.forEach(({ count, openEnds }) => {
      if (count >= 4) score += 10000; // 승리 조건
      else if (count === 3 && openEnds === 2) score += 1000; // 열린 삼
      else if (count === 3 && openEnds === 1) score += 100; // 한쪽이 막힌 삼
      else if (count === 2 && openEnds === 2) score += 50; // 열린 이
    });

    // 플레이어의 연속된 돌 평가 (방어)
    const playerLines = getConsecutiveStones(row, col, playerColor, board);
    playerLines.forEach(({ count, openEnds }) => {
      if (count >= 4) score += 9000; // 상대 승리 방지
      else if (count === 3 && openEnds === 2) score += 800; // 상대 열린 삼 방지
      else if (count === 3 && openEnds === 1) score += 80; // 상대 한쪽이 막힌 삼 방지
      else if (count === 2 && openEnds === 2) score += 40; // 상대 열린 이 방지
    });

    return score;
  };

  const makeComputerMove = () => {
    if (winner || !gameStarted) return;

    // 모든 빈 칸의 점수를 계산
    let bestScore = -1;
    let bestMoves: [number, number][] = [];

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] === 0) {
          const score = evaluatePosition(row, col, board);
          if (score > bestScore) {
            bestScore = score;
            bestMoves = [[row, col]];
          } else if (score === bestScore) {
            bestMoves.push([row, col]);
          }
        }
      }
    }

    if (bestMoves.length > 0) {
      // 최고 점수의 위치들 중 무작위 선택
      const [row, col] = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      const newBoard = [...board];
      newBoard[row][col] = currentPlayer;
      setBoard(newBoard);

      if (checkWinner(row, col, currentPlayer)) {
        setWinner(currentPlayer);
        setWinCounts(prev => ({
          ...prev,
          [currentPlayer === 1 ? 'black' : 'white']: prev[currentPlayer === 1 ? 'black' : 'white'] + 1
        }));
        return;
      }

      setCurrentPlayer(prev => prev === 1 ? 2 : 1);
    }
  };

  const checkWinner = (row: number, col: number, player: number): boolean => {
    const directions = [
      [1, 0],   // 가로
      [0, 1],   // 세로
      [1, 1],   // 대각선 ↘
      [1, -1],  // 대각선 ↗
    ];

    return directions.some(([dx, dy]) => {
      let count = 1;
      
      // 정방향 확인
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (
          newRow < 0 || newRow >= boardSize ||
          newCol < 0 || newCol >= boardSize ||
          board[newRow][newCol] !== player
        ) break;
        count++;
      }

      // 역방향 확인
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (
          newRow < 0 || newRow >= boardSize ||
          newCol < 0 || newCol >= boardSize ||
          board[newRow][newCol] !== player
        ) break;
        count++;
      }

      return count >= 5;
    });
  };

  const handleCellClick = (row: number, col: number) => {
    if (board[row][col] !== 0 || winner) return;
    if (gameMode === 'pvc' && currentPlayer !== playerColor) return;

    const newBoard = [...board];
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    if (checkWinner(row, col, currentPlayer)) {
      setWinner(currentPlayer);
      setWinCounts(prev => ({
        ...prev,
        [currentPlayer === 1 ? 'black' : 'white']: prev[currentPlayer === 1 ? 'black' : 'white'] + 1
      }));
      return;
    }

    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
  };

  return (
    <div className="flex flex-col items-center p-4 gap-3">
      <div className="flex items-center gap-4">
        <div className="text-lg">
          ⚫ 흑돌 승: {winCounts.black}
        </div>
        <div className="text-lg">
          ⚪ 백돌 승: {winCounts.white}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => {
            setGameMode('pvp');
            setShowColorSelect(false);
            initializeBoard();
          }}
          className={`px-4 py-2 rounded ${
            gameMode === 'pvp' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          2인 플레이
        </button>
        <button
          onClick={() => setShowColorSelect(true)}
          className={`px-4 py-2 rounded ${
            gameMode === 'pvc' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          컴퓨터와 대결
        </button>
      </div>

      {showColorSelect && (
        <div className="flex gap-4">
          <button
            onClick={() => startGameWithColor(1)}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            흑돌 선택 (선공)
          </button>
          <button
            onClick={() => startGameWithColor(2)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            백돌 선택 (후공)
          </button>
        </div>
      )}
      
      <div className="text-xl font-bold">
        {winner 
          ? `${winner === 1 ? '⚫ 흑돌' : '⚪ 백돌'} 승리!` 
          : `현재 차례: ${currentPlayer === 1 ? '⚫ 흑돌' : '⚪ 백돌'}`}
      </div>
      
      <button
        onClick={initializeBoard}
        className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
      >
        새 게임
      </button>

      <div className="relative bg-amber-100 p-4 rounded-lg shadow-lg">
        <div 
          className="grid"
          style={{
            width: `${boardSize * 30}px`,
            height: `${boardSize * 30}px`,
            backgroundImage: `
              linear-gradient(to right, black 1px, transparent 1px),
              linear-gradient(to bottom, black 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px',
            position: 'relative',
            backgroundPosition: '0 0',
            backgroundRepeat: 'repeat'
          }}
        >
          {board.map((row, rowIndex) => (
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                className="absolute cursor-pointer"
                style={{
                  width: '20px',
                  height: '20px',
                  left: `${colIndex * 30 - 10}px`,
                  top: `${rowIndex * 30 - 10}px`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1
                }}
              >
                {cell !== 0 && (
                  <div
                    className={`
                      w-full h-full
                      rounded-full
                      ${cell === 1 ? 'bg-black' : 'bg-white border-2 border-black'}
                      shadow-md
                    `}
                  />
                )}
              </div>
            ))
          ))}
          <div 
            className="absolute"
            style={{
              right: 0,
              top: 0,
              width: '1px',
              height: '100%',
              backgroundColor: 'black'
            }}
          />
          <div 
            className="absolute"
            style={{
              left: 0,
              bottom: 0,
              width: '100%',
              height: '1px',
              backgroundColor: 'black'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Gomoku; 