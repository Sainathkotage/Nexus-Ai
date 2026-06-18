import { MetadataRoute } from 'next';
import { competitorsData, useCasesData, blogPostsData } from '@/lib/seo-data';

export default function sitemap(): MetadataRoute.Sitemap {
  const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus-ai.com';
  const currentDate = new Date();

  // 1. Static base pages
  const staticPages = [
    {
      url: `${domain}`,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${domain}/blog`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }
  ];

  // 2. Dynamic Blog posts
  const blogUrls = Object.keys(blogPostsData).map((slug) => ({
    url: `${domain}/blog/${slug}`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // 3. Dynamic Comparison pages
  const competitorUrls = Object.keys(competitorsData).map((slug) => ({
    url: `${domain}/compare/${slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 4. Dynamic Use Case / Industry pages
  const useCaseUrls = Object.keys(useCasesData).map((slug) => ({
    url: `${domain}/use-case/${slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...blogUrls, ...competitorUrls, ...useCaseUrls];
}
