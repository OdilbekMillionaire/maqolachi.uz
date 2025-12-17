import { motion } from "framer-motion";
import { 
  Save, 
  Undo2, 
  Redo2, 
  Command,
  Clock,
  Wifi,
  WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/store/projectStore";

interface StudioHeaderProps {
  onCommandPalette: () => void;
}

export const StudioHeader = ({ onCommandPalette }: StudioHeaderProps) => {
  const { currentProject, isGenerating, generationProgress } = useProjectStore();
  
  const lastSaved = currentProject?.updatedAt 
    ? new Date(currentProject.updatedAt).toLocaleTimeString('uz-UZ', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : null;
  
  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-md px-4 flex items-center justify-between">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">Onlayn</span>
        </div>
        
        {/* Autosave status */}
        {lastSaved && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Saqlangan: {lastSaved}</span>
          </div>
        )}
        
        {/* Generation progress */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20"
          >
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-primary font-medium">
              {generationProgress || "Generatsiya..."}
            </span>
          </motion.div>
        )}
      </div>
      
      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <div className="flex items-center border-r border-border pr-2 mr-2">
          <Button variant="ghost" size="icon" className="w-8 h-8" disabled>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8" disabled>
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Command palette trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={onCommandPalette}
          className="gap-2"
        >
          <Command className="w-3 h-3" />
          <span className="text-xs">Buyruqlar</span>
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] bg-secondary rounded">
            ⌘K
          </kbd>
        </Button>
        
        {/* Save button */}
        <Button variant="default" size="sm" className="gap-2">
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Saqlash</span>
        </Button>
      </div>
    </header>
  );
};
