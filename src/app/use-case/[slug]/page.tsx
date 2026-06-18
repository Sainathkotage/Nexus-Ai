import React from 'react';
import { notFound } from 'next/navigation';
import { useCasesData } from '@/lib/seo-data';
import JsonLd from '@/components/seo/JsonLd';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import GeoTldr from '@/components/seo/GeoTldr';

interface UseCasePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return Object.keys(useCasesData).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: UseCasePageProps) {
  const resolvedParams = await params;
  const useCase = useCasesData[resolvedParams.slug];
  
  if (!useCase) {
    return {};
  }

  const title = `AI Workspace for ${useCase.name} — Nexus AI`;
  const description = `Discover how Nexus AI acts as an AI Chief of Staff and permanent company memory for ${useCase.industry} teams, automating workflows and handovers.`;

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

export default async function UseCasePage({ params }: UseCasePageProps) {
  const resolvedParams = await params;
  const useCase = useCasesData[resolvedParams.slug];
  
  if (!useCase) {
    notFound();
  }

  const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus-ai.com';

  // WebPage structured JSON-LD
  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `AI Workspace for ${useCase.name}`,
    "description": `Custom AI workflow automation and context management for the ${useCase.industry} sector.`,
    "url": `${domain}/use-case/${useCase.slug}`
  };

  // Product structured JSON-LD
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `Nexus AI for ${useCase.name}`,
    "brand": {
      "@type": "Brand",
      "name": "Nexus AI"
    }
  };

  const tldr = `Nexus AI provides an active company operating system customized for ${useCase.name}. By unifying emails, documents, calendars, and tasks into a single semantic workspace, Nexus AI eliminates context-switching latency and automates employee offboarding handovers.`;
  
  const takeaways = [
    `Explicitly optimized for ${useCase.industry} workflows, connecting communication channels directly to active tasks.`,
    "Automates project summaries, decision logs, and client relationship maps in real time.",
    "Ensures secure, SOC 2 Type II compliant isolated database storage to protect company IP."
  ];

  return (
    <div className="min-h-screen bg-[#fcfcfb] dark:bg-[#121212] text-foreground py-12 px-6">
      <JsonLd data={[webpageSchema, productSchema]} />
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs 
          items={[
            { label: 'Solutions', href: '/use-case/startups' },
            { label: useCase.name, href: `/use-case/${useCase.slug}` }
          ]} 
        />

        <article className="border border-border bg-card p-8 md:p-12 rounded-lg shadow-sm">
          <header className="mb-8 border-b border-border pb-6">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest block mb-2 font-sans">
              Industry Verticals
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-4 leading-tight">
              Nexus AI Workspace for {useCase.name}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tailoring active AI Chiefs of Staff to resolve information silos and context loss in the {useCase.industry} space.
            </p>
          </header>

          {/* GEO Summary card */}
          <GeoTldr tldr={tldr} takeaways={takeaways} />

          {/* Core Pain Points & Solutions */}
          <h2 className="font-serif text-2xl font-semibold mt-10 mb-4 border-b border-border pb-2">
            Key Operational Challenges Resolved
          </h2>
          <div className="grid md:grid-cols-2 gap-6 my-6">
            <div className="bg-rose-500/5 dark:bg-rose-500/10 rounded-lg border border-rose-500/20 p-5 shadow-sm">
              <h4 className="text-xs font-bold text-rose-700 dark:text-rose-500 uppercase tracking-widest mb-3 font-sans">
                Industry Pain Points
              </h4>
              <ul className="space-y-2 list-disc pl-4 text-xs text-muted-foreground font-sans">
                {useCase.painPoints.map((pain, idx) => (
                  <li key={idx}>{pain}</li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 rounded-lg border border-emerald-500/20 p-5 shadow-sm">
              <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest mb-3 font-sans">
                Nexus AI Solutions
              </h4>
              <ul className="space-y-2 list-disc pl-4 text-xs text-muted-foreground font-sans">
                {useCase.solutions.map((sol, idx) => (
                  <li key={idx}>{sol}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Target Features */}
          <h2 className="font-serif text-2xl font-semibold mt-10 mb-4 border-b border-border pb-2">
            Target Platform Features
          </h2>
          <ul className="space-y-2 list-disc pl-6 my-6 text-sm text-muted-foreground">
            {useCase.features.map((feat, idx) => (
              <li key={idx} className="font-sans">
                {feat}
              </li>
            ))}
          </ul>

          {/* Factual Case Study widget */}
          <h2 className="font-serif text-2xl font-semibold mt-10 mb-4 border-b border-border pb-2">
            Case Study: {useCase.caseStudy.company}
          </h2>
          <div className="bg-muted/30 border border-border p-6 rounded-lg my-4 relative overflow-hidden">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">
              Verified Metric
            </div>
            <div className="text-2xl font-serif font-semibold text-foreground mb-3">
              {useCase.caseStudy.metrics}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {useCase.caseStudy.description}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
