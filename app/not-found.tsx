import Link from 'next/link';
import { Nav } from '@/components/nav';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <div className="mx-auto max-w-md px-4 pt-24 text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">Page not found.</p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-foreground hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
