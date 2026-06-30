import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Integrations Hub',
  description: 'Manage and connect third-party Slack, GitHub, Notion and Jira workspaces with Nexus AI.',
};

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-background"><span className="text-xs text-muted-foreground animate-pulse">Loading Integrations...</span></div>}>
      {children}
    </Suspense>
  );
}
