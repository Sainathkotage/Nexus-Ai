import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { WorkspaceProvider } from "@/lib/store";
import { TutorialProvider } from "@/lib/tutorial-context";
import { PopupProvider } from "@/lib/popup-context";
import { AppLayout } from "@/components/layout/app-layout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";

import { Suspense } from "react";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus-ai.com'),
  title: {
    default: "Nexus AI — Your Intelligent Workspace",
    template: "%s | Nexus AI"
  },
  description: "AI-powered workspace for documents, tasks, calendar, email, and collaboration. Your AI Chief of Staff.",
  keywords: ["workspace", "AI Chief of Staff", "Organizational Memory", "employee handover", "productivity", "documents", "tasks", "notion alternative"],
  alternates: {
    canonical: './'
  },
  openGraph: {
    title: "Nexus AI — Your Intelligent Workspace",
    description: "Unify documents, tasks, calendar, email, and CRM. Your active AI Chief of Staff.",
    url: 'https://nexus-ai.com',
    siteName: 'Nexus AI',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 600,
        alt: 'Nexus AI Logo'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexus AI — Your Intelligent Workspace',
    description: 'Your active AI Chief of Staff and Organizational Memory platform.',
    images: ['/logo.png'],
    creator: '@nexus_ai'
  }
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fraunces.variable} min-h-screen flex flex-col font-sans`}>
        {/* Google Analytics */}
        <GoogleAnalytics gaId="G-HP8QV5HP7B" />

        {/* Microsoft Clarity */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window,document,"clarity","script","clarity-id-123");
          `}
        </Script>

        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <WorkspaceProvider>
            <TutorialProvider>
              <PopupProvider>
                <TooltipProvider>
                  <Suspense fallback={<div className="min-h-screen w-full bg-[#f7f6f3] dark:bg-[#121212]" />}>
                    <AppLayout>
                      {children}
                    </AppLayout>
                  </Suspense>
                  <Toaster />
                </TooltipProvider>
              </PopupProvider>
            </TutorialProvider>
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

