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
    if (!board.length) {
      initializeBoard();
    }
  }, [boardSize]);

  useEffect(() => {
    if (gameMode === 'pvc' && currentPlayer !== playerColor && !winner) {
      const timer = setTimeout(makeComputerMove, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, winner, playerColor, board]);

  const initializeBoard = () => {
    const newBoard = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
    setBoard(newBoard);
    setCurrentPlayer(1);
    setWinner(null);
    setGameStarted(true);

    if (gameMode === 'pvc' && playerColor === 2) {
      setTimeout(() => {
        const center = Math.floor(boardSize / 2);
        const newBoard = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
        newBoard[center][center] = 1;
        setBoard(newBoard);
        setCurrentPlayer(2);
      }, 500);
    }
  };

  const startGameWithColor = (color: PlayerColor) => {
    setPlayerColor(color);
    setShowColorSelect(false);
    setGameMode('pvc');
    initializeBoard();
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

  const evaluatePosition = (row: number, col: number, board: number[][]): number => {
    if (board[row][col] !== 0) return -1;

    const computerColor = playerColor === 1 ? 2 : 1;
    let score = 0;

    // 중앙 선호도
    const centerRow = Math.floor(boardSize / 2);
    const centerCol = Math.floor(boardSize / 2);
    const distanceFromCenter = Math.abs(row - centerRow) + Math.abs(col - centerCol);
    score += Math.max(0, 10 - distanceFromCenter);

    // 승리 가능성 체크
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    
    // 컴퓨터의 공격 점수
    directions.forEach(([dx, dy]) => {
      let consecutive = 0;
      let blocked = 0;
      let space = false;

      // 양방향 체크
      [1, -1].forEach(multiplier => {
        for (let i = 1; i <= 4; i++) {
          const newRow = row + dx * i * multiplier;
          const newCol = col + dy * i * multiplier;
          
          if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
            if (!space) blocked++;
            break;
          }

          const cell = board[newRow][newCol];
          if (cell === computerColor) consecutive++;
          else if (cell === 0) {
            space = true;
            break;
          } else {
            if (!space) blocked++;
            break;
          }
        }
      });

      // 점수 계산
      if (consecutive >= 4) score += 10000;
      else if (consecutive === 3 && blocked === 0) score += 1000;
      else if (consecutive === 3 && blocked === 1) score += 100;
      else if (consecutive === 2 && blocked === 0) score += 50;
    });

    // 상대방 방어 점수
    directions.forEach(([dx, dy]) => {
      let consecutive = 0;
      let blocked = 0;
      let space = false;

      [1, -1].forEach(multiplier => {
        for (let i = 1; i <= 4; i++) {
          const newRow = row + dx * i * multiplier;
          const newCol = col + dy * i * multiplier;
          
          if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
            if (!space) blocked++;
            break;
          }

          const cell = board[newRow][newCol];
          if (cell === playerColor) consecutive++;
          else if (cell === 0) {
            space = true;
            break;
          } else {
            if (!space) blocked++;
            break;
          }
        }
      });

      if (consecutive >= 4) score += 9000;
      else if (consecutive === 3 && blocked === 0) score += 800;
      else if (consecutive === 3 && blocked === 1) score += 80;
      else if (consecutive === 2 && blocked === 0) score += 40;
    });

    return score;
  };

  const makeComputerMove = () => {
    if (winner || !gameStarted) return;

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
      const [row, col] = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      const newBoard = board.map(row => [...row]);
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

  const handleCellClick = (row: number, col: number) => {
    if (board[row][col] !== 0 || winner) return;
    if (gameMode === 'pvc' && currentPlayer !== playerColor) return;

    const newBoard = board.map(row => [...row]);
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
  };

  return (
    <div className="flex flex-col items-center p-1 sm:p-2 md:p-4 min-h-screen">
      {/* 게임 상태 및 메뉴 */}
      <div className="w-full max-w-md flex flex-col items-center gap-1 sm:gap-2 mb-2 sm:mb-4">
        {/* 승리 카운트 */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 w-full">
          <div className="text-sm sm:text-lg">
            ⚫ 흑돌 승: {winCounts.black}
          </div>
          <div className="text-sm sm:text-lg">
            ⚪ 백돌 승: {winCounts.white}
          </div>
        </div>

        {/* 게임 모드 선택 */}
        <div className="flex flex-wrap justify-center gap-1 sm:gap-2 w-full">
          <button
            onClick={() => {
              setGameMode('pvp');
              setShowColorSelect(false);
              initializeBoard();
            }}
            className={`px-2 sm:px-4 py-1 sm:py-2 rounded text-sm sm:text-base flex-1 min-w-[100px] sm:min-w-[120px] max-w-[180px] sm:max-w-[200px] ${
              gameMode === 'pvp' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            2인 플레이
          </button>
          <button
            onClick={() => setShowColorSelect(true)}
            className={`px-2 sm:px-4 py-1 sm:py-2 rounded text-sm sm:text-base flex-1 min-w-[100px] sm:min-w-[120px] max-w-[180px] sm:max-w-[200px] ${
              gameMode === 'pvc' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            컴퓨터와 대결
          </button>
        </div>

        {/* 돌 색상 선택 */}
        {showColorSelect && (
          <div className="flex flex-wrap justify-center gap-1 sm:gap-2 w-full">
            <button
              onClick={() => startGameWithColor(1)}
              className="px-2 sm:px-4 py-1 sm:py-2 bg-gray-800 text-white rounded text-sm sm:text-base flex-1 min-w-[100px] sm:min-w-[120px] max-w-[180px] sm:max-w-[200px]"
            >
              흑돌 선택 (선공)
            </button>
            <button
              onClick={() => startGameWithColor(2)}
              className="px-2 sm:px-4 py-1 sm:py-2 bg-gray-200 text-gray-800 rounded text-sm sm:text-base flex-1 min-w-[100px] sm:min-w-[120px] max-w-[180px] sm:max-w-[200px]"
            >
              백돌 선택 (후공)
            </button>
          </div>
        )}
        
        {/* 현재 상태 */}
        <div className="text-sm sm:text-lg font-bold text-center">
          {winner 
            ? `${winner === 1 ? '⚫ 흑돌' : '⚪ 백돌'} 승리!` 
            : `현재 차례: ${currentPlayer === 1 ? '⚫ 흑돌' : '⚪ 백돌'}`}
        </div>
        
        {/* 새 게임 버튼 */}
        <button
          onClick={initializeBoard}
          className="px-4 sm:px-6 py-1 sm:py-2 text-white bg-blue-500 rounded hover:bg-blue-600 text-sm sm:text-base"
        >
          새 게임
        </button>
      </div>

      {/* 오목판 */}
      <div className="relative bg-amber-100 p-2 sm:p-4 rounded-lg shadow-lg flex-1 flex items-center justify-center">
        <div 
          className="relative"
          style={{
            width: 'min(90vw, 85vh, 600px)',
            height: 'min(90vw, 85vh, 600px)',
          }}
        >
          {/* 바둑판 배경 */}
          <div className="absolute inset-0 border-2 border-black bg-[#DEB887]" />
          
          {/* 바둑판 격자 */}
          <div className="absolute inset-[5%]">
            {/* 세로선 */}
            {Array.from({ length: boardSize }).map((_, i) => (
              <div
                key={`vertical-${i}`}
                className="absolute bg-black"
                style={{
                  left: `${(i / (boardSize - 1)) * 100}%`,
                  top: '0',
                  width: '1px',
                  height: '100%',
                }}
              />
            ))}
            {/* 가로선 */}
            {Array.from({ length: boardSize }).map((_, i) => (
              <div
                key={`horizontal-${i}`}
                className="absolute bg-black"
                style={{
                  top: `${(i / (boardSize - 1)) * 100}%`,
                  left: '0',
                  height: '1px',
                  width: '100%',
                }}
              />
            ))}
          </div>

          {/* 돌 놓는 위치 */}
          <div className="absolute inset-[5%]">
            {board.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`}>
                {row.map((cell, colIndex) => {
                  const x = `${(colIndex / (boardSize - 1)) * 100}%`;
                  const y = `${(rowIndex / (boardSize - 1)) * 100}%`;
                  
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      className="absolute cursor-pointer"
                      style={{
                        left: x,
                        top: y,
                        width: 'clamp(16px, 4vw, 20px)',
                        height: 'clamp(16px, 4vw, 20px)',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                      }}
                    >
                      {cell !== 0 && (
                        <div
                          className={`
                            absolute
                            rounded-full
                            ${cell === 1 ? 'bg-black' : 'bg-white border border-black'}
                            shadow-md
                          `}
                          style={{
                            width: '100%',
                            height: '100%',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 클릭 영역 */}
          <div className="absolute inset-[5%]">
            {Array.from({ length: boardSize }).map((_, rowIndex) => (
              Array.from({ length: boardSize }).map((_, colIndex) => (
                <div
                  key={`click-${rowIndex}-${colIndex}`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  className="absolute cursor-pointer"
                  style={{
                    left: `${(colIndex / (boardSize - 1)) * 100}%`,
                    top: `${(rowIndex / (boardSize - 1)) * 100}%`,
                    width: 'clamp(20px, 5vw, 24px)',
                    height: 'clamp(20px, 5vw, 24px)',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gomoku; 