'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';

type Board = number[][];

// colors 객체의 타입 정의
type ColorMap = {
  [key: number]: string;
};

// 컴포넌트 외부로 이동
const findEmptyCells = (board: Board): [number, number][] => {
  const emptyCells: [number, number][] = [];
  board.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell === 0) emptyCells.push([i, j]);
    });
  });
  return emptyCells;
};

// 컴포넌트 외부로 이동
const addNewNumber = (board: Board): Board => {
  const newBoard = [...board.map(row => [...row])];
  const emptyCells = findEmptyCells(newBoard);
  
  if (emptyCells.length === 0) return newBoard;

  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  newBoard[row][col] = Math.random() < 0.9 ? 2 : 4;
  
  return newBoard;
};

const Game2048 = () => {
  const [board, setBoard] = useState<Board>(() => {
    const initialBoard = Array(4).fill(0).map(() => Array(4).fill(0));
    return addNewNumber(addNewNumber(initialBoard));
  });
  const [score, setScore] = useState<number>(0);
  const [touchStart, setTouchStart] = useState<[number, number] | null>(null);
  const [mouseStart, setMouseStart] = useState<[number, number] | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const colors: ColorMap = {
    2: 'bg-[#eee4da]',
    4: 'bg-[#ede0c8]',
    8: 'bg-[#f2b179]',
    16: 'bg-[#f59563]',
    32: 'bg-[#f67c5f]',
    64: 'bg-[#f65e3b]',
    128: 'bg-[#edcf72]',
    256: 'bg-[#edcc61]',
    512: 'bg-[#edc850]',
    1024: 'bg-[#edc53f]',
    2048: 'bg-[#edc22e]'
  };

  const getColor = (value: number): string => {
    return colors[value] || 'bg-gray-200';
  };

  const getTextColor = (value: number) => {
    return value <= 4 ? 'text-gray-700' : 'text-white';
  };

  // 행을 왼쪽으로 병합
  const mergeRow = (row: number[]): [number[], number] => {
    // 0을 제거하고 실제 숫자만 배열로 만듦
    let newRow = row.filter(cell => cell !== 0);
    let addedScore = 0;
    let i = 0;
    
    // 병합 로직 개선
    while (i < newRow.length - 1) {
      if (newRow[i] === newRow[i + 1]) {
        newRow[i] *= 2;
        addedScore += newRow[i];
        newRow.splice(i + 1, 1);
      }
      i++;
    }
    
    // 배열 길이를 4로 맞추기 (빈 칸은 0으로 채움)
    while (newRow.length < 4) {
      newRow.push(0);
    }
    
    return [newRow, addedScore];
  };

  // 보드 회전
  const rotateBoard = (board: Board, times: number = 1): Board => {
    let newBoard = [...board.map(row => [...row])];
    for (let t = 0; t < times; t++) {
      const rotated: Board = Array(4).fill(0).map(() => Array(4).fill(0));
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          rotated[i][j] = newBoard[3 - j][i];
        }
      }
      newBoard = rotated;
    }
    return newBoard;
  };

  // 이동 처리 개선
  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (isAnimating) return;
    setIsAnimating(true);

    const rotations = {
      up: 1,
      right: 2,
      down: 3,
      left: 0
    };

    // 보드를 해당 방향에 맞게 회전
    let newBoard = rotateBoard(board, rotations[direction]);
    let totalScore = 0;
    let hasChanged = false;

    // 각 행에 대해 병합 처리
    const mergedBoard = newBoard.map(row => {
      const [newRow, addedScore] = mergeRow([...row]);
      totalScore += addedScore;
      
      // 변화가 있었는지 확인
      if (row.some((val, idx) => val !== newRow[idx])) {
        hasChanged = true;
      }
      return newRow;
    });

    // 원래 방향으로 되돌리기
    newBoard = rotateBoard(mergedBoard, (4 - rotations[direction]) % 4);

    if (hasChanged) {
      // 상태 업데이트를 한 번에 처리
      setBoard(prevBoard => {
        const boardWithNewNumber = addNewNumber(newBoard);
        return boardWithNewNumber;
      });
      setScore(prev => prev + totalScore);
    }

    // 애니메이션 상태 리셋
    setTimeout(() => {
      setIsAnimating(false);
    }, 150);
  }, [board, isAnimating]);

  // 키 타입 정의
  type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
  type Direction = 'up' | 'down' | 'left' | 'right';

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<ArrowKey, Direction> = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
      };
      
      if (e.key in keyMap) {
        e.preventDefault();
        move(keyMap[e.key as ArrowKey]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // 터치 이벤트 처리
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart([touch.clientX, touch.clientY]);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart[0];
    const deltaY = touch.clientY - touchStart[1];
    
    if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) return;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      move(deltaX > 0 ? 'right' : 'left');
    } else {
      move(deltaY > 0 ? 'down' : 'up');
    }
    
    setTouchStart(null);
  };

  // 마우스 이벤트 처리 추가
  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseStart([e.clientX, e.clientY]);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!mouseStart) return;
    
    const deltaX = e.clientX - mouseStart[0];
    const deltaY = e.clientY - mouseStart[1];
    
    if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) return;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      move(deltaX > 0 ? 'right' : 'left');
    } else {
      move(deltaY > 0 ? 'down' : 'up');
    }
    
    setMouseStart(null);
  };

  const handleMouseLeave = () => {
    setMouseStart(null);
  };

  return (
    <div 
      className="flex flex-col items-center justify-center w-full max-w-md mx-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      ref={boardRef}
    >
      <div className="mb-4">
        <h1 className="text-4xl font-bold mb-2">2048</h1>
        <div className="text-xl">점수: {score}</div>
      </div>
      
      <div className="bg-gray-300 p-4 rounded-lg">
        {board.map((row, rowIndex) => (
          <div 
            key={`row-${rowIndex}-${row.join('-')}`} 
            className="flex"
          >
            {row.map((cell, colIndex) => (
              <div
                key={`cell-${rowIndex}-${colIndex}-${cell}`}
                className={`
                  w-16 h-16 m-1 flex items-center justify-center
                  rounded-lg text-2xl font-bold
                  ${getColor(cell)} ${getTextColor(cell)}
                  transform transition-all duration-150 ease-in-out
                  ${isAnimating ? 'scale-95' : 'scale-100'}
                `}
              >
                {cell !== 0 && cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Game2048; 