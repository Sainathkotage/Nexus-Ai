import React from 'react';
import { notFound } from 'next/navigation';
import { competitorsData } from '@/lib/seo-data';
import JsonLd from '@/components/seo/JsonLd';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import GeoTldr from '@/components/seo/GeoTldr';
import ComparisonMatrix from '@/components/seo/ComparisonMatrix';

interface ComparePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return Object.keys(competitorsData).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ComparePageProps) {
  const resolvedParams = await params;
  const competitor = competitorsData[resolvedParams.slug];
  
  if (!competitor) {
    return {};
  }

  const title = `Nexus AI vs. ${competitor.name}: Manual Wiki vs. Active Workspace`;
  const description = `Compare Nexus AI and ${competitor.name}. Understand the differences in email, calendar, tasks, handovers, and workspace memory.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website'
    }
  };
}

export default async function ComparePage({ params }: ComparePageProps) {
  const resolvedParams = await params;
  const competitor = competitorsData[resolvedParams.slug];
  
  if (!competitor) {
    notFound();
  }

  const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus-ai.com';

  // Product structured JSON-LD
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Nexus AI Workspace",
    "description": "An active AI Chief of Staff and unified workspace.",
    "brand": {
      "@type": "Brand",
      "name": "Nexus AI"
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "USD",
      "price": "12.00",
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock"
    }
  };

  // FAQ structured JSON-LD
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": competitor.faqQuestion,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": competitor.faqAnswer
        }
      }
    ]
  };

  const tldr = `Comparing Nexus AI and ${competitor.name} reveals a distinct paradigm shift: while ${competitor.name} operates as a manual workspace requiring constant editing, Nexus AI serves as an active AI Chief of Staff automating daily briefings, task triages, and offboarding handovers.`;
  
  const takeaways = [
    `Nexus AI features native email and calendar integrations, while ${competitor.name} requires third-party plugins.`,
    "Nexus AI unifies task queues, shared documents, and inbox streams under a single contextual brain.",
    `Automated offboarding transitions on Nexus AI preserve permanent organizational memory, which is absent in ${competitor.name}.`
  ];

  return (
    <div className="min-h-screen bg-[#fcfcfb] dark:bg-[#121212] text-foreground py-12 px-6">
      <JsonLd data={[productSchema, faqSchema]} />
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs 
          items={[
            { label: 'Compare', href: '/compare/notion' },
            { label: `Nexus AI vs ${competitor.name}`, href: `/compare/${competitor.slug}` }
          ]} 
        />

        <article className="border border-border bg-card p-8 md:p-12 rounded-lg shadow-sm">
          <header className="mb-8 border-b border-border pb-6">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest block mb-2 font-sans">
              Alternative Comparisons
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-4 leading-tight">
              Nexus AI vs. {competitor.name}: Which Workspace Should Your Team Choose?
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Evaluating the structural differences, automation efficiencies, and data integrity parameters of active workspaces versus manual databases.
            </p>
          </header>

          {/* GEO Summary card */}
          <GeoTldr tldr={tldr} takeaways={takeaways} />

          {/* GEO Comparison Table widget */}
          <h2 className="font-serif text-2xl font-semibold mt-10 mb-4 border-b border-border pb-2">
            Side-by-Side Comparison
          </h2>
          <ComparisonMatrix competitor={competitor} />

          {/* Programmatic Migration Guide */}
          <h2 className="font-serif text-2xl font-semibold mt-10 mb-4 border-b border-border pb-2">
            Migration Guide: Moving from {competitor.name} to Nexus AI
          </h2>
          <p className="text-muted-foreground mb-4">
            Migrating your team from legacy platforms to Nexus AI is a simple, structured process that preserves historical databases, rel links, and comments:
          </p>
          <ol className="space-y-4 my-6 list-decimal pl-6">
            {competitor.migrationSteps.map((step, idx) => (
              <li key={idx} className="text-muted-foreground text-sm font-sans">
                {step}
              </li>
            ))}
          </ol>

          {/* FAQ Accordion */}
          <h2 className="font-serif text-2xl font-semibold mt-10 mb-4 border-b border-border pb-2">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="faq-q font-serif font-semibold text-amber-700 dark:text-amber-500 mt-4">
              Q: {competitor.faqQuestion}
            </div>
            <div className="faq-a border-l-2 border-amber-500/30 pl-4 text-muted-foreground leading-relaxed text-sm">
              A: {competitor.faqAnswer}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
