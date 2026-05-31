import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { WorkspaceProvider } from "@/lib/store";
import { AppLayout } from "@/components/layout/app-layout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexus AI — Your Intelligent Workspace",
  description: "AI-powered workspace for documents, tasks, calendar, email, and collaboration. Your AI Chief of Staff.",
  keywords: ["workspace", "AI", "productivity", "documents", "tasks", "notion alternative"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen flex flex-col font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <WorkspaceProvider>
            <TooltipProvider>
              <AppLayout>
                {children}
              </AppLayout>
              <Toaster />
            </TooltipProvider>
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
