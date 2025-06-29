'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';

// Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';

type GameMenu = {
  name: string;
  path: string;
  description: string;
  mobileHidden?: boolean;
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
    description: '적 우주선을 물리치세요!',
    mobileHidden: true
  },
  {
    name: '오목',
    path: '/games/gomoku',
    description: '5개의 돌을 연속으로 놓아 승리하세요!'
  },
  // 추후 다른 게임들을 여기에 추가할 수 있습니다
];

const GameNavigation = () => {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const visibleGames = games.filter(game => !isMobile || !game.mobileHidden);

  return (
    <div className="w-full bg-gray-900 text-white py-6">
      <h1 className="text-2xl font-bold text-center mb-6">미니게임 모음</h1>
      <div className="max-w-lg mx-auto px-4">
        <Swiper
          modules={[Pagination]}
          spaceBetween={20}
          slidesPerView={1}
          pagination={{ clickable: true }}
          className="game-swiper"
          loop={true}
        >
          {visibleGames.map((game) => (
            <SwiperSlide key={game.path}>
              <Link
                href={game.path}
                className={`
                  block rounded-lg transition-all
                  ${pathname === game.path 
                    ? 'bg-blue-600' 
                    : 'bg-gray-800 hover:bg-gray-700'}
                `}
              >
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-2">{game.name}</h2>
                  <p className="text-gray-300 text-sm mb-4">{game.description}</p>
                  <div className="text-sm text-blue-300">
                    {pathname === game.path ? '현재 플레이 중' : '시작하기 →'}
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default GameNavigation; 