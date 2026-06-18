import React from 'react';
import { notFound } from 'next/navigation';
import { blogPostsData } from '@/lib/seo-data';
import JsonLd from '@/components/seo/JsonLd';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import GeoTldr from '@/components/seo/GeoTldr';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return Object.keys(blogPostsData).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const resolvedParams = await params;
  const post = blogPostsData[resolvedParams.slug];
  
  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: new Date(post.publishDate).toISOString(),
      authors: ['Nexus Editorial Team']
    }
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const resolvedParams = await params;
  const post = blogPostsData[resolvedParams.slug];
  
  if (!post) {
    notFound();
  }

  const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus-ai.com';

  // Article structured JSON-LD
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "datePublished": new Date(post.publishDate).toISOString(),
    "author": {
      "@type": "Organization",
      "name": "Nexus AI"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Nexus AI, Inc.",
      "logo": {
        "@type": "ImageObject",
        "url": `${domain}/logo.png`
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfb] dark:bg-[#121212] text-foreground py-12 px-6">
      <JsonLd data={articleSchema} />
      <div className="max-w-3xl mx-auto">
        <Breadcrumbs 
          items={[
            { label: 'Blog', href: '/blog' },
            { label: post.title, href: `/blog/${post.slug}` }
          ]} 
        />

        <article className="border border-border bg-card p-8 md:p-12 rounded-lg shadow-sm">
          <header className="mb-8 border-b border-border pb-6">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest block mb-2 font-sans">
              Nexus AI Resources
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-4 leading-tight">
              {post.title}
            </h1>
            <div className="text-xs text-muted-foreground/60 font-sans uppercase tracking-wider">
              Published: {post.publishDate}
            </div>
          </header>

          {/* GEO Summary component */}
          <GeoTldr tldr={post.tldr} takeaways={post.takeaways} />

          {/* Render article body */}
          <div 
            className="prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-6 font-sans mt-8"
            dangerouslySetInnerHTML={{
              __html: formatMarkdownToHtml(post.content)
            }}
          />
        </article>
      </div>
    </div>
  );
}

// Simple helper to parse standard Markdown headings/lists/paragraphs to HTML
function formatMarkdownToHtml(md: string) {
  return md
    .replace(/^## (.*$)/gim, '<h2 class="font-serif text-2xl font-medium text-foreground mt-8 mb-4 border-b border-border pb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="font-serif text-3xl font-semibold text-foreground mt-10 mb-4">$1</h1>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .split('\n\n')
    .map(p => p.trim().startsWith('<h') || p.trim().startsWith('<li') ? p : `<p class="text-muted-foreground leading-relaxed">${p}</p>`)
    .join('\n');
}
