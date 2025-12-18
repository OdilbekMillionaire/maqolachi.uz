import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
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
  MoreHorizontal,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore, Section, SectionStatus } from "@/store/projectStore";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getTranslation, Language } from "@/lib/translations";
import { exportToDoc, countWords } from "@/lib/docExport";

const getStatusBadge = (status: SectionStatus, t: ReturnType<typeof getTranslation>) => {
  const statusMap: Record<SectionStatus, string> = {
    GENERATED: t.statusGenerated,
    EDITED: t.statusEdited,
    DRAFT: t.statusDraft,
    EMPTY: t.statusEmpty
  };
  return { label: statusMap[status], class: `status-${status.toLowerCase()}` };
};

// Helper to check if section is conclusion
const isConclusionSection = (sectionName: string): boolean => {
  const conclusionTerms = ['conclusion', 'xulosa', 'заключение', 'yakun', 'итог'];
  return conclusionTerms.some(term => sectionName.toLowerCase().includes(term));
};

// Helper to check if section is references
const isReferencesSection = (sectionName: string): boolean => {
  const referenceTerms = ['reference', 'adabiyot', 'литература', 'manba', 'источник', 'bibliography'];
  return referenceTerms.some(term => sectionName.toLowerCase().includes(term));
};

// Helper to count citations in content
const countCitationsInContent = (content: string): number => {
  if (!content) return 0;
  const citations = content.match(/\[\d+\]/g) || [];
  const uniqueNums = new Set(citations.map(c => parseInt(c.replace(/[\[\]]/g, ''))));
  return uniqueNums.size > 0 ? Math.max(...uniqueNums) : 0;
};

export const WritePhase = () => {
  const { currentProject, setPhase, updateSection, isGenerating, setIsGenerating, setGenerationProgress } = useProjectStore();
  const { humanizeContent } = useSettingsStore();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const sections = currentProject?.sections || [];
  const title = currentProject?.title || "";
  const lang = (currentProject?.config?.language || 'uz') as Language;
  const t = getTranslation(lang);
  
  // Calculate starting citation number for each section based on prior sections
  const sectionCitationStarts = useMemo(() => {
    const starts: Record<string, number> = {};
    let runningTotal = 1;
    
    for (const section of sections) {
      if (isReferencesSection(section.name)) {
        starts[section.id] = runningTotal - 1; // References section gets total count
        continue;
      }
      
      starts[section.id] = runningTotal;
      
      if (section.content && !isConclusionSection(section.name)) {
        const citationsInSection = countCitationsInContent(section.content);
        if (citationsInSection > 0) {
          runningTotal = citationsInSection + 1;
        }
      }
    }
    
    return starts;
  }, [sections]);
  
  const handleGenerate = async (sectionId: string, regenMode?: string) => {
    setGeneratingSectionId(sectionId);
    setIsGenerating(true);
    setGenerationProgress(t.progressContext);
    
    const section = sections.find(s => s.id === sectionId);
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    
    // Build prior summaries from completed sections
    const priorSummaries = sections
      .slice(0, sectionIndex)
      .filter(s => s.summary)
      .map(s => ({ name: s.name, summary: s.summary }));
    
    // Calculate target word count for this section
    const totalSections = sections.filter(s => !isReferencesSection(s.name)).length;
    const targetTotalWords = 5000;
    const targetSectionWords = Math.floor(targetTotalWords / totalSections);
    
    // Get starting citation number for this section
    const startingCitationNumber = sectionCitationStarts[sectionId] || 1;
    const isConclusion = isConclusionSection(section?.name || '');
    const isReferences = isReferencesSection(section?.name || '');
    
    try {
      setGenerationProgress(t.progressGenerating);
      
      const requestBody: any = {
        type: isReferences ? 'references' : 'section',
        sectionName: section?.name,
        config: {
          ...currentProject?.config,
          title: currentProject?.title,
          sources: currentProject?.sources || []
        },
        priorSummaries,
        regenMode,
        targetWordCount: targetSectionWords,
        startingCitationNumber,
        isConclusion,
        humanize: humanizeContent
      };
      
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: requestBody
      });
      
      if (error) throw error;
      
      setGenerationProgress(t.progressPolishing);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (data?.content) {
        updateSection(sectionId, { 
          content: data.content, 
          status: "GENERATED",
          summary: data.summary || data.content.substring(0, 200) + '...'
        });
        toast.success(t.sectionGenerated);
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.error('Error generating section:', error);
      toast.error(t.generationError);
    } finally {
      setGeneratingSectionId(null);
      setIsGenerating(false);
      setGenerationProgress("");
      setExpandedSection(sectionId);
    }
  };
  
  const handleContentChange = (sectionId: string, content: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section?.status === "GENERATED") {
      updateSection(sectionId, { content, status: "EDITED" });
    } else {
      updateSection(sectionId, { content });
    }
  };
  
  const handleExport = async () => {
    if (!currentProject) return;
    
    setIsExporting(true);
    try {
      await exportToDoc({
        title: currentProject.title,
        sections: currentProject.sections,
        language: lang,
        domain: currentProject.config.domain,
        academicLevel: currentProject.config.academicLevel,
        citationStyle: currentProject.config.citationStyle
      });
      toast.success(t.exportSuccess);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t.exportError);
    } finally {
      setIsExporting(false);
    }
  };
  
  const completedSections = sections.filter(s => s.status === "GENERATED" || s.status === "EDITED").length;
  const progress = (completedSections / sections.length) * 100;
  const totalWords = countWords(sections);
  
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t.writeTitle}</h1>
          <p className="text-muted-foreground">{t.writeSubtitle}</p>
        </div>
        
        {/* Title and progress */}
        <div className="glass-panel p-6 mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">{t.titleLabel}</p>
              <h2 className="text-xl font-serif text-foreground leading-relaxed">
                {title}
              </h2>
            </div>
            <Button variant="outline" size="sm" className="gap-2 flex-shrink-0">
              <FileText className="w-4 h-4" />
              {t.preview}
            </Button>
          </div>
          
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">{t.progress}</span>
              <div className="flex items-center gap-4">
                <span className="text-foreground font-medium">{completedSections}/{sections.length} {t.sectionsCount}</span>
                <span className="text-muted-foreground">|</span>
                <span className={cn(
                  "font-medium",
                  totalWords >= 4000 && totalWords <= 6000 ? "text-emerald-400" : "text-amber-400"
                )}>
                  {totalWords.toLocaleString()} {lang === 'uz' ? "so'z" : lang === 'ru' ? "слов" : "words"}
                </span>
              </div>
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
            const statusBadge = getStatusBadge(section.status, t);
            
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
                                {t.generating}
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                {section.content ? t.regenerate : t.generate}
                              </>
                            )}
                          </Button>
                          {section.content && (
                            <Button variant="outline" className="gap-2">
                              <MoreHorizontal className="w-4 h-4" />
                              {t.variants}
                            </Button>
                          )}
                        </div>
                        
                        {/* Content editor */}
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">
                            {t.content}
                          </label>
                          <textarea
                            value={section.content}
                            onChange={(e) => handleContentChange(section.id, e.target.value)}
                            placeholder={t.contentPlaceholder}
                            className="w-full min-h-[300px] bg-secondary/30 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-y font-serif leading-relaxed"
                          />
                        </div>
                        
                        {/* Section notes */}
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">
                            {t.notes}
                          </label>
                          <input
                            type="text"
                            value={section.notes}
                            onChange={(e) => updateSection(section.id, { notes: e.target.value })}
                            placeholder={t.notesPlaceholder}
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
            {t.backToStructure}
          </Button>
          <Button 
            variant="hero" 
            size="lg" 
            className="gap-2"
            onClick={handleExport}
            disabled={isExporting || completedSections === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.loading}
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                {t.exportDoc}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
