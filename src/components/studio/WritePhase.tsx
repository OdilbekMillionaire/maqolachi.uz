import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
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
  Hash
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
  // sectionId -> user's instruction for targeted regeneration
  const [sectionInstructions, setSectionInstructions] = useState<Record<string, string>>({});

  const sections = currentProject?.sections || [];
  const title = currentProject?.title || "";
  const lang = (currentProject?.config?.language || 'uz') as Language;
  const t = getTranslation(lang);
  const storedCitations = currentProject?.citations || [];

  const handleGenerate = async (sectionId: string, regenMode?: string, userInstruction?: string) => {
    setGeneratingSectionId(sectionId);
    setIsGenerating(true);
    setGenerationProgress(t.progressContext);
    setShowVariants(null);

    const section = sections.find(s => s.id === sectionId);
    const sectionIndex = sections.findIndex(s => s.id === sectionId);

    const priorSummaries = sections
      .slice(0, sectionIndex)
      .filter(s => s.summary)
      .map(s => ({ name: s.name, summary: s.summary }));

    const totalSections = sections.filter(s => !isReferencesSection(s.name)).length;
    const targetTotalWords = 5000;
    const targetSectionWords = Math.floor(targetTotalWords / totalSections);

    const startingCitationNumber = getNextCitationNumber();
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
        userInstruction: userInstruction || undefined,
        targetWordCount: targetSectionWords,
        startingCitationNumber,
        isConclusion,
        isReferences,
        storedCitations: storedCitations,
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

        if (data.citations && data.citations.length > 0) {
          const citationsWithSectionId: CitationReference[] = data.citations.map((c: any) => ({
            number: c.number,
            text: c.text,
            sectionId: sectionId
          }));
          addCitations(citationsWithSectionId);
        }

        toast.success(t.sectionGenerated);
      } else {
        throw new Error('Invalid response');
      }
    } catch (error: any) {
      console.error('Error generating section:', error);

      const status =
        error?.context?.status ??
        error?.status ??
        (typeof error?.message === 'string' && error.message.includes('429') ? 429 : undefined);

      if (status === 429) {
        toast.error(
          lang === 'uz'
            ? "AI vaqtincha cheklov qo'ydi (429). Biroz kutib, qaytadan urinib ko'ring."
            : lang === 'ru'
              ? 'Превышен лимит запросов (429). Подождите и попробуйте снова.'
              : 'Rate limit reached (429). Please wait and try again.'
        );
      } else {
        toast.error(t.generationError);
      }
    } finally {
      setGeneratingSectionId(null);
      setIsGenerating(false);
      setGenerationProgress("");
      setExpandedSection(sectionId);
    }
  };

  // Batch generate all sections sequentially
  const handleBatchGenerate = async () => {
    const generableSections = sections.filter(
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
    setBatchProgress({ current: 0, total: generableSections.length });

    for (let i = 0; i < generableSections.length; i++) {
      if (batchCancelRef.current) break;

      setBatchProgress({ current: i + 1, total: generableSections.length });
      await handleGenerate(generableSections[i].id);

      // Small delay between generations to avoid rate limits
      if (i < generableSections.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Generate references at the end
    if (!batchCancelRef.current) {
      const refsSection = sections.find(s => isReferencesSection(s.name));
      if (refsSection) {
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

        {/* Title, progress, and actions */}
        <div className="glass-panel p-6 mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">{t.titleLabel}</p>
              <h2 className="text-xl font-serif text-foreground leading-relaxed">
                {title}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Copy full article */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleCopyAll}
                disabled={completedSections === 0}
              >
                <ClipboardCopy className="w-4 h-4" />
                {lang === 'uz' ? "Nusxalash" : lang === 'ru' ? "Копировать" : "Copy"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowPreview(true)}
                disabled={completedSections === 0}
              >
                <FileText className="w-4 h-4" />
                {t.preview}
              </Button>
              {/* Batch generate button */}
              {!isBatchGenerating ? (
                <Button
                  variant="hero"
                  size="sm"
                  className="gap-2"
                  onClick={handleBatchGenerate}
                  disabled={isGenerating || completedSections === sections.length}
                >
                  <Play className="w-4 h-4" />
                  {t.generateAll}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={handleCancelBatch}
                >
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
                <span className="text-muted-foreground">|</span>
                <span className="flex items-center gap-1 text-xs">
                  {verifiedCitations > 0 ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground">
                    {storedCitations.length} {lang === 'uz' ? "manba" : lang === 'ru' ? "источников" : "sources"}
                    {verifiedCitations > 0 && (
                      <span className="text-emerald-400 ml-1">({verifiedCitations} DOI)</span>
                    )}
                  </span>
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
            const isRefs = isReferencesSection(section.name);
            const isVariantsOpen = showVariants === section.id;

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
                      {section.status === 'GENERATED' || section.status === 'EDITED' ? (
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
                            {getSectionWordCount(section.content)} {lang === 'uz' ? "so'z" : lang === 'ru' ? "слов" : "words"}
                          </span>
                        )}
                        {isRefs && storedCitations.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({storedCitations.length} {lang === 'uz' ? "ta" : ""})
                          </span>
                        )}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            onClick={() => handleGenerate(section.id)}
                            disabled={isGenerating || (isRefs && storedCitations.length === 0)}
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

                          {/* Variants dropdown */}
                          {section.content && !isRefs && (
                            <div className="relative">
                              <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => setShowVariants(isVariantsOpen ? null : section.id)}
                                disabled={isGenerating}
                              >
                                <RefreshCw className="w-4 h-4" />
                                {t.variants}
                                <ChevronDown className="w-3 h-3" />
                              </Button>

                              <AnimatePresence>
                                {isVariantsOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-xl shadow-lg p-1 min-w-[200px]"
                                  >
                                    {variantOptions.map(variant => (
                                      <button
                                        key={variant.id}
                                        onClick={() => {
                                          setShowVariants(null);
                                          handleGenerate(section.id, variant.id);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors text-foreground"
                                      >
                                        {variant.label}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>

                        {/* Info for references section */}
                        {isRefs && storedCitations.length === 0 && (
                          <div className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                            {lang === 'uz'
                              ? "Avval boshqa bo'limlarni yarating. Manbalar avtomatik to'planadi."
                              : lang === 'ru'
                              ? "Сначала сгенерируйте другие разделы. Источники будут собраны автоматически."
                              : "Generate other sections first. References will be collected automatically."}
                          </div>
                        )}

                        {/* Content editor */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-muted-foreground">
                              {t.content}
                            </label>
                            <div className="flex items-center gap-2">
                              {section.content && (
                                <>
                                  <span className="text-xs text-muted-foreground">
                                    {getSectionWordCount(section.content)} {lang === 'uz' ? "so'z" : lang === 'ru' ? "слов" : "words"}
                                  </span>
                                  <button
                                    onClick={() => handleCopySection(section.content)}
                                    className="p-1 rounded-md hover:bg-secondary transition-colors"
                                    title={lang === 'uz' ? "Nusxalash" : lang === 'ru' ? "Копировать" : "Copy"}
                                  >
                                    <ClipboardCopy className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
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

                        {/* Targeted regeneration — only shown when section already has content */}
                        {section.content && !isRefs && (
                          <div className="border-t border-border pt-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <MessageSquarePlus className="w-4 h-4 text-primary" />
                              <label className="text-sm font-medium text-foreground">
                                {t.regenInstruction}
                              </label>
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
                              {isGeneratingThis ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
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

      {/* Article Preview Modal */}
      <ArticlePreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={title}
        sections={sections}
        language={lang}
      />
    </div>
  );
};
