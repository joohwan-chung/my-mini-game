'use client'

import GameNavigation from '@/components/GameNavigation';
import { useCallback, useEffect } from 'react';

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const handleTouchMove = useCallback((e: TouchEvent) => {
    // 스크롤이 맨 위에 있을 때만 새로고침 제스처 방지
    if (window.scrollY === 0) {
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
    <div className="min-h-screen bg-background p-8 touch-pan-y">
      <GameNavigation />
      <main className="container mx-auto">
        {children}
      </main>
    </div>
  );
} 