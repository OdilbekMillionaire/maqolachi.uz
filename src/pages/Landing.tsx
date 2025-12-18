import { useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Templates } from "@/components/landing/Templates";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { useSettingsStore } from "@/store/settingsStore";

const Landing = () => {
  const { theme } = useSettingsStore();
  
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);
  
  return (
    <div className="min-h-screen bg-background">
      <WelcomeOverlay />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Templates />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
