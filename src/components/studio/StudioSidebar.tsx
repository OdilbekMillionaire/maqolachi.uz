import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Settings, 
  Download, 
  Share2, 
  History, 
  ChevronLeft,
  ChevronRight,
  Layers,
  FileText,
  Edit3,
  Check,
  Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useProjectStore, Phase, SectionStatus } from "@/store/projectStore";
import { cn } from "@/lib/utils";

interface StudioSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const phases: { id: Phase; label: string; icon: React.ElementType }[] = [
  { id: "config", label: "Konfiguratsiya", icon: Settings },
  { id: "skeleton", label: "Struktura", icon: Layers },
  { id: "write", label: "Yozish", icon: Edit3 },
];

const getStatusIcon = (status: SectionStatus) => {
  switch (status) {
    case "GENERATED":
      return <Check className="w-3 h-3 text-emerald-400" />;
    case "EDITED":
      return <Edit3 className="w-3 h-3 text-blue-400" />;
    case "DRAFT":
      return <Circle className="w-3 h-3 text-amber-400 fill-amber-400" />;
    default:
      return <Circle className="w-3 h-3 text-muted-foreground" />;
  }
};

export const StudioSidebar = ({ isCollapsed, onToggle }: StudioSidebarProps) => {
  const { currentProject, setPhase } = useProjectStore();
  
  const currentPhase = currentProject?.currentPhase || "config";
  const sections = currentProject?.sections || [];
  const title = currentProject?.title || "Yangi loyiha";
  
  const getPhaseStatus = (phaseId: Phase): "active" | "completed" | "pending" => {
    const phaseOrder = ["config", "skeleton", "write"];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    const phaseIndex = phaseOrder.indexOf(phaseId);
    
    if (phaseId === currentPhase) return "active";
    if (phaseIndex < currentIndex) return "completed";
    return "pending";
  };
  
  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 64 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-full border-r border-border bg-sidebar flex flex-col relative"
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-primary/20 hover:border-primary/30 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
      
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-foreground truncate"
              >
                MAQOLACHI
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>
      
      {/* Project title */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 border-b border-border"
          >
            <p className="text-xs text-muted-foreground mb-1">Loyiha</p>
            <h2 className="font-medium text-sm text-foreground truncate">
              {title}
            </h2>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Phase navigation */}
      <div className="p-4 border-b border-border">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground mb-3"
            >
              Bosqichlar
            </motion.p>
          )}
        </AnimatePresence>
        
        <div className="space-y-2">
          {phases.map((phase, index) => {
            const status = getPhaseStatus(phase.id);
            const Icon = phase.icon;
            
            return (
              <button
                key={phase.id}
                onClick={() => setPhase(phase.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                  status === "active" && "bg-primary/20 text-primary",
                  status === "completed" && "text-foreground hover:bg-secondary",
                  status === "pending" && "text-muted-foreground hover:bg-secondary"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0",
                  status === "active" && "bg-primary text-primary-foreground",
                  status === "completed" && "bg-emerald-500/20 text-emerald-400",
                  status === "pending" && "bg-muted text-muted-foreground"
                )}>
                  {status === "completed" ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium"
                    >
                      {phase.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Sections outline */}
      <AnimatePresence>
        {!isCollapsed && currentPhase === "write" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto p-4"
          >
            <p className="text-xs text-muted-foreground mb-3">Bo'limlar</p>
            <div className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-secondary transition-colors"
                >
                  {getStatusIcon(section.status)}
                  <span className="truncate text-foreground/80">
                    {section.name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Bottom actions */}
      <div className="mt-auto p-4 border-t border-border space-y-2">
        <Button variant="ghost" size="sm" className={cn("w-full", isCollapsed && "px-0")}>
          <Download className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Eksport</span>}
        </Button>
        <Button variant="ghost" size="sm" className={cn("w-full", isCollapsed && "px-0")}>
          <Share2 className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Ulashish</span>}
        </Button>
        <Button variant="ghost" size="sm" className={cn("w-full", isCollapsed && "px-0")}>
          <History className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Tarix</span>}
        </Button>
      </div>
    </motion.aside>
  );
};
