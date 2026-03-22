import Link from 'next/link';
import { Nav } from '@/components/nav';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="mx-auto max-w-md px-4 pt-24 text-center">
        <h1 className="text-6xl font-bold font-mono text-black/20">404</h1>
        <p className="mt-4 text-lg font-mono text-black/50">Page not found.</p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-mono uppercase tracking-wider text-black hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
