import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, LayoutTemplate, GripVertical, Plus, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  scrollTo?: string;
}

const skeletonSteps: Record<string, TourStep[]> = {
  uz: [
    {
      icon: <LayoutTemplate className="w-6 h-6" />,
      title: "1. Maqola turini tanlang",
      description: "IMRAD, Adabiyotlar sharhi, Keys-stadi, Argumentativ yoki Maxsus — maqolangizga mos tuzilmani tanlang.",
      scrollTo: "template-selector",
    },
    {
      icon: <GripVertical className="w-6 h-6" />,
      title: "2. Bo'limlarni tartibga keltiring",
      description: "Bo'limlarni suring (drag) orqali tartibini o'zgartiring, nomini tahrirlang yoki keraksizlarini o'chiring.",
      scrollTo: "sections-list",
    },
    {
      icon: <Plus className="w-6 h-6" />,
      title: "3. Yangi bo'lim qo'shing",
      description: "\"Bo'lim qo'shish\" tugmasi orqali maxsus bo'limlar qo'shishingiz mumkin.",
      scrollTo: "sections-list",
    },
    {
      icon: <Pen className="w-6 h-6" />,
      title: "4. Yozishni boshlang!",
      description: "Tayyor bo'lgach, \"Yozishni boshlash\" tugmasini bosing. AI har bir bo'limni generatsiya qiladi.",
      scrollTo: "start-writing",
    },
  ],
  en: [
    {
      icon: <LayoutTemplate className="w-6 h-6" />,
      title: "1. Choose Article Type",
      description: "IMRAD, Literature Review, Case Study, Argumentative, or Custom — pick the right structure for your article.",
      scrollTo: "template-selector",
    },
    {
      icon: <GripVertical className="w-6 h-6" />,
      title: "2. Arrange Sections",
      description: "Drag sections to reorder, edit names, or remove ones you don't need.",
      scrollTo: "sections-list",
    },
    {
      icon: <Plus className="w-6 h-6" />,
      title: "3. Add Custom Sections",
      description: "Use the \"Add Section\" button to add any custom sections you need.",
      scrollTo: "sections-list",
    },
    {
      icon: <Pen className="w-6 h-6" />,
      title: "4. Start Writing!",
      description: "When ready, click \"Start Writing\". AI will generate each section for you.",
      scrollTo: "start-writing",
    },
  ],
  ru: [
    {
      icon: <LayoutTemplate className="w-6 h-6" />,
      title: "1. Выберите тип статьи",
      description: "ИМРАД, Обзор литературы, Кейс-стади, Аргументативная или Пользовательская — выберите подходящую структуру.",
      scrollTo: "template-selector",
    },
    {
      icon: <GripVertical className="w-6 h-6" />,
      title: "2. Упорядочьте разделы",
      description: "Перетаскивайте разделы для изменения порядка, редактируйте названия или удаляйте ненужные.",
      scrollTo: "sections-list",
    },
    {
      icon: <Plus className="w-6 h-6" />,
      title: "3. Добавьте разделы",
      description: "Кнопка «Добавить раздел» позволяет добавить любые пользовательские разделы.",
      scrollTo: "sections-list",
    },
    {
      icon: <Pen className="w-6 h-6" />,
      title: "4. Начните писать!",
      description: "Когда всё готово, нажмите «Начать написание». ИИ сгенерирует каждый раздел.",
      scrollTo: "start-writing",
    },
  ],
};

export const SkeletonTour = () => {
  const { hasSeenSkeletonTour, setHasSeenSkeletonTour, language } = useSettingsStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);

  const lang = language || "uz";
  const steps = skeletonSteps[lang] || skeletonSteps["uz"];

  useEffect(() => {
    if (!hasSeenSkeletonTour) {
      const timer = setTimeout(() => setShow(true), 400);
      return () => clearTimeout(timer);
    }
  }, [hasSeenSkeletonTour]);

  const scrollToTarget = useCallback((scrollTo?: string) => {
    if (!scrollTo) return;
    const el = document.querySelector(`[data-tour="${scrollTo}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
      }, 2000);
    }
  }, []);

  useEffect(() => {
    if (show && steps[currentStep]?.scrollTo) {
      const timer = setTimeout(() => scrollToTarget(steps[currentStep].scrollTo), 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, show, steps, scrollToTarget]);

  if (hasSeenSkeletonTour || !show) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const close = () => { setShow(false); setHasSeenSkeletonTour(true); };
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
