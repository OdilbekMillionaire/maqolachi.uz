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
  const { humanizeContent } = useSettingsStore();
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
        humanize: humanizeContent
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
          const is429 = result.error?.context?.status === 429 ||
            result.error?.status === 429 ||
            (typeof result.error?.message === 'string' && result.error.message.includes('429'));

          if (is429 && attempt < maxRetries - 1) {
            const waitTime = Math.pow(2, attempt) * 5000; // 5s, 10s, 20s, 40s
            console.log(`429 rate limit, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
            setGenerationProgress(
              lang === 'uz' ? `Kutilmoqda... (${Math.ceil(waitTime / 1000)}s)`
                : lang === 'ru' ? `Ожидание... (${Math.ceil(waitTime / 1000)}с)`
                : `Waiting... (${Math.ceil(waitTime / 1000)}s)`
            );
            await new Promise(r => setTimeout(r, waitTime));
            continue;
          }
          lastError = result.error;
          break;
        }

        data = result.data;
        break;
      }

      if (lastError) throw lastError;

      setGenerationProgress(t.progressPolishing);
      await new Promise(resolve => setTimeout(resolve, 300));

      if (data?.content) {
        // Client-side cleaning: strip markdown, fix citation spacing, deduplicate
        // Skip cleaning for references section (it has its own format)
        const cleanedContent = isReferences ? data.content : clientCleanContent(data.content);
        updateSection(sectionId, {
          content: cleanedContent,
          status: "GENERATED",
          summary: data.summary || cleanedContent.substring(0, 200) + '...'
        });

        if (data.citations && data.citations.length > 0) {
          const citationsWithSectionId: CitationReference[] = data.citations.map((c: any) => ({
            number: c.number,
            text: c.text,
            sectionId: sectionId
          }));
          addCitations(citationsWithSectionId);
        }

        const wc = cleanedContent.trim().split(/\s+/).length;
        const citCount = data.citations?.length || 0;
        toast.success(
          `${t.sectionGenerated} (${wc} ${lang === 'uz' ? "so'z" : lang === 'ru' ? "слов" : "words"}${citCount > 0 ? `, ${citCount} ${lang === 'uz' ? "manba" : lang === 'ru' ? "ист." : "refs"}` : ''})`
        );

        // Auto-continue (only for manual single-section generate, not batch)
        if (autoContinue && !isBatchGenerating) {
          const nextSection = freshSections[sectionIndex + 1];
          if (nextSection && nextSection.status === 'EMPTY' && !isReferencesSection(nextSection.name)) {
            setTimeout(() => handleGenerate(nextSection.id), 1500);
          }
        }
      } else {
        throw new Error('Invalid response');
      }
    } catch (error: any) {
      console.error('Error generating section:', error);
      toast.error(t.generationError);
    } finally {
      setGeneratingSectionId(null);
      setIsGenerating(false);
      setGenerationProgress("");
      setExpandedSection(sectionId);
      setGenStartTime(null);
    }
  };

  // NEW: Undo last generation for a section
  const handleUndo = (sectionId: string) => {
    const history = sectionHistory[sectionId];
    if (!history || history.length === 0) return;
    const previousContent = history[history.length - 1];
    updateSection(sectionId, { content: previousContent, status: previousContent ? "EDITED" : "EMPTY" });
    setSectionHistory(prev => ({
      ...prev,
      [sectionId]: history.slice(0, -1)
    }));
    toast.info(lang === 'uz' ? "Oldingi versiya qaytarildi" : lang === 'ru' ? "Предыдущая версия восстановлена" : "Previous version restored");
  };

  // QUEUE-BASED batch generation: generates each section one-by-one sequentially
  // Each section reads FRESH prior content from the store so it knows what was already written
  const handleBatchGenerate = async () => {
    // Read fresh state at start
    const freshSections = useProjectStore.getState().currentProject?.sections || [];
    const generableSections = freshSections.filter(
      s => s.status === 'EMPTY' && !isReferencesSection(s.name)
    );

    if (generableSections.length === 0) {
      toast.info(lang === 'uz' ? "Barcha bo'limlar allaqachon generatsiya qilingan"
        : lang === 'ru' ? 'Все разделы уже сгенерированы'
        : 'All sections already generated');
      return;
    }

    setIsBatchGenerating(true);
    batchCancelRef.current = false;
    const totalCount = generableSections.length;
    setBatchProgress({ current: 0, total: totalCount });

    toast.info(
      lang === 'uz' ? `${totalCount} bo'lim navbatda. Har biri alohida generatsiya qilinadi...`
        : lang === 'ru' ? `${totalCount} разделов в очереди. Каждый генерируется отдельно...`
        : `${totalCount} sections queued. Each will be generated individually...`,
      { duration: 4000 }
    );

    for (let i = 0; i < generableSections.length; i++) {
      if (batchCancelRef.current) break;

      const currentSection = generableSections[i];
      setBatchProgress({ current: i + 1, total: totalCount });

      // Generate this section — handleGenerate reads fresh state internally
      await handleGenerate(currentSection.id);

      // Wait between sections to let the store settle and avoid rate limits
      if (i < generableSections.length - 1 && !batchCancelRef.current) {
        await new Promise(r => setTimeout(r, 4000));
      }
    }

    // Finally generate references if all sections done
    if (!batchCancelRef.current) {
      const latestSections = useProjectStore.getState().currentProject?.sections || [];
      const refsSection = latestSections.find(s => isReferencesSection(s.name));
      if (refsSection && refsSection.status === 'EMPTY') {
        setBatchProgress({ current: totalCount, total: totalCount });
        await new Promise(r => setTimeout(r, 2000));
        await handleGenerate(refsSection.id);
      }
    }

    setIsBatchGenerating(false);
    if (!batchCancelRef.current) {
      toast.success(t.batchComplete);
    }
  };

  const handleCancelBatch = () => {
    batchCancelRef.current = true;
    setIsBatchGenerating(false);
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

  // NEW: Toggle collapse all / expand all
  const handleToggleAll = () => {
    if (allExpanded) {
      setExpandedSection(null);
      setAllExpanded(false);
    } else {
      // Expand first section (can't expand all simultaneously with single state, so just mark as expanded)
      setAllExpanded(true);
      setExpandedSection(sections[0]?.id || null);
    }
  };

  // Word count for a single section
  const getSectionWordCount = (content: string) => {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  // Copy section content to clipboard
  const handleCopySection = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success(lang === 'uz' ? "Nusxalandi!" : lang === 'ru' ? "Скопировано!" : "Copied!");
  };

  // Copy full article to clipboard
  const handleCopyAll = () => {
    const fullText = sections
      .filter(s => s.content)
      .map(s => `${s.name}\n\n${s.content}`)
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
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
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
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {lang === 'uz' ? "Avtomatik davom etish" : lang === 'ru' ? "Авто-продолжение" : "Auto-continue"}
              </span>
            </label>

            {/* TOC toggle */}
            <button
              onClick={() => setShowToc(!showToc)}
              className={cn("text-xs flex items-center gap-1 px-2 py-1 rounded-lg transition-colors", showToc ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <BookOpen className="w-3 h-3" />
              {lang === 'uz' ? "Mundarija" : lang === 'ru' ? "Оглавление" : "TOC"}
            </button>
          </div>

          {/* Generation timer */}
          {genStartTime && (
            <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
              <Timer className="w-3 h-3" />
              {genElapsed}s
            </div>
          )}

          {/* Collapse/Expand all */}
          <button onClick={handleToggleAll} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ChevronsUpDown className="w-3.5 h-3.5" />
            {allExpanded
              ? (lang === 'uz' ? "Barchasini yopish" : lang === 'ru' ? "Свернуть все" : "Collapse all")
              : (lang === 'uz' ? "Barchasini ochish" : lang === 'ru' ? "Развернуть все" : "Expand all")
            }
          </button>
        </div>

        {/* NEW: Mini TOC sidebar */}
        <AnimatePresence>
          {showToc && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-panel p-4 mb-4"
            >
              <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                {lang === 'uz' ? "Mundarija" : lang === 'ru' ? "Оглавление" : "Table of Contents"}
              </h3>
              <div className="space-y-1">
                {sections.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => { setExpandedSection(s.id); scrollToSection(s.id); setShowToc(false); }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between",
                      expandedSection === s.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/50 text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", getStatusColor(s.status))} />
                      <span className="truncate">{s.name}</span>
                    </span>
                    {s.content && (
                      <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                        {getSectionWordCount(s.content)}w
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sections */}
        <div className="space-y-4 mb-8">
          {sections.map((section, index) => {
            const isExpanded = allExpanded || expandedSection === section.id;
            const isGeneratingThis = generatingSectionId === section.id;
            const statusBadge = getStatusBadge(section.status, t);
            const isRefs = isReferencesSection(section.name);
            const isVariantsOpen = showVariants === section.id;
            const sectionCitCount = getSectionCitations(section.id);
            const hasUndo = (sectionHistory[section.id]?.length || 0) > 0;

            return (
              <motion.div
                key={section.id}
                ref={(el) => { sectionRefs.current[section.id] = el; }}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "glass-panel overflow-hidden transition-all duration-300",
                  isExpanded && "ring-2 ring-primary/30",
                  isGeneratingThis && "ring-2 ring-primary/50 shadow-lg shadow-primary/10"
                )}
              >
                {/* Section header */}
                <button
                  onClick={() => { setExpandedSection(isExpanded && !allExpanded ? null : section.id); setAllExpanded(false); }}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      isGeneratingThis ? "bg-primary/20 animate-pulse" : "bg-primary/10"
                    )}>
                      {isGeneratingThis ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : section.status === 'GENERATED' || section.status === 'EDITED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <span className="text-sm font-medium text-primary">{index + 1}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-foreground">{section.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", statusBadge.class)}>
                          {statusBadge.label}
                        </span>
                        {section.content && !isRefs && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {getSectionWordCount(section.content)} {lang === 'uz' ? "so'z" : lang === 'ru' ? "сл" : "w"}
                          </span>
                        )}
                        {sectionCitCount > 0 && (
                          <span className="text-xs text-emerald-500 flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3" />
                            {sectionCitCount}
                          </span>
                        )}
                        {isRefs && storedCitations.length > 0 && (
                          <span className="text-xs text-muted-foreground">({storedCitations.length})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isGeneratingThis && <span className="text-xs text-primary animate-pulse">{genElapsed}s</span>}
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button onClick={() => handleGenerate(section.id)} disabled={isGenerating || (isRefs && storedCitations.length === 0)} className="gap-2">
                            {isGeneratingThis ? (
                              <><Loader2 className="w-4 h-4 animate-spin" />{t.generating}</>
                            ) : (
                              <><Sparkles className="w-4 h-4" />{section.content ? t.regenerate : t.generate}</>
                            )}
                          </Button>

                          {/* Variants dropdown */}
                          {section.content && !isRefs && (
                            <div className="relative">
                              <Button variant="outline" className="gap-2" onClick={() => setShowVariants(isVariantsOpen ? null : section.id)} disabled={isGenerating}>
                                <RefreshCw className="w-4 h-4" />
                                {t.variants}
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <AnimatePresence>
                                {isVariantsOpen && (
                                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-xl shadow-lg p-1 min-w-[200px]">
                                    {variantOptions.map(variant => (
                                      <button key={variant.id} onClick={() => { setShowVariants(null); handleGenerate(section.id, variant.id); }} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors text-foreground">
                                        {variant.label}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* NEW: Undo button */}
                          {hasUndo && (
                            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => handleUndo(section.id)} disabled={isGenerating}>
                              <Undo2 className="w-3.5 h-3.5" />
                              {lang === 'uz' ? "Qaytarish" : lang === 'ru' ? "Отменить" : "Undo"}
                            </Button>
                          )}
                        </div>

                        {/* Info for references section */}
                        {isRefs && storedCitations.length === 0 && (
                          <div className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                            {lang === 'uz' ? "Avval boshqa bo'limlarni yarating. Manbalar avtomatik to'planadi."
                              : lang === 'ru' ? "Сначала сгенерируйте другие разделы. Источники будут собраны автоматически."
                              : "Generate other sections first. References will be collected automatically."}
                          </div>
                        )}

                        {/* Content editor */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-muted-foreground">{t.content}</label>
                            <div className="flex items-center gap-2">
                              {section.content && (
                                <>
                                  <span className="text-xs text-muted-foreground">{getSectionWordCount(section.content)} {lang === 'uz' ? "so'z" : lang === 'ru' ? "слов" : "words"}</span>
                                  <button onClick={() => handleCopySection(section.content)} className="p-1 rounded-md hover:bg-secondary transition-colors" title={lang === 'uz' ? "Nusxalash" : lang === 'ru' ? "Копировать" : "Copy"}>
                                    <ClipboardCopy className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Loading animation during generation */}
                          {isGeneratingThis && !section.content && (
                            <div className="w-full min-h-[200px] bg-secondary/30 border border-primary/20 rounded-xl px-4 py-3 space-y-3 animate-pulse">
                              <div className="h-4 bg-primary/10 rounded w-3/4" />
                              <div className="h-4 bg-primary/10 rounded w-full" />
                              <div className="h-4 bg-primary/10 rounded w-5/6" />
                              <div className="h-4 bg-primary/10 rounded w-2/3" />
                              <div className="h-4 bg-primary/10 rounded w-full" />
                              <div className="h-4 bg-primary/10 rounded w-4/5" />
                            </div>
                          )}

                          {(!isGeneratingThis || section.content) && (
                            <textarea
                              value={section.content}
                              onChange={(e) => handleContentChange(section.id, e.target.value)}
                              placeholder={t.contentPlaceholder}
                              className="w-full min-h-[300px] bg-secondary/30 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-y font-serif leading-relaxed"
                            />
                          )}
                        </div>

                        {/* Section notes - fed into generation */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm text-muted-foreground">{t.notes}</label>
                            {section.notes?.trim() && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                {lang === 'uz' ? "AI ga yuboriladi" : lang === 'ru' ? "Учитывается ИИ" : "Sent to AI"}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={section.notes}
                            onChange={(e) => updateSection(section.id, { notes: e.target.value })}
                            placeholder={lang === 'uz' ? "AI ga ko'rsatma: masalan, 'Statistik ma'lumotlar qo'shing', 'Qisqaroq yozing'..." : lang === 'ru' ? "Инструкция для ИИ: напр., 'Добавьте статистику', 'Короче'..." : "Instructions for AI: e.g., 'Add statistics', 'Keep it shorter'..."}
                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                          />
                        </div>

                        {/* Targeted regeneration with user instruction */}
                        {section.content && !isRefs && (
                          <div className="border-t border-border pt-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <MessageSquarePlus className="w-4 h-4 text-primary" />
                              <label className="text-sm font-medium text-foreground">{t.regenInstruction}</label>
                            </div>
                            <textarea
                              value={sectionInstructions[section.id] || ''}
                              onChange={(e) => setSectionInstructions(prev => ({ ...prev, [section.id]: e.target.value }))}
                              placeholder={t.regenInstructionPlaceholder}
                              rows={2}
                              className="w-full bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm resize-none"
                            />
                            <Button
                              onClick={() => {
                                const instruction = sectionInstructions[section.id];
                                if (!instruction?.trim()) return;
                                setSectionInstructions(prev => ({ ...prev, [section.id]: '' }));
                                handleGenerate(section.id, undefined, instruction.trim());
                              }}
                              disabled={isGenerating || !sectionInstructions[section.id]?.trim()}
                              variant="outline"
                              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                            >
                              {isGeneratingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                              {t.regenWithChanges}
                            </Button>
                          </div>
                        )}
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
          <Button variant="outline" size="lg" onClick={() => setPhase("skeleton")} className="gap-2">
            <ArrowLeft className="w-5 h-5" />
            {t.backToStructure}
          </Button>
          <Button variant="hero" size="lg" className="gap-2" onClick={handleExport} disabled={isExporting || completedSections === 0}>
            {isExporting ? (
              <><Loader2 className="w-5 h-5 animate-spin" />{t.loading}</>
            ) : (
              <><Download className="w-5 h-5" />{t.exportDoc}</>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Article Preview Modal */}
      <ArticlePreview isOpen={showPreview} onClose={() => setShowPreview(false)} title={title} sections={sections} language={lang} />
    </div>
  );
};
