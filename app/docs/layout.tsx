import { Nav } from '@/components/nav';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      {children}
    </div>
  );
}
