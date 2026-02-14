import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PanelRight, PanelRightClose } from "lucide-react";
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

const Studio = () => {
  const { currentProject, createProject } = useProjectStore();
  const { isPaid, requiredAmount, setIsPaid } = usePaymentStore();
  const { theme } = useSettingsStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(isPaid);

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

  const currentPhase = currentProject?.currentPhase || "config";
  const lang = currentProject?.config?.language || 'uz';

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
          requiredAmount={requiredAmount || 35000}
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

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <StudioSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <StudioHeader onCommandPalette={() => setCommandPaletteOpen(true)} />

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main workspace */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
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
            <div className="absolute top-20 right-4 z-10">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setContextPanelOpen(!contextPanelOpen)}
                className="bg-card/80 backdrop-blur-md"
              >
                {contextPanelOpen ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRight className="w-4 h-4" />
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
