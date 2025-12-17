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

const translations = {
  uz: {
    status: { GENERATED: "Generatsiya qilindi", EDITED: "Tahrirlandi", DRAFT: "Qoralama", EMPTY: "Bo'sh" },
    title: "Maqola yozish",
    subtitle: "Har bir bo'limni AI yordamida generatsiya qiling yoki qo'lda yozing",
    titleLabel: "Sarlavha",
    preview: "Oldindan ko'rish",
    progress: "Jarayon",
    sections: "bo'lim",
    content: "Kontent",
    notes: "Eslatmalar (ixtiyoriy)",
    notesPlaceholder: "Bu bo'lim uchun eslatmalar...",
    contentPlaceholder: "Bo'lim kontentini yozing yoki AI yordamida generatsiya qiling...",
    generating: "Generatsiya...",
    regenerate: "Qayta generatsiya",
    generate: "Generatsiya qilish",
    variants: "Boshqa variantlar",
    backToStructure: "Strukturaga qaytish",
    export: "Eksport qilish",
    progressSteps: ["Kontekst o'rganilmoqda...", "Kontent generatsiya qilinmoqda...", "Sayqallanmoqda..."],
    mockContent: (sectionName: string) => `Bu ${sectionName} bo'limi uchun generatsiya qilingan kontent namunasi.

Ushbu bo'limda tadqiqot mavzusining asosiy jihatlari tahlil qilinadi. Mavzuning dolzarbligi va ilmiy ahamiyati ko'rsatib o'tiladi.

Tadqiqot metodologiyasi va yondashuvlari batafsil yoritilgan. Olingan natijalar va xulosalar ilmiy jihatdan asoslantirilgan.`,
    summary: "Bo'lim generatsiya qilindi va asosiy fikrlar yoritildi."
  },
  ru: {
    status: { GENERATED: "Сгенерировано", EDITED: "Отредактировано", DRAFT: "Черновик", EMPTY: "Пусто" },
    title: "Написание статьи",
    subtitle: "Генерируйте каждый раздел с помощью ИИ или пишите вручную",
    titleLabel: "Заголовок",
    preview: "Предпросмотр",
    progress: "Прогресс",
    sections: "разделов",
    content: "Контент",
    notes: "Заметки (необязательно)",
    notesPlaceholder: "Заметки для этого раздела...",
    contentPlaceholder: "Напишите контент раздела или сгенерируйте с помощью ИИ...",
    generating: "Генерация...",
    regenerate: "Перегенерировать",
    generate: "Сгенерировать",
    variants: "Другие варианты",
    backToStructure: "Вернуться к структуре",
    export: "Экспортировать",
    progressSteps: ["Изучение контекста...", "Генерация контента...", "Полировка..."],
    mockContent: (sectionName: string) => `Это пример сгенерированного контента для раздела ${sectionName}.

В данном разделе анализируются основные аспекты темы исследования. Показана актуальность и научная значимость темы.

Подробно описаны методология и подходы исследования. Полученные результаты и выводы научно обоснованы.`,
    summary: "Раздел сгенерирован, основные идеи изложены."
  },
  en: {
    status: { GENERATED: "Generated", EDITED: "Edited", DRAFT: "Draft", EMPTY: "Empty" },
    title: "Write Article",
    subtitle: "Generate each section with AI or write manually",
    titleLabel: "Title",
    preview: "Preview",
    progress: "Progress",
    sections: "sections",
    content: "Content",
    notes: "Notes (optional)",
    notesPlaceholder: "Notes for this section...",
    contentPlaceholder: "Write section content or generate with AI...",
    generating: "Generating...",
    regenerate: "Regenerate",
    generate: "Generate",
    variants: "Other variants",
    backToStructure: "Back to structure",
    export: "Export",
    progressSteps: ["Analyzing context...", "Generating content...", "Polishing..."],
    mockContent: (sectionName: string) => `This is sample generated content for the ${sectionName} section.

This section analyzes the main aspects of the research topic. The relevance and scientific significance of the topic are demonstrated.

The research methodology and approaches are described in detail. The obtained results and conclusions are scientifically substantiated.`,
    summary: "Section generated with main ideas covered."
  }
};

const getStatusBadge = (status: SectionStatus, lang: 'uz' | 'ru' | 'en') => {
  const t = translations[lang];
  return { label: t.status[status], class: `status-${status.toLowerCase()}` };
};

export const WritePhase = () => {
  const { currentProject, setPhase, updateSection, isGenerating, setIsGenerating, setGenerationProgress } = useProjectStore();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null);
  
  const sections = currentProject?.sections || [];
  const title = currentProject?.title || "";
  const lang = (currentProject?.config?.language || 'uz') as 'uz' | 'ru' | 'en';
  const t = translations[lang];
  
  const handleGenerate = async (sectionId: string) => {
    setGeneratingSectionId(sectionId);
    setIsGenerating(true);
    setGenerationProgress(t.progressSteps[0]);
    
    // Simulate generation steps
    for (let i = 0; i < t.progressSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGenerationProgress(t.progressSteps[i]);
    }
    
    // Mock generated content in selected language
    const sectionName = sections.find(s => s.id === sectionId)?.name || '';
    const mockContent = t.mockContent(sectionName);
    
    updateSection(sectionId, { 
      content: mockContent, 
      status: "GENERATED",
      summary: t.summary
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
          <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
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
              <span className="text-foreground font-medium">{completedSections}/{sections.length} {t.sections}</span>
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
            const statusBadge = getStatusBadge(section.status, lang);
            
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
          <Button variant="hero" size="lg" className="gap-2">
            <FileText className="w-5 h-5" />
            {t.export}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
