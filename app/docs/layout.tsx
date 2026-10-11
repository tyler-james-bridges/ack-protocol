import { Nav } from '@/components/nav';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      {children}
    </div>
  );
}
