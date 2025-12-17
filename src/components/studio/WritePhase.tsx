import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  Sparkles, 
  RefreshCw, 
  Check, 
  Circle, 
  Edit3,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  FileText,
  Loader2,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore, Section, SectionStatus } from "@/store/projectStore";
import { cn } from "@/lib/utils";

const getStatusBadge = (status: SectionStatus) => {
  switch (status) {
    case "GENERATED":
      return { label: "Generatsiya qilindi", class: "status-generated" };
    case "EDITED":
      return { label: "Tahrirlandi", class: "status-edited" };
    case "DRAFT":
      return { label: "Qoralama", class: "status-draft" };
    default:
      return { label: "Bo'sh", class: "status-empty" };
  }
};

export const WritePhase = () => {
  const { currentProject, setPhase, updateSection, isGenerating, setIsGenerating, setGenerationProgress } = useProjectStore();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null);
  
  const sections = currentProject?.sections || [];
  const title = currentProject?.title || "";
  
  const handleGenerate = async (sectionId: string) => {
    setGeneratingSectionId(sectionId);
    setIsGenerating(true);
    setGenerationProgress("Tahlil qilinmoqda...");
    
    // Simulate generation steps
    const steps = [
      "Kontekst o'rganilmoqda...",
      "Kontent generatsiya qilinmoqda...",
      "Sayqallanmoqda...",
    ];
    
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGenerationProgress(steps[i]);
    }
    
    // Mock generated content
    const mockContent = `Bu ${sections.find(s => s.id === sectionId)?.name} bo'limi uchun generatsiya qilingan kontent namunasi.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;
    
    updateSection(sectionId, { 
      content: mockContent, 
      status: "GENERATED",
      summary: "Bo'lim generatsiya qilindi va asosiy fikrlar yoritildi."
    });
    
    setGeneratingSectionId(null);
    setIsGenerating(false);
    setGenerationProgress("");
    setExpandedSection(sectionId);
  };
  
  const handleContentChange = (sectionId: string, content: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section?.status === "GENERATED") {
      updateSection(sectionId, { content, status: "EDITED" });
    } else {
      updateSection(sectionId, { content });
    }
  };
  
  const completedSections = sections.filter(s => s.status === "GENERATED" || s.status === "EDITED").length;
  const progress = (completedSections / sections.length) * 100;
  
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Maqola yozish</h1>
          <p className="text-muted-foreground">
            Har bir bo'limni AI yordamida generatsiya qiling yoki qo'lda yozing
          </p>
        </div>
        
        {/* Title and progress */}
        <div className="glass-panel p-6 mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Sarlavha</p>
              <h2 className="text-xl font-serif text-foreground leading-relaxed">
                {title}
              </h2>
            </div>
            <Button variant="outline" size="sm" className="gap-2 flex-shrink-0">
              <FileText className="w-4 h-4" />
              Oldindan ko'rish
            </Button>
          </div>
          
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Jarayon</span>
              <span className="text-foreground font-medium">{completedSections}/{sections.length} bo'lim</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
        
        {/* Sections */}
        <div className="space-y-4 mb-8">
          {sections.map((section, index) => {
            const isExpanded = expandedSection === section.id;
            const isGeneratingThis = generatingSectionId === section.id;
            const statusBadge = getStatusBadge(section.status);
            
            return (
              <motion.div
                key={section.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "glass-panel overflow-hidden transition-all duration-300",
                  isExpanded && "ring-2 ring-primary/30"
                )}
              >
                {/* Section header */}
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">{index + 1}</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-foreground">{section.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", statusBadge.class)}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                
                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-border"
                    >
                      <div className="p-4 space-y-4">
                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleGenerate(section.id)}
                            disabled={isGenerating}
                            className="gap-2"
                          >
                            {isGeneratingThis ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generatsiya...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                {section.content ? "Qayta generatsiya" : "Generatsiya qilish"}
                              </>
                            )}
                          </Button>
                          {section.content && (
                            <Button variant="outline" className="gap-2">
                              <MoreHorizontal className="w-4 h-4" />
                              Boshqa variantlar
                            </Button>
                          )}
                        </div>
                        
                        {/* Content editor */}
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">
                            Kontent
                          </label>
                          <textarea
                            value={section.content}
                            onChange={(e) => handleContentChange(section.id, e.target.value)}
                            placeholder="Bo'lim kontentini yozing yoki AI yordamida generatsiya qiling..."
                            className="w-full min-h-[300px] bg-secondary/30 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-y font-serif leading-relaxed"
                          />
                        </div>
                        
                        {/* Section notes */}
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">
                            Eslatmalar (ixtiyoriy)
                          </label>
                          <input
                            type="text"
                            value={section.notes}
                            onChange={(e) => updateSection(section.id, { notes: e.target.value })}
                            placeholder="Bu bo'lim uchun eslatmalar..."
                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
        
        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setPhase("skeleton")}
            className="gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Strukturaga qaytish
          </Button>
          <Button variant="hero" size="lg" className="gap-2">
            <FileText className="w-5 h-5" />
            Eksport qilish
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
