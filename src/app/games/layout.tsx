'use client'

import GameNavigation from '@/components/GameNavigation';
import { useCallback, useEffect } from 'react';

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const handleTouchMove = useCallback((e: TouchEvent) => {
    // 스크롤이 맨 위에 있고 아래로 당기는 경우에만 새로고침 제스처 방지
    if (window.scrollY === 0 && e instanceof TouchEvent && e.touches[0].clientY > 100) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleTouchMove]);

  return (
    <div className="min-h-screen bg-background p-8">
      <GameNavigation />
      <main className="container mx-auto overflow-visible">
        {children}
      </main>
    </div>
  );
} 