import React from 'react';
import Link from 'next/link';
import { blogPostsData } from '@/lib/seo-data';
import JsonLd from '@/components/seo/JsonLd';
import Breadcrumbs from '@/components/seo/Breadcrumbs';

export const revalidate = 86400; // Caching / ISR: revalidate once a day

export const metadata = {
  title: "Blog — Insights on AI Workspaces & Handovers",
  description: "Factual guides, strategic deep dives, and comparisons on building the future of autonomous organizational memory."
};

export default function BlogIndexPage() {
  const posts = Object.values(blogPostsData);
  const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus-ai.com';

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Nexus AI Blog",
    "description": "Guides, case studies, and engineering logs about AI workspaces and handovers.",
    "url": `${domain}/blog`,
    "publisher": {
      "@type": "Organization",
      "name": "Nexus AI, Inc."
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfb] dark:bg-[#121212] text-foreground py-12 px-6">
      <JsonLd data={collectionSchema} />
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[{ label: 'Blog', href: '/blog' }]} />
        
        <header className="mb-12 border-b border-border pb-8">
          <h1 className="font-serif text-4xl font-semibold mb-4 tracking-tight">
            The Nexus AI Blog
          </h1>
          <p className="text-muted-foreground font-serif italic text-lg">
            Articles, comparison matrices, and guides designed for organizational knowledge preservation.
          </p>
        </header>

        <div className="space-y-8">
          {posts.map((post) => (
            <article key={post.slug} className="group border border-border bg-card hover:bg-muted/10 p-6 rounded-lg transition-all duration-200">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest block mb-2 font-sans">
                Guides & Resources
              </span>
              <h2 className="font-serif text-2xl font-semibold mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                <Link href={`/blog/${post.slug}`}>
                  {post.title}
                </Link>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {post.description}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground/60 font-sans uppercase tracking-wider">
                <span>{post.publishDate}</span>
                <span className="font-semibold text-amber-600 dark:text-amber-500 group-hover:underline">
                  Read article →
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
