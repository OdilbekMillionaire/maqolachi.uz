import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { PanelRight, PanelRightClose, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { ConfigPhase } from "@/components/studio/ConfigPhase";
import { SkeletonPhase } from "@/components/studio/SkeletonPhase";
import { WritePhase } from "@/components/studio/WritePhase";
import { CommandPalette } from "@/components/studio/CommandPalette";
import { ContextPanel } from "@/components/studio/ContextPanel";
import { PaymentGate } from "@/components/studio/PaymentGate";
import { useProjectStore } from "@/store/projectStore";
import { usePaymentStore } from "@/store/paymentStore";
import { useSettingsStore } from "@/store/settingsStore";
import { calculatePrice, formatPrice, type PricingFactors } from "@/lib/pricing";

const Studio = () => {
  const { currentProject, createProject } = useProjectStore();
  const { isPaid, requiredAmount, setIsPaid } = usePaymentStore();
  const { theme, humanizeContent } = useSettingsStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(isPaid);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Initialize project if none exists
  useEffect(() => {
    if (!currentProject) {
      createProject();
    }
  }, [currentProject, createProject]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const config = currentProject?.config;
  const currentPhase = currentProject?.currentPhase || "config";
  const lang = config?.language || 'uz';

  // Calculate price for top bar
  const priceTotal = useMemo(() => {
    const factors: PricingFactors = {
      academicLevel: config?.academicLevel || 'bachelor',
      domain: config?.domain || 'other',
      humanize: humanizeContent,
      modelMode: config?.modelMode || 'fast',
      styleMode: config?.styleMode || 'formal',
      citationStyle: config?.citationStyle || 'apa',
      sectionCount: currentProject?.sections?.length || 7,
    };
    return calculatePrice(factors).total;
  }, [config, humanizeContent, currentProject?.sections?.length]);

  // Payment gate: show before write phase if not paid
  const showPaymentGate = currentPhase === "write" && !paymentCompleted;

  const handlePaymentVerified = () => {
    setPaymentCompleted(true);
    setIsPaid(true);
  };

  const renderPhase = () => {
    if (showPaymentGate) {
      return (
        <PaymentGate
          requiredAmount={requiredAmount || 25000}
          language={lang}
          onVerified={handlePaymentVerified}
        />
      );
    }

    switch (currentPhase) {
      case "config":
        return <ConfigPhase />;
      case "skeleton":
        return <SkeletonPhase />;
      case "write":
        return <WritePhase />;
      default:
        return <ConfigPhase />;
    }
  };

  const phaseLabels: Record<string, Record<string, string>> = {
    config: { uz: "Konfiguratsiya", en: "Configuration", ru: "Конфигурация" },
    skeleton: { uz: "Struktura", en: "Structure", ru: "Структура" },
    write: { uz: "Yozish", en: "Writing", ru: "Написание" },
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar - hidden on very small screens */}
      <div className="hidden sm:block">
        <StudioSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Persistent Price Bar */}
        <div className="h-10 sm:h-11 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20 px-3 sm:px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            <span className="text-muted-foreground hidden sm:inline">
              {phaseLabels[currentPhase]?.[lang] || currentPhase}
            </span>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-1">
                {(['config', 'skeleton', 'write'] as const).map((phase) => (
                  <div
                    key={phase}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      phase === currentPhase ? 'bg-primary' :
                      (['config', 'skeleton', 'write'].indexOf(phase) < ['config', 'skeleton', 'write'].indexOf(currentPhase)) ? 'bg-primary/40' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {lang === 'uz' ? "Narx:" : lang === 'ru' ? 'Цена:' : 'Price:'}
            </span>
            <span className="text-sm sm:text-base font-bold text-primary">
              {formatPrice(priceTotal)}
            </span>
          </div>
        </div>

        {/* Header */}
        <StudioHeader onCommandPalette={() => setCommandPaletteOpen(true)} />

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main workspace */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
            <motion.div
              key={showPaymentGate ? 'payment' : currentPhase}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderPhase()}
            </motion.div>
          </main>

          {/* Context panel toggle */}
          {!showPaymentGate && (
            <div className="absolute top-24 sm:top-28 right-2 sm:right-4 z-10">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setContextPanelOpen(!contextPanelOpen)}
                className="bg-card/80 backdrop-blur-md w-8 h-8 sm:w-10 sm:h-10"
              >
                {contextPanelOpen ? (
                  <PanelRightClose className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <PanelRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </Button>
            </div>
          )}

          {/* Context panel */}
          <ContextPanel
            isOpen={contextPanelOpen && !showPaymentGate}
            onClose={() => setContextPanelOpen(false)}
          />
        </div>
      </div>

      {/* Command palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
};

export default Studio;
