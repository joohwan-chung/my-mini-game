import { redirect } from 'next/navigation';

export const metadata = {
  title: '미니게임 모음',
  description: '다양한 미니게임을 즐길 수 있는 웹 애플리케이션입니다.',
};

export default function Home() {
  redirect('/games/2048');
} 