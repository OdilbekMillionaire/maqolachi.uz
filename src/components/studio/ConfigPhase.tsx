import { motion } from "framer-motion";
import { useState } from "react";
import { 
  Globe, 
  BookOpen, 
  GraduationCap, 
  Quote, 
  Layout, 
  Sparkles,
  ArrowRight,
  Loader2,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore, Language, Domain, AcademicLevel, CitationStyle, StyleMode } from "@/store/projectStore";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const languages: { id: Language; label: string; flag: string }[] = [
  { id: "uz", label: "O'zbek", flag: "🇺🇿" },
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "ru", label: "Русский", flag: "🇷🇺" },
];

const domains: { id: Domain; label: string; icon: string }[] = [
  { id: "law", label: "Huquq", icon: "⚖️" },
  { id: "economics", label: "Iqtisodiyot", icon: "📈" },
  { id: "cs-ai", label: "IT va AI", icon: "🤖" },
  { id: "sociology", label: "Sotsiologiya", icon: "👥" },
  { id: "biology", label: "Biologiya", icon: "🧬" },
  { id: "history", label: "Tarix", icon: "📜" },
  { id: "other", label: "Boshqa", icon: "📚" },
];

const academicLevels: { id: AcademicLevel; label: string }[] = [
  { id: "bachelor", label: "Bakalavr" },
  { id: "master", label: "Magistr" },
  { id: "phd", label: "PhD" },
];

const citationStyles: { id: CitationStyle; label: string; description: string }[] = [
  { id: "apa", label: "APA", description: "Ijtimoiy fanlar" },
  { id: "mla", label: "MLA", description: "Gumanitar fanlar" },
  { id: "chicago", label: "Chicago", description: "Tarix, san'at" },
  { id: "oscola", label: "OSCOLA", description: "Huquq" },
];

const styleModes: { id: StyleMode; label: string; description: string }[] = [
  { id: "formal", label: "Rasmiy", description: "Akademik va ilmiy" },
  { id: "natural", label: "Tabiiy", description: "O'qishga oson" },
  { id: "polished", label: "Sayqallangan", description: "Professional" },
];

export const ConfigPhase = () => {
  const { currentProject, updateConfig, setGeneratedTitles, setTitle, setPhase, setIsGenerating, setGenerationProgress } = useProjectStore();
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  
  const config = currentProject?.config;
  const generatedTitles = currentProject?.generatedTitles || [];
  
  const handleGenerateTitles = async () => {
    if (!config?.mainIdea) return;
    
    setIsGeneratingTitles(true);
    setGenerationProgress("Sarlavhalar generatsiya qilinmoqda...");
    
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
        toast.success("Sarlavhalar muvaffaqiyatli generatsiya qilindi!");
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error generating titles:', error);
      toast.error("Sarlavhalarni generatsiya qilishda xatolik yuz berdi");
    } finally {
      setIsGeneratingTitles(false);
      setGenerationProgress("");
    }
  };
  
  const handleSelectTitle = (index: number) => {
    setSelectedTitleIndex(index);
    setTitle(generatedTitles[index]);
  };
  
  const handleNext = () => {
    setPhase("skeleton");
  };
  
  const canProceed = currentProject?.title && config?.mainIdea;
  
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Loyiha sozlamalari</h1>
          <p className="text-muted-foreground">
            Maqola parametrlarini belgilang va asosiy g'oyangizni kiriting
          </p>
        </div>
        
        <div className="space-y-8">
          {/* Language selection */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Til</h2>
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
              <h2 className="font-semibold">Soha</h2>
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
                <h2 className="font-semibold">Daraja</h2>
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
                <h2 className="font-semibold">Iqtibos uslubi</h2>
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
              <h2 className="font-semibold">Yozish uslubi</h2>
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
          
          {/* Main idea input */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Asosiy g'oya / Tadqiqot savoli</h2>
            </div>
            <textarea
              value={config?.mainIdea || ""}
              onChange={(e) => updateConfig({ mainIdea: e.target.value })}
              placeholder="Maqolangizning asosiy g'oyasi yoki tadqiqot savolini kiriting..."
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
                    Generatsiya...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Sarlavhalar generatsiya qilish
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
              <h2 className="font-semibold mb-4">Taklif qilingan sarlavhalar</h2>
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
          
          {/* Next button */}
          <div className="flex justify-end pt-4">
            <Button
              variant="hero"
              size="lg"
              onClick={handleNext}
              disabled={!canProceed}
              className="gap-2"
            >
              Keyingi bosqich
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
