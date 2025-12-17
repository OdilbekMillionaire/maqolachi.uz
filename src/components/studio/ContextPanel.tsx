import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Settings, 
  Link, 
  Sliders,
  Globe,
  BookOpen,
  Quote,
  Zap,
  Plus,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore, Source } from "@/store/projectStore";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContextPanel = ({ isOpen, onClose }: ContextPanelProps) => {
  const { currentProject, updateConfig, addSource, removeSource } = useProjectStore();
  const [newSourceUrl, setNewSourceUrl] = useState("");
  
  const config = currentProject?.config;
  const sources = currentProject?.sources || [];
  
  const handleAddSource = () => {
    if (!newSourceUrl.trim()) return;
    
    const isUrl = newSourceUrl.startsWith("http");
    const isDoi = newSourceUrl.startsWith("10.") || newSourceUrl.includes("doi.org");
    
    addSource({
      title: newSourceUrl,
      urlOrDoi: newSourceUrl,
      type: isDoi ? "DOI" : isUrl ? "URL" : "TEXT",
    });
    setNewSourceUrl("");
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full border-l border-border bg-card/50 backdrop-blur-md overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Kontekst</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Project settings summary */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Sozlamalar
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Til:</span>
                  <span className="text-foreground font-medium">
                    {config?.language === "uz" ? "O'zbek" : config?.language === "en" ? "English" : "Русский"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Soha:</span>
                  <span className="text-foreground font-medium capitalize">
                    {config?.domain}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Quote className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Iqtibos:</span>
                  <span className="text-foreground font-medium uppercase">
                    {config?.citationStyle}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Model mode toggle */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                AI rejimi
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => updateConfig({ modelMode: "fast" })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm",
                    config?.modelMode === "fast"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Zap className="w-4 h-4" />
                  Tez
                </button>
                <button
                  onClick={() => updateConfig({ modelMode: "quality" })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm",
                    config?.modelMode === "quality"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Sliders className="w-4 h-4" />
                  Sifatli
                </button>
              </div>
            </div>
            
            {/* Sources */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Manbalar
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                URL, DOI yoki havola qo'shing. AI faqat shu manbalardan iqtibos keltiradi.
              </p>
              
              {/* Add source input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="URL yoki DOI..."
                  className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onKeyDown={(e) => e.key === "Enter" && handleAddSource()}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleAddSource}
                  disabled={!newSourceUrl.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Sources list */}
              {sources.length > 0 ? (
                <div className="space-y-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-secondary/30 border border-border group"
                    >
                      <Link className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {source.urlOrDoi}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {source.type}
                        </span>
                      </div>
                      <button
                        onClick={() => removeSource(source.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Hali manba qo'shilmagan
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
