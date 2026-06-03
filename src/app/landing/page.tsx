'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
// import { LogoCloud } from '@/components/landing/LogoCloud';
import { Features } from '@/components/landing/Features';
import { AIChief } from '@/components/landing/AIChief';
import { Pricing } from '@/components/landing/Pricing';
import { FAQ, FinalCTA } from '@/components/landing/FAQAndCTA';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  const router = useRouter();

  const handleStart = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    router.push('/?auth=signup');
  };

  const handleSignIn = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    router.push('/?auth=signin');
  };

  const handleBookDemo = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    router.push('/?auth=signup');
  };

  return (
    <div className="min-h-screen bg-cream-100 text-ink-900 antialiased selection:bg-accent-500/20 paper-texture paper-vignette relative overflow-hidden">
      <Navbar onStart={handleStart} onSignIn={handleSignIn} />
      <main className="relative z-10">
        <Hero onStart={handleStart} />
        <LogoCloud />
        <Features />
        <AIChief />
        <Pricing onStart={handleStart} onBookDemo={handleBookDemo} />
        <FAQ />
        <FinalCTA onStart={handleStart} onBookDemo={handleBookDemo} />
      </main>
      <Footer />
    </div>
  );
}
