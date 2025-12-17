import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Command,
  FileText,
  Download,
  Settings,
  Layers,
  Edit3,
  Sparkles,
  History,
  Share2,
  X
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const commands = [
  { id: "generate", label: "Bo'lim generatsiya qilish", icon: Sparkles, shortcut: "G" },
  { id: "export-docx", label: "DOCX eksport", icon: Download, shortcut: "E" },
  { id: "export-pdf", label: "PDF eksport", icon: FileText, shortcut: "P" },
  { id: "config", label: "Konfiguratsiyaga o'tish", icon: Settings, shortcut: "1" },
  { id: "skeleton", label: "Strukturaga o'tish", icon: Layers, shortcut: "2" },
  { id: "write", label: "Yozishga o'tish", icon: Edit3, shortcut: "3" },
  { id: "history", label: "Versiyalar tarixi", icon: History, shortcut: "H" },
  { id: "share", label: "Loyihani ulashish", icon: Share2, shortcut: "S" },
];

export const CommandPalette = ({ isOpen, onClose }: CommandPaletteProps) => {
  const [search, setSearch] = useState("");
  const { setPhase } = useProjectStore();
  
  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );
  
  const handleCommand = (commandId: string) => {
    switch (commandId) {
      case "config":
        setPhase("config");
        break;
      case "skeleton":
        setPhase("skeleton");
        break;
      case "write":
        setPhase("write");
        break;
      // Add other command handlers
    }
    onClose();
    setSearch("");
  };
  
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        setSearch("");
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />
          
          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
          >
            <div className="glass-panel overflow-hidden shadow-2xl">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Command className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buyruq qidirish..."
                  autoFocus
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-secondary rounded"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              
              {/* Commands list */}
              <div className="max-h-80 overflow-y-auto py-2">
                {filteredCommands.length > 0 ? (
                  filteredCommands.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={() => handleCommand(cmd.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
                    >
                      <cmd.icon className="w-5 h-5 text-muted-foreground" />
                      <span className="flex-1 text-left text-foreground">
                        {cmd.label}
                      </span>
                      <kbd className="px-2 py-0.5 text-xs bg-secondary rounded text-muted-foreground">
                        {cmd.shortcut}
                      </kbd>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    Buyruq topilmadi
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
