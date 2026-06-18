import React from 'react';
import Link from 'next/link';
import JsonLd from './JsonLd';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus-ai.com';

  // Generate BreadcrumbList Schema.org JSON-LD
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": item.label,
      "item": item.href.startsWith('http') ? item.href : `${domain}${item.href}`
    }))
  };

  return (
    <>
      <JsonLd data={schema} />
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest font-sans">
        <Link href="/" className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors">
          Home
        </Link>
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            <span className="text-muted-foreground/40 font-normal">/</span>
            {idx === items.length - 1 ? (
              <span className="text-foreground truncate max-w-[200px]" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors truncate max-w-[150px]">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>
    </>
  );
}
