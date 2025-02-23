'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type GameMenu = {
  name: string;
  path: string;
  description: string;
};

const games: GameMenu[] = [
  {
    name: '2048',
    path: '/games/2048',
    description: '숫자를 합쳐 2048을 만드세요!'
  },
  {
    name: '갤러그',
    path: '/games/galaga',
    description: '적 우주선을 물리치세요!'
  },
  // 추후 다른 게임들을 여기에 추가할 수 있습니다
];

const GameNavigation = () => {
  const pathname = usePathname();

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <h1 className="text-3xl font-bold mb-6 text-center">미니게임 모음</h1>
      <nav className="flex flex-wrap gap-4 justify-center">
        {games.map((game) => (
          <Link
            key={game.path}
            href={game.path}
            className={`
              relative px-6 py-3 rounded-lg transition-all
              hover:bg-gray-100 dark:hover:bg-gray-800
              ${pathname === game.path 
                ? 'bg-gray-200 dark:bg-gray-700' 
                : 'bg-white dark:bg-gray-900'}
              group
            `}
          >
            <div className="font-semibold">{game.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {game.description}
            </div>
            <div className="absolute inset-0 rounded-lg ring-2 ring-transparent group-hover:ring-gray-300 dark:group-hover:ring-gray-600 transition-all" />
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default GameNavigation; 