import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus-ai.com';
  
  return {
    rules: [
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'PerplexityBot'],
        allow: '/',
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/settings/', '/crm/contacts/private/'],
      }
    ],
    sitemap: `${domain}/sitemap.xml`,
  };
}
