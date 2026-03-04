import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  FileText,
  Loader2,
  Download,
  Play,
  Wand2,
  CheckCircle2,
  Shield,
  ShieldCheck,
  MessageSquarePlus,
  ClipboardCopy,
  Hash,
  Undo2,
  ChevronsUpDown,
  BookOpen,
  Timer,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore, Section, SectionStatus, CitationReference } from "@/store/projectStore";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getTranslation, Language } from "@/lib/translations";
import { exportToDoc, countWords } from "@/lib/docExport";
import { ArticlePreview } from "./ArticlePreview";

// ─── Client-side content cleaning (defense-in-depth) ───
function clientCleanContent(content: string): string {
  let result = content;

  // Strip markdown headers
  result = result.replace(/^#{1,6}\s+/gm, '');

  // Strip bold/italic markers
  result = result.replace(/\*\*\*(.*?)\*\*\*/g, '$1');
  result = result.replace(/\*\*(.*?)\*\*/g, '$1');
  result = result.replace(/(?<!\[)\*([^*\n]+)\*(?!\])/g, '$1');
  result = result.replace(/___(.*?)___/g, '$1');
  result = result.replace(/__([^_]+)__/g, '$1');

  // Strip horizontal rules
  result = result.replace(/^[-*_]{3,}\s*$/gm, '');

  // Fix citation spacing: "word [1]" -> "word[1]"
  result = result.replace(/\s+\[(\d+)\]/g, '[$1]');

  // Remove AI meta-commentary
  result = result.replace(/^(Here is|Here's|Below is|I have written|I will write|Let me write|Sure[,!]?).*$/gm, '');

  // Remove markdown links but keep text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Normalize Uzbek apostrophes: ensure o' and g' use standard apostrophe
  result = result.replace(/([oOgG])[ʻ`''ʼ′]/g, "$1'");

  // Deduplicate paragraphs
  const paragraphs = result.split('\n\n');
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
    // Exact duplicate check
    if (seen.has(normalized)) continue;
    // Near-duplicate: check if >80% word overlap with any existing paragraph
    let isDup = false;
    for (const existing of seen) {
      if (existing.length > 50 && normalized.length > 50) {
        const wordsA = normalized.split(/\s+/);
        const wordsB = new Set(existing.split(/\s+/));
        let shared = 0;
        for (const w of wordsA) if (wordsB.has(w)) shared++;
        if (shared / wordsA.length > 0.80) { isDup = true; break; }
      }
    }
    if (isDup) continue;
    seen.add(normalized);
    unique.push(trimmed);
  }
  result = unique.join('\n\n');

  // Clean up extra whitespace
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.replace(/[ \t]{2,}/g, ' ');

  return result.trim();
}

const getStatusBadge = (status: SectionStatus, t: ReturnType<typeof getTranslation>) => {
  const statusMap: Record<SectionStatus, string> = {
    GENERATED: t.statusGenerated,
    EDITED: t.statusEdited,
    DRAFT: t.statusDraft,
    EMPTY: t.statusEmpty
  };
  return { label: statusMap[status], class: `status-${status.toLowerCase()}` };
};

const isConclusionSection = (sectionName: string): boolean => {
  const conclusionTerms = ['conclusion', 'xulosa', 'заключение', 'yakun', 'итог'];
  return conclusionTerms.some(term => sectionName.toLowerCase().includes(term));
};

const isReferencesSection = (sectionName: string): boolean => {
  const referenceTerms = ['reference', 'adabiyot', 'литература', 'manba', 'источник', 'bibliography'];
  return referenceTerms.some(term => sectionName.toLowerCase().includes(term));
};

// Status color for progress dots
const getStatusColor = (status: SectionStatus) => {
  switch (status) {
    case 'GENERATED': return 'bg-emerald-500';
    case 'EDITED': return 'bg-blue-500';
    case 'DRAFT': return 'bg-amber-500';
    case 'EMPTY': return 'bg-muted';
  }
};

export const WritePhase = () => {
  const {
    currentProject,
    setPhase,
    updateSection,
    isGenerating,
    setIsGenerating,
    setGenerationProgress,
    addCitations,
    getNextCitationNumber
  } = useProjectStore();
  const { humanizeContent, perplexityLevel, burstinessLevel } = useSettingsStore();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showVariants, setShowVariants] = useState<string | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const batchCancelRef = useRef(false);
  const [sectionInstructions, setSectionInstructions] = useState<Record<string, string>>({});

  // NEW: Section undo history
  const [sectionHistory, setSectionHistory] = useState<Record<string, string[]>>({});
  // NEW: Auto-continue to next section
  const [autoContinue, setAutoContinue] = useState(false);
  // NEW: Collapse all / expand all state
  const [allExpanded, setAllExpanded] = useState(false);
  // NEW: Show mini TOC
  const [showToc, setShowToc] = useState(false);
  // NEW: Generation timer
  const [genStartTime, setGenStartTime] = useState<number | null>(null);
  const [genElapsed, setGenElapsed] = useState(0);

  // Section refs for scrolling
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sections = currentProject?.sections || [];
  const title = currentProject?.title || "";
  const lang = (currentProject?.config?.language || 'uz') as Language;
  const t = getTranslation(lang);
  const storedCitations = currentProject?.citations || [];

  // NEW: Generation timer
  useEffect(() => {
    if (!genStartTime) { setGenElapsed(0); return; }
    const interval = setInterval(() => {
      setGenElapsed(Math.floor((Date.now() - genStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [genStartTime]);

  // NEW: Keyboard shortcut Ctrl+G to generate current expanded section
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        if (expandedSection && !isGenerating) {
          handleGenerate(expandedSection);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expandedSection, isGenerating]);

  // NEW: Scroll to section when it starts generating
  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleGenerate = async (sectionId: string, regenMode?: string, userInstruction?: string) => {
    // Read FRESH state from store each time (critical for batch generation)
    const freshProject = useProjectStore.getState().currentProject;
    const freshSections = freshProject?.sections || [];
    const freshCitations = freshProject?.citations || [];
    const section = freshSections.find(s => s.id === sectionId);

    // Save previous content for undo
    if (section?.content) {
      setSectionHistory(prev => ({
        ...prev,
        [sectionId]: [...(prev[sectionId] || []), section.content]
      }));
    }

    setGeneratingSectionId(sectionId);
    setIsGenerating(true);
    setGenerationProgress(t.progressContext);
    setShowVariants(null);
    setGenStartTime(Date.now());
    scrollToSection(sectionId);

    const sectionIndex = freshSections.findIndex(s => s.id === sectionId);

    // CRITICAL: Pass FULL prior content to prevent repetition
    // Send the ENTIRE content of each prior section so the AI can see exactly what was already written
    const priorSummaries = freshSections
      .slice(0, sectionIndex)
      .filter(s => s.content)
      .map(s => ({
        name: s.name,
        summary: s.content! // Send ALL content — truncation happens server-side if needed
      }));

    // Use the user-configured words per section
    const targetSectionWords = freshProject?.config?.wordsPerSection || 400;

    const startingCitationNumber = useProjectStore.getState().getNextCitationNumber();
    const isConclusion = isConclusionSection(section?.name || '');
    const isReferences = isReferencesSection(section?.name || '');

    try {
      setGenerationProgress(t.progressGenerating);

      const sectionNotes = section?.notes?.trim();
      const combinedInstruction = [sectionNotes, userInstruction].filter(Boolean).join('. ') || undefined;

      const requestBody: any = {
        type: isReferences ? 'references' : 'section',
        sectionName: section?.name,
        config: {
          ...freshProject?.config,
          title: freshProject?.title,
          sources: freshProject?.sources || []
        },
        priorSummaries,
        regenMode,
        userInstruction: combinedInstruction,
        targetWordCount: targetSectionWords,
        startingCitationNumber,
        isConclusion,
        isReferences,
        storedCitations: freshCitations,
        humanize: humanizeContent,
        humanizeSettings: {
          perplexity: perplexityLevel,
          burstiness: burstinessLevel
        }
      };

      // Auto-retry with exponential backoff on 429 errors
      let data: any = null;
      let lastError: any = null;
      const maxRetries = 4;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const result = await supabase.functions.invoke('generate-content', {
          body: requestBody
        });

        if (result.error) {
          const is429 = result.error?.context?.status === 429 || result.error?.message?.includes('429');
          if (is429 && attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
            setGenerationProgress(`${t.progressGenerating} (Retry ${attempt + 1}...)`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          throw result.error;
        }
        data = result.data;
        break;
      }

      if (!data) throw new Error("No data returned from function");

      // Defense-in-depth: Clean content on client side too
      const cleanedContent = clientCleanContent(data.content);

      updateSection(sectionId, {
        content: cleanedContent,
        status: 'GENERATED',
        summary: data.summary
      });

      if (data.citations && data.citations.length > 0) {
        addCitations(data.citations);
      }

      toast.success(t.sectionGenerated);

      // Auto-continue logic
      if (autoContinue && !isBatchGenerating) {
        const nextIndex = sectionIndex + 1;
        if (nextIndex < freshSections.length) {
          const nextSection = freshSections[nextIndex];
          setExpandedSection(nextSection.id);
          setTimeout(() => handleGenerate(nextSection.id), 500);
        }
      }

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || t.errorGeneric);
    } finally {
      setGeneratingSectionId(null);
      setIsGenerating(false);
      setGenerationProgress("");
      setGenStartTime(null);
    }
  };

  const handleBatchGenerate = async () => {
    const emptySections = sections.filter(s => s.status === 'EMPTY');
    if (emptySections.length === 0) {
      toast.info(lang === 'uz' ? "Barcha bo'limlar tayyor!" : lang === 'ru' ? "Все разделы готовы!" : "All sections are ready!");
      return;
    }

    setIsBatchGenerating(true);
    batchCancelRef.current = false;
    setBatchProgress({ current: 0, total: emptySections.length });

    for (let i = 0; i < emptySections.length; i++) {
      if (batchCancelRef.current) break;
      setBatchProgress(prev => ({ ...prev, current: i + 1 }));
      setExpandedSection(emptySections[i].id);
      await handleGenerate(emptySections[i].id);
      // Small delay between sections to prevent rate limits
      if (i < emptySections.length - 1) await new Promise(r => setTimeout(r, 1500));
    }

    setIsBatchGenerating(false);
    if (!batchCancelRef.current) {
      toast.success(lang === 'uz' ? "Maqola to'liq tayyor!" : lang === 'ru' ? "Статья полностью готова!" : "Article is fully ready!");
    }
  };

  const handleCancelBatch = () => {
    batchCancelRef.current = true;
    setIsBatchGenerating(false);
    toast.info(lang === 'uz' ? "To'xtatildi" : lang === 'ru' ? "Остановлено" : "Stopped");
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

  const handleCopyAll = () => {
    const fullText = sections
      .filter(s => s.content)
      .map(s => `## ${s.name}\n\n${s.content}`)
      .join('\n\n---\n\n');
    const articleText = `${title}\n\n${fullText}`;
    navigator.clipboard.writeText(articleText);
    toast.success(lang === 'uz' ? "Butun maqola nusxalandi!" : lang === 'ru' ? "Вся статья скопирована!" : "Full article copied!");
  };

  // Get citations count for a section
  const getSectionCitations = (sectionId: string) => {
    return storedCitations.filter(c => c.sectionId === sectionId).length;
  };

  const variantOptions = [
    { id: 'concise', label: t.variantConcise },
    { id: 'technical', label: t.variantTechnical },
    { id: 'counterargument', label: t.variantCounterargument },
    { id: 'examples', label: t.variantExamples },
    { id: 'deeper', label: t.variantDeeper },
  ];

  const completedSections = sections.filter(s => s.status === "GENERATED" || s.status === "EDITED").length;
  const progress = (completedSections / sections.length) * 100;
  const totalWords = countWords(sections);
  const verifiedCitations = storedCitations.filter((c: any) => c.verified).length;

  // Simple heuristic for "Human Score"
  const calculateHumanScore = (text: string) => {
    if (!text || text.length < 100) return 0;
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length < 3) return 50;
    
    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
    
    // Higher variance in sentence length usually means more human-like
    // Also check for common AI transition words
    const aiWords = ['furthermore', 'moreover', 'in addition', 'consequently', 'it is important to note'];
    const aiWordCount = aiWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return count + (text.match(regex)?.length || 0);
    }, 0);
    
    let score = 50 + (Math.sqrt(variance) * 5);
    score -= (aiWordCount * 2);
    
    return Math.min(Math.max(Math.round(score), 30), 99);
  };

  // Estimated time remaining (rough: ~30s per section)
  const remainingSections = sections.filter(s => s.status === 'EMPTY' && !isReferencesSection(s.name)).length;
  const estimatedMinutes = Math.ceil((remainingSections * 30) / 60);

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
          <p className="text-muted-foreground">
            {t.writeSubtitle}
            <span className="text-xs ml-2 text-muted-foreground/60">
              (Ctrl+G {lang === 'uz' ? "— generatsiya" : lang === 'ru' ? "— генерация" : "— generate"})
            </span>
          </p>
        </div>

        {/* Title, progress, and actions */}
        <div className="glass-panel p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">{t.titleLabel}</p>
              <h2 className="text-xl font-serif text-foreground leading-relaxed">
                {title}
              </h2>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0 flex-wrap justify-end">
              {completedSections > 0 && (
                <div className="hidden md:flex flex-col items-end">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Human Score</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${calculateHumanScore(sections.map(s => s.content).join(' '))}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-primary">
                      {calculateHumanScore(sections.map(s => s.content).join(' '))}%
                    </span>
                  </div>
                </div>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={handleCopyAll} disabled={completedSections === 0}>
                <ClipboardCopy className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'uz' ? "Nusxalash" : lang === 'ru' ? "Копировать" : "Copy"}</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowPreview(true)} disabled={completedSections === 0}>
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">{t.preview}</span>
              </Button>
              {!isBatchGenerating ? (
                <Button variant="hero" size="sm" className="gap-2" onClick={handleBatchGenerate} disabled={isGenerating || completedSections === sections.length}>
                  <Play className="w-4 h-4" />
                  {t.generateAll}
                </Button>
              ) : (
                <Button variant="destructive" size="sm" className="gap-2" onClick={handleCancelBatch}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {batchProgress.current}/{batchProgress.total}
                </Button>
              )}
            </div>
          </div>

          {/* Humanization indicator */}
          {humanizeContent && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
              <Wand2 className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary font-medium">{t.humanizationLabel}:</span>
              <span className="text-xs text-muted-foreground">{t.humanizationDesc}</span>
            </div>
          )}

          {/* Progress bar + stats */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">{t.progress}</span>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-foreground font-medium">{completedSections}/{sections.length} {t.sectionsCount}</span>
                <span className="text-muted-foreground">|</span>
                <span className={cn("font-medium", totalWords >= 4000 && totalWords <= 6000 ? "text-emerald-400" : "text-amber-400")}>
                  {totalWords.toLocaleString()} {lang === 'uz' ? "so'z" : lang === 'ru' ? "слов" : "words"}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="flex items-center gap-1 text-xs">
                  {verifiedCitations > 0 ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Shield className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span className="text-muted-foreground">
                    {storedCitations.length} {lang === 'uz' ? "manba" : lang === 'ru' ? "ист." : "refs"}
                    {verifiedCitations > 0 && <span className="text-emerald-400 ml-1">({verifiedCitations} DOI)</span>}
                  </span>
                </span>
                {/* Estimated time */}
                {remainingSections > 0 && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="w-3 h-3" />
                      ~{estimatedMinutes} {lang === 'uz' ? "min" : lang === 'ru' ? "мин" : "min"}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>

          {/* NEW: Section progress dots */}
          <div className="flex items-center gap-1.5 mt-3">
            {sections.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setExpandedSection(s.id); scrollToSection(s.id); }}
                className="group relative"
                title={s.name}
              >
                <div className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  getStatusColor(s.status),
                  generatingSectionId === s.id && "animate-pulse ring-2 ring-primary",
                  expandedSection === s.id && "ring-2 ring-foreground/30"
                )} />
              </button>
            ))}
            <span className="text-[10px] text-muted-foreground ml-2">
              {lang === 'uz' ? "Har bir nuqta — bo'lim" : lang === 'ru' ? "Каждая точка — раздел" : "Each dot = section"}
            </span>
          </div>
        </div>

        {/* NEW: Quick controls bar */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-3">
            {/* Auto-continue toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoContinue}
                onChange={(e) => setAutoContinue(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-xs text-muted-foreground">
                {lang === 'uz' ? "Avtomatik davom etish" : lang === 'ru' ? "Авто-продолжение" : "Auto-continue"}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[10px] uppercase tracking-wider font-bold"
              onClick={() => setAllExpanded(!allExpanded)}
            >
              <ChevronsUpDown className="w-3 h-3 mr-1.5" />
              {allExpanded ? (lang === 'uz' ? "Hammasini yopish" : "Collapse all") : (lang === 'uz' ? "Hammasini ochish" : "Expand all")}
            </Button>
          </div>
        </div>

        {/* Sections list */}
        <div className="space-y-4 mb-12">
          {sections.map((section, index) => (
            <div
              key={section.id}
              ref={el => sectionRefs.current[section.id] = el}
              className={cn(
                "glass-panel transition-all duration-300",
                expandedSection === section.id ? "ring-1 ring-primary/30 shadow-lg shadow-primary/5" : "hover:border-primary/20",
                generatingSectionId === section.id && "animate-pulse-subtle"
              )}
            >
              {/* Section Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-secondary/50 text-xs font-bold text-muted-foreground">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{section.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded uppercase font-bold", getStatusBadge(section.status, t).class)}>
                        {getStatusBadge(section.status, t).label}
                      </span>
                      {section.content && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {section.content.split(/\s+/).filter(Boolean).length} {wordsLabel}
                        </span>
                      )}
                      {getSectionCitations(section.id) > 0 && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {getSectionCitations(section.id)} {lang === 'uz' ? "manba" : "refs"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {generatingSectionId === section.id && (
                    <div className="flex items-center gap-2 mr-4">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs text-primary font-medium animate-pulse">
                        {genElapsed}s
                      </span>
                    </div>
                  )}
                  {expandedSection === section.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </div>
              </div>

              {/* Section Content */}
              <AnimatePresence>
                {(expandedSection === section.id || allExpanded) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 border-t border-border/50">
                      {/* Instructions / Notes */}
                      <div className="mt-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                            {lang === 'uz' ? "Ushbu bo'lim uchun ko'rsatmalar" : "Instructions for this section"}
                          </label>
                          {sectionHistory[section.id]?.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] text-primary"
                              onClick={() => {
                                const history = sectionHistory[section.id];
                                const last = history[history.length - 1];
                                updateSection(section.id, { content: last, status: 'EDITED' });
                                setSectionHistory(prev => ({
                                  ...prev,
                                  [section.id]: history.slice(0, -1)
                                }));
                                toast.info(lang === 'uz' ? "Orqaga qaytarildi" : "Restored previous version");
                              }}
                            >
                              <Undo2 className="w-3 h-3 mr-1" />
                              {lang === 'uz' ? "Qaytarish" : "Undo"}
                            </Button>
                          )}
                        </div>
                        <textarea
                          value={sectionInstructions[section.id] || ""}
                          onChange={(e) => setSectionInstructions(prev => ({ ...prev, [section.id]: e.target.value }))}
                          placeholder={lang === 'uz' ? "Masalan: 'Ushbu bo'limda O'zbekiston misollarini ko'proq keltiring'..." : "e.g. 'Focus more on Uzbekistan examples in this section'..."}
                          className="w-full bg-secondary/30 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-none"
                        />
                      </div>

                      {section.content ? (
                        <div className="space-y-4">
                          <div className="relative group">
                            <textarea
                              value={section.content}
                              onChange={(e) => updateSection(section.id, { content: e.target.value, status: 'EDITED' })}
                              className="w-full bg-secondary/20 border border-border/50 rounded-xl p-4 text-sm text-foreground leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[300px] font-serif"
                            />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="w-8 h-8"
                                onClick={() => {
                                  navigator.clipboard.writeText(section.content!);
                                  toast.success(t.copied);
                                }}
                              >
                                <ClipboardCopy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => handleGenerate(section.id)}
                                disabled={isGenerating}
                              >
                                <RefreshCw className={cn("w-4 h-4", generatingSectionId === section.id && "animate-spin")} />
                                {t.regenerate}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={() => setShowVariants(showVariants === section.id ? null : section.id)}
                              >
                                <Sparkles className="w-4 h-4 text-primary" />
                                {lang === 'uz' ? "Variantlar" : "Variants"}
                              </Button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold mr-2">
                                {lang === 'uz' ? "Tezkor tahrir" : "Quick Edit"}:
                              </span>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 text-[10px]"
                                onClick={() => handleGenerate(section.id, 'expand')}
                                disabled={isGenerating}
                              >
                                {lang === 'uz' ? "Kengaytirish" : "Expand"}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 text-[10px]"
                                onClick={() => handleGenerate(section.id, 'simplify')}
                                disabled={isGenerating}
                              )
                                {lang === 'uz' ? "Soddalashtirish" : "Simplify"}
                              </Button>
                            </div>
                          </div>

                          {/* Variants dropdown */}
                          <AnimatePresence>
                            {showVariants === section.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10"
                              >
                                {variantOptions.map(opt => (
                                  <Button
                                    key={opt.id}
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start text-xs h-8 hover:bg-primary/10"
                                    onClick={() => handleGenerate(section.id, opt.id)}
                                    disabled={isGenerating}
                                  >
                                    <Zap className="w-3 h-3 mr-2 text-primary" />
                                    {opt.label}
                                  </Button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Sparkles className="w-8 h-8 text-primary" />
                          </div>
                          <h4 className="text-lg font-medium mb-2">{t.sectionEmpty}</h4>
                          <p className="text-sm text-muted-foreground max-w-xs mb-6">
                            {t.sectionEmptyDesc}
                          </p>
                          <Button
                            variant="hero"
                            className="gap-2 px-8"
                            onClick={() => handleGenerate(section.id)}
                            disabled={isGenerating}
                          >
                            {isGenerating && generatingSectionId === section.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                            {t.generateSection}
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between p-6 glass-panel sticky bottom-6 z-10">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setPhase('skeleton')}
            disabled={isGenerating}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowPreview(true)}
              disabled={completedSections === 0}
            >
              <FileText className="w-4 h-4" />
              {t.preview}
            </Button>
            <Button
              variant="hero"
              className="gap-2 px-8"
              onClick={handleExport}
              disabled={completedSections === 0 || isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {t.exportDoc}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Preview Modal */}
      <ArticlePreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={title}
        sections={sections}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </div>
  );
};
