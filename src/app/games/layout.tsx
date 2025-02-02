import GameNavigation from '@/components/GameNavigation';

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background p-8">
      <GameNavigation />
      <main className="container mx-auto">
        {children}
      </main>
    </div>
  );
} 