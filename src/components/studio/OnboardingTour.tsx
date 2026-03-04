import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Globe, BookOpen, GraduationCap, Lightbulb, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  scrollTo?: string; // data-tour attribute to scroll to
}

const configSteps: Record<string, TourStep[]> = {
  uz: [
    {
      icon: <Globe className="w-6 h-6" />,
      title: "1. Tilni tanlang",
      description: "Maqolangiz qaysi tilda yozilishini belgilang — o'zbek, ingliz yoki rus tilida.",
      scrollTo: "language",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "2. Sohani belgilang",
      description: "Huquq, iqtisodiyot, IT — qaysi ilmiy soha ekanligini tanlang. AI manbalar topishda foydalanadi.",
      scrollTo: "domain",
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: "3. Daraja va uslub",
      description: "Bakalavr/Magistr/PhD darajasini, iqtibos formatini (APA, MLA...) va yozish uslubini belgilang.",
      scrollTo: "level",
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: "4. Asosiy g'oya",
      description: "Tadqiqot savolingizni yozing va \"Sarlavhalar generatsiya qilish\" tugmasini bosing. AI sarlavhalar taklif qiladi.",
      scrollTo: "main-idea",
    },
    {
      icon: <Pen className="w-6 h-6" />,
      title: "5. Keyingi qadamlar",
      description: "Sarlavhani tanlagach, \"Keyingi bosqich\" tugmasini bosing. Maqola tuzilishi va yozish sahifalari kutmoqda!",
      scrollTo: "next-step",
    },
  ],
  en: [
    {
      icon: <Globe className="w-6 h-6" />,
      title: "1. Select Language",
      description: "Choose the language for your article — Uzbek, English, or Russian.",
      scrollTo: "language",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "2. Choose Domain",
      description: "Law, Economics, IT — select your field. AI uses this to find relevant sources.",
      scrollTo: "domain",
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: "3. Level & Style",
      description: "Pick academic level (Bachelor/Master/PhD), citation format (APA, MLA...) and writing style.",
      scrollTo: "level",
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: "4. Main Idea",
      description: "Type your research question and click \"Generate Titles\". AI will suggest title options.",
      scrollTo: "main-idea",
    },
    {
      icon: <Pen className="w-6 h-6" />,
      title: "5. Next Steps",
      description: "After picking a title, click \"Next Step\". Article structure and writing pages are waiting!",
      scrollTo: "next-step",
    },
  ],
  ru: [
    {
      icon: <Globe className="w-6 h-6" />,
      title: "1. Выберите язык",
      description: "Укажите язык статьи — узбекский, английский или русский.",
      scrollTo: "language",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "2. Выберите область",
      description: "Право, экономика, ИТ — укажите область. ИИ использует это для поиска источников.",
      scrollTo: "domain",
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: "3. Уровень и стиль",
      description: "Выберите уровень (бакалавр/магистр/PhD), формат цитирования (APA, MLA...) и стиль.",
      scrollTo: "level",
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: "4. Основная идея",
      description: "Введите исследовательский вопрос и нажмите «Сгенерировать заголовки». ИИ предложит варианты.",
      scrollTo: "main-idea",
    },
    {
      icon: <Pen className="w-6 h-6" />,
      title: "5. Дальнейшие шаги",
      description: "Выбрав заголовок, нажмите «Следующий этап». Впереди — структура и написание статьи!",
      scrollTo: "next-step",
    },
  ],
};

export const OnboardingTour = () => {
  const { hasSeenTour, setHasSeenTour, language } = useSettingsStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);

  const lang = language || "uz";
  const steps = configSteps[lang] || configSteps["uz"];

  useEffect(() => {
    if (!hasSeenTour) {
      const timer = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour]);

  const scrollToTarget = useCallback((scrollTo?: string) => {
    if (!scrollTo) return;
    const el = document.querySelector(`[data-tour="${scrollTo}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Briefly highlight the element
      el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
      }, 2000);
    }
  }, []);

  useEffect(() => {
    if (show && steps[currentStep]?.scrollTo) {
      // Small delay to let the modal render, then scroll
      const timer = setTimeout(() => scrollToTarget(steps[currentStep].scrollTo), 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, show, steps, scrollToTarget]);

  if (hasSeenTour || !show) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const close = () => { setShow(false); setHasSeenTour(true); };
  const next = () => { if (isLast) close(); else setCurrentStep(s => s + 1); };
  const prev = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };

  const skipLabel = lang === "uz" ? "O'tkazib yuborish" : lang === "ru" ? "Пропустить" : "Skip";
  const nextLabel = lang === "uz" ? "Keyingi" : lang === "ru" ? "Далее" : "Next";
  const prevLabel = lang === "uz" ? "Orqaga" : lang === "ru" ? "Назад" : "Back";
  const doneLabel = lang === "uz" ? "Tushunarli!" : lang === "ru" ? "Понятно!" : "Got it!";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="relative z-30 mb-6 bg-card border border-primary/30 rounded-2xl shadow-xl overflow-hidden"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.2 }}
              className="p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary flex-shrink-0">
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
                </div>
                <button onClick={close} className="p-1 rounded-md hover:bg-secondary transition-colors flex-shrink-0">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="px-5 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <div key={i} className={cn("h-1.5 rounded-full transition-all duration-300", i === currentStep ? "w-5 bg-primary" : i < currentStep ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted")} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {currentStep === 0 ? (
                <Button variant="ghost" size="sm" onClick={close} className="text-muted-foreground text-xs h-8">{skipLabel}</Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={prev} className="gap-1 text-xs h-8"><ArrowLeft className="w-3 h-3" />{prevLabel}</Button>
              )}
              <Button size="sm" onClick={next} className="gap-1 text-xs h-8">
                {isLast ? doneLabel : <>{nextLabel}<ArrowRight className="w-3 h-3" /></>}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
