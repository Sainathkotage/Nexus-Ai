import { NextResponse } from 'next/server';
import { blogPostsData } from '@/lib/seo-data';

export async function GET() {
  const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus-ai.com';
  
  const rssItems = Object.values(blogPostsData).map((post) => {
    // Parse publishing date safely
    const pubDate = new Date(post.publishDate).toUTCString();
    return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${domain}/blog/${post.slug}</link>
      <guid>${domain}/blog/${post.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.description)}</description>
    </item>`;
  }).join('');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Nexus AI Blog</title>
    <link>${domain}/blog</link>
    <description>Guides, comparisons, and platform updates for Nexus AI.</description>
    <language>en-us</language>
    <atom:link href="${domain}/feed.xml" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

  return new NextResponse(rssFeed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=86400, stale-while-revalidate',
    },
  });
}

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
