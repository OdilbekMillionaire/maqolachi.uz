import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import {
  Globe,
  BookOpen,
  GraduationCap,
  Quote,
  Layout,
  Sparkles,
  ArrowRight,
  Loader2,
  Check,
  Edit3,
  Wand2,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore, Language, Domain, AcademicLevel, CitationStyle, StyleMode } from "@/store/projectStore";
import { useSettingsStore } from "@/store/settingsStore";
import { usePaymentStore } from "@/store/paymentStore";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getTranslation } from "@/lib/translations";
import { calculatePrice, formatPrice, type PricingFactors } from "@/lib/pricing";

export const ConfigPhase = () => {
  const { currentProject, updateConfig, setGeneratedTitles, setTitle, setPhase, setGenerationProgress } = useProjectStore();
  const { humanizeContent, setHumanizeContent } = useSettingsStore();
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  
  const config = currentProject?.config;
  const generatedTitles = currentProject?.generatedTitles || [];
  const lang = (config?.language || 'uz') as Language;
  const t = getTranslation(lang);
  
  const languages: { id: Language; label: string; flag: string }[] = [
    { id: "uz", label: "O'zbek", flag: "🇺🇿" },
    { id: "en", label: "English", flag: "🇬🇧" },
    { id: "ru", label: "Русский", flag: "🇷🇺" },
  ];

  const domains: { id: Domain; label: string; icon: string }[] = [
    { id: "law", label: t.domainLaw, icon: "⚖️" },
    { id: "economics", label: t.domainEconomics, icon: "📈" },
    { id: "cs-ai", label: t.domainCsAi, icon: "🤖" },
    { id: "sociology", label: t.domainSociology, icon: "👥" },
    { id: "biology", label: t.domainBiology, icon: "🧬" },
    { id: "history", label: t.domainHistory, icon: "📜" },
    { id: "other", label: t.domainOther, icon: "📚" },
  ];

  const academicLevels: { id: AcademicLevel; label: string }[] = [
    { id: "bachelor", label: t.levelBachelor },
    { id: "master", label: t.levelMaster },
    { id: "phd", label: t.levelPhd },
  ];

  const citationStyles: { id: CitationStyle; label: string; description: string }[] = [
    { id: "apa", label: t.citationApa, description: t.citationApaDesc },
    { id: "mla", label: t.citationMla, description: t.citationMlaDesc },
    { id: "chicago", label: t.citationChicago, description: t.citationChicagoDesc },
    { id: "oscola", label: t.citationOscola, description: t.citationOscolaDesc },
  ];

  const styleModes: { id: StyleMode; label: string; description: string }[] = [
    { id: "formal", label: t.styleFormal, description: t.styleFormalDesc },
    { id: "natural", label: t.styleNatural, description: t.styleNaturalDesc },
    { id: "polished", label: t.stylePolished, description: t.stylePolishedDesc },
  ];
  
  const handleGenerateTitles = async () => {
    if (!config?.mainIdea) return;
    
    setIsGeneratingTitles(true);
    setGenerationProgress(t.generating);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          type: 'titles',
          config: {
            ...config,
            mainIdea: config.mainIdea,
          }
        }
      });
      
      if (error) throw error;
      
      if (data?.titles && Array.isArray(data.titles)) {
        setGeneratedTitles(data.titles);
        toast.success(t.titlesGenerated);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error generating titles:', error);
      toast.error(t.titlesError);
    } finally {
      setIsGeneratingTitles(false);
      setGenerationProgress("");
    }
  };
  
  const handleSelectTitle = (index: number) => {
    setSelectedTitleIndex(index);
    setTitle(generatedTitles[index]);
  };
  
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
  };
  
  const handleNext = () => {
    setPhase("skeleton");
  };
  
  const canProceed = currentProject?.title && config?.mainIdea;

  const { setRequiredAmount } = usePaymentStore();

  const priceBreakdown = useMemo(() => {
    const factors: PricingFactors = {
      academicLevel: config?.academicLevel || 'bachelor',
      domain: config?.domain || 'other',
      humanize: humanizeContent,
      modelMode: config?.modelMode || 'fast',
      styleMode: config?.styleMode || 'formal',
      citationStyle: config?.citationStyle || 'apa',
      sectionCount: currentProject?.sections?.length || 7,
    };
    const breakdown = calculatePrice(factors);
    setRequiredAmount(breakdown.total);
    return breakdown;
  }, [config, humanizeContent, currentProject?.sections?.length]);

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t.configTitle}</h1>
          <p className="text-muted-foreground">{t.configSubtitle}</p>
        </div>
        
        <div className="space-y-8">
          {/* Language selection */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{t.language}</h2>
            </div>
            <div className="flex gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => updateConfig({ language: lang.id })}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all",
                    config?.language === lang.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="font-medium">{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Domain selection */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{t.domain}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {domains.map((domain) => (
                <button
                  key={domain.id}
                  onClick={() => updateConfig({ domain: domain.id })}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-left",
                    config?.domain === domain.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <span className="text-xl">{domain.icon}</span>
                  <span className="font-medium text-sm">{domain.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Academic level and citation style */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-panel p-6">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">{t.level}</h2>
              </div>
              <div className="space-y-2">
                {academicLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => updateConfig({ academicLevel: level.id })}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                      config?.academicLevel === level.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {config?.academicLevel === level.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                    <span className="font-medium">{level.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="glass-panel p-6">
              <div className="flex items-center gap-2 mb-4">
                <Quote className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">{t.citationStyle}</h2>
              </div>
              <div className="space-y-2">
                {citationStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => updateConfig({ citationStyle: style.id })}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                      config?.citationStyle === style.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/50 hover:border-primary/50"
                    )}
                  >
                    <span className={cn(
                      "font-medium",
                      config?.citationStyle === style.id ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {style.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{style.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Writing style */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layout className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{t.writingStyle}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {styleModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => updateConfig({ styleMode: mode.id })}
                  className={cn(
                    "flex flex-col items-start px-4 py-4 rounded-xl border transition-all text-left",
                    config?.styleMode === mode.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/50 hover:border-primary/50"
                  )}
                >
                  <span className={cn(
                    "font-medium mb-1",
                    config?.styleMode === mode.id ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {mode.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{mode.description}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Humanization toggle */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wand2 className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">
                {lang === 'uz' ? 'Humanizatsiya' : lang === 'ru' ? 'Гуманизация' : 'Humanization'}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {lang === 'uz' 
                ? "AI detektorlari tomonidan aniqlanmaydigan matn yaratish"
                : lang === 'ru'
                ? 'Создание текста, не определяемого детекторами ИИ'
                : 'Generate text undetectable by AI detectors'}
            </p>
            <button
              onClick={() => setHumanizeContent(!humanizeContent)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                humanizeContent
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {humanizeContent 
                    ? (lang === 'uz' ? 'Yoqilgan' : lang === 'ru' ? 'Включено' : 'Enabled')
                    : (lang === 'uz' ? "O'chirilgan" : lang === 'ru' ? 'Отключено' : 'Disabled')
                  }
                </span>
              </div>
              <div className={cn(
                "w-10 h-6 rounded-full p-1 transition-colors",
                humanizeContent ? "bg-primary" : "bg-muted"
              )}>
                <div className={cn(
                  "w-4 h-4 rounded-full bg-white transition-transform",
                  humanizeContent && "translate-x-4"
                )} />
              </div>
            </button>
          </div>
          
          {/* Main idea input */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{t.mainIdea}</h2>
            </div>
            <textarea
              value={config?.mainIdea || ""}
              onChange={(e) => updateConfig({ mainIdea: e.target.value })}
              placeholder={t.mainIdeaPlaceholder}
              className="w-full h-32 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
            />
            
            {/* Generate titles button */}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleGenerateTitles}
                disabled={!config?.mainIdea || isGeneratingTitles}
                className="gap-2"
              >
                {isGeneratingTitles ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.generating}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {t.generateTitles}
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Generated titles */}
          {generatedTitles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6"
            >
              <h2 className="font-semibold mb-4">{t.suggestedTitles}</h2>
              <div className="space-y-2">
                {generatedTitles.map((title, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTitle(index)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                      selectedTitleIndex === index
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      selectedTitleIndex === index
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}>
                      {selectedTitleIndex === index ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <span className={cn(
                      "font-serif text-lg leading-relaxed",
                      selectedTitleIndex === index ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {title}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Editable title field */}
          {currentProject?.title && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 border-2 border-primary/30"
            >
              <div className="flex items-center gap-2 mb-4">
                <Edit3 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">{t.selectedTitle}</h2>
              </div>
              <textarea
                value={currentProject.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={t.editTitlePlaceholder}
                className="w-full h-24 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none font-serif text-lg leading-relaxed"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {lang === 'uz' && "Agar kerak bo'lsa, sarlavhani tahrirlashingiz mumkin"}
                {lang === 'en' && "You can edit the title if needed"}
                {lang === 'ru' && "Вы можете отредактировать заголовок при необходимости"}
              </p>
            </motion.div>
          )}
          
          {/* Live pricing calculator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 border-2 border-primary/20"
          >
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">
                {lang === 'uz' ? "Narx kalkulyatori" : lang === 'ru' ? 'Калькулятор цен' : 'Price Calculator'}
              </h2>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-muted-foreground">
                <span>{lang === 'uz' ? "Asosiy narx" : lang === 'ru' ? 'Базовая цена' : 'Base price'}</span>
                <span>{formatPrice(priceBreakdown.base)}</span>
              </div>
              {priceBreakdown.levelAddon > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{lang === 'uz' ? "Akademik daraja" : lang === 'ru' ? 'Акад. уровень' : 'Academic level'}</span>
                  <span>+{formatPrice(priceBreakdown.levelAddon)}</span>
                </div>
              )}
              {priceBreakdown.domainAddon > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{lang === 'uz' ? "Soha murakkabligi" : lang === 'ru' ? 'Сложность области' : 'Domain'}</span>
                  <span>+{formatPrice(priceBreakdown.domainAddon)}</span>
                </div>
              )}
              {priceBreakdown.humanizeAddon > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{lang === 'uz' ? "Humanizatsiya" : lang === 'ru' ? 'Гуманизация' : 'Humanization'}</span>
                  <span>+{formatPrice(priceBreakdown.humanizeAddon)}</span>
                </div>
              )}
              {priceBreakdown.qualityAddon > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{lang === 'uz' ? "Sifatli rejim" : lang === 'ru' ? 'Режим качества' : 'Quality mode'}</span>
                  <span>+{formatPrice(priceBreakdown.qualityAddon)}</span>
                </div>
              )}
              {priceBreakdown.styleAddon > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{lang === 'uz' ? "Yozish uslubi" : lang === 'ru' ? 'Стиль письма' : 'Writing style'}</span>
                  <span>+{formatPrice(priceBreakdown.styleAddon)}</span>
                </div>
              )}
              {priceBreakdown.citationAddon > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{lang === 'uz' ? "Iqtibos formati" : lang === 'ru' ? 'Формат цитат' : 'Citation style'}</span>
                  <span>+{formatPrice(priceBreakdown.citationAddon)}</span>
                </div>
              )}
              {priceBreakdown.sectionsAddon > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{lang === 'uz' ? "Qo'shimcha bo'limlar" : lang === 'ru' ? 'Доп. разделы' : 'Extra sections'}</span>
                  <span>+{formatPrice(priceBreakdown.sectionsAddon)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 mt-3 flex justify-between items-center">
                <span className="font-semibold text-foreground text-base">
                  {lang === 'uz' ? "Jami" : lang === 'ru' ? 'Итого' : 'Total'}
                </span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(priceBreakdown.total)}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {lang === 'uz'
                ? "Yuqoridagi sozlamalarni o'zgartirsangiz, narx avtomatik yangilanadi"
                : lang === 'ru'
                ? 'Цена автоматически обновляется при изменении настроек'
                : 'Price updates automatically as you change settings'}
            </p>
          </motion.div>

          {/* Next button */}
          <div className="flex justify-end pt-4">
            <Button
              variant="hero"
              size="lg"
              onClick={handleNext}
              disabled={!canProceed}
              className="gap-2"
            >
              {t.nextStep}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
