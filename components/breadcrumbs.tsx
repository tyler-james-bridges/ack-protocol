import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export function Breadcrumbs({
  items,
  current,
}: {
  items: BreadcrumbItem[];
  current: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-foreground">{current}</span>
        </li>
      </ol>
    </nav>
  );
}
