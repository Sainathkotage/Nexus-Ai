import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { LogoCloud } from './components/LogoCloud';
import { Features } from './components/Features';
import { AIChief } from './components/AIChief';
import { Pricing } from './components/Pricing';
import { FAQ, FinalCTA } from './components/FAQAndCTA';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-cream-100 text-ink-900 antialiased selection:bg-accent-500/20 paper-texture paper-vignette relative overflow-hidden">
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <LogoCloud />
        <Features />
        <AIChief />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
