import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

interface TourStep {
  target: string; // CSS selector or data attribute
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

const tourSteps: Record<string, TourStep[]> = {
  uz: [
    {
      target: '[data-tour="language"]',
      title: "1. Tilni tanlang",
      description: "Maqolangiz qaysi tilda yozilishini belgilang. O'zbek, ingliz yoki rus tilini tanlashingiz mumkin.",
      position: "bottom",
    },
    {
      target: '[data-tour="domain"]',
      title: "2. Sohani belgilang",
      description: "Maqolangiz qaysi ilmiy sohaga tegishli ekanligini tanlang. Bu AI ga to'g'ri manbalar topishda yordam beradi.",
      position: "bottom",
    },
    {
      target: '[data-tour="level"]',
      title: "3. Akademik daraja",
      description: "Bakalavr, magistr yoki PhD — maqolangizning ilmiy darajasini tanlang. Bu murakkablik va chuqurlik darajasini belgilaydi.",
      position: "bottom",
    },
    {
      target: '[data-tour="citation"]',
      title: "4. Iqtibos uslubi",
      description: "Manbalarni qanday formatda ko'rsatishni tanlang: APA, MLA, Chicago yoki OSCOLA.",
      position: "bottom",
    },
    {
      target: '[data-tour="style"]',
      title: "5. Yozish uslubi",
      description: "Rasmiy (akademik), tabiiy (o'qishga oson) yoki sayqallangan (professional) uslubni tanlang.",
      position: "bottom",
    },
    {
      target: '[data-tour="main-idea"]',
      title: "6. Asosiy g'oya",
      description: "Bu eng muhim qism! Maqolangizning asosiy g'oyasi yoki tadqiqot savolini kiriting. Keyin AI sarlavhalar taklif qiladi.",
      position: "top",
    },
  ],
  en: [
    {
      target: '[data-tour="language"]',
      title: "1. Select Language",
      description: "Choose the language for your article. You can select Uzbek, English, or Russian.",
      position: "bottom",
    },
    {
      target: '[data-tour="domain"]',
      title: "2. Choose Domain",
      description: "Select the academic field of your article. This helps AI find relevant sources.",
      position: "bottom",
    },
    {
      target: '[data-tour="level"]',
      title: "3. Academic Level",
      description: "Bachelor, Master, or PhD — select the academic level. This determines the depth and complexity.",
      position: "bottom",
    },
    {
      target: '[data-tour="citation"]',
      title: "4. Citation Style",
      description: "Choose how references are formatted: APA, MLA, Chicago, or OSCOLA.",
      position: "bottom",
    },
    {
      target: '[data-tour="style"]',
      title: "5. Writing Style",
      description: "Choose Formal (academic), Natural (easy to read), or Polished (professional).",
      position: "bottom",
    },
    {
      target: '[data-tour="main-idea"]',
      title: "6. Main Idea",
      description: "This is the most important part! Enter your article's main idea or research question. Then AI will suggest titles.",
      position: "top",
    },
  ],
  ru: [
    {
      target: '[data-tour="language"]',
      title: "1. Выберите язык",
      description: "Выберите язык статьи. Доступны узбекский, английский и русский.",
      position: "bottom",
    },
    {
      target: '[data-tour="domain"]',
      title: "2. Выберите область",
      description: "Укажите научную область вашей статьи. Это поможет ИИ найти релевантные источники.",
      position: "bottom",
    },
    {
      target: '[data-tour="level"]',
      title: "3. Академический уровень",
      description: "Бакалавр, магистр или PhD — выберите уровень. Это определяет глубину и сложность.",
      position: "bottom",
    },
    {
      target: '[data-tour="citation"]',
      title: "4. Стиль цитирования",
      description: "Выберите формат оформления источников: APA, MLA, Chicago или OSCOLA.",
      position: "bottom",
    },
    {
      target: '[data-tour="style"]',
      title: "5. Стиль написания",
      description: "Формальный (академический), естественный (легко читать) или отточенный (профессиональный).",
      position: "bottom",
    },
    {
      target: '[data-tour="main-idea"]',
      title: "6. Основная идея",
      description: "Самая важная часть! Введите основную идею или исследовательский вопрос. Затем ИИ предложит заголовки.",
      position: "top",
    },
  ],
};

export const OnboardingTour = () => {
  const { hasSeenTour, setHasSeenTour, language } = useSettingsStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const lang = language || 'uz';
  const steps = tourSteps[lang] || tourSteps['uz'];

  useEffect(() => {
    if (!hasSeenTour) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour]);

  useEffect(() => {
    if (!isVisible) return;
    const step = steps[currentStep];
    if (!step) return;

    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, isVisible, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setHasSeenTour(true);
  };

  if (hasSeenTour || !isVisible) return null;

  const step = steps[currentStep];
  if (!step) return null;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const padding = 16;
    switch (step.position) {
      case "bottom":
        return {
          top: targetRect.bottom + padding,
          left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 370)),
        };
      case "top":
        return {
          bottom: window.innerHeight - targetRect.top + padding,
          left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 370)),
        };
      case "right":
        return {
          top: targetRect.top,
          left: targetRect.right + padding,
        };
      case "left":
        return {
          top: targetRect.top,
          right: window.innerWidth - targetRect.left + padding,
        };
      default:
        return { top: targetRect.bottom + padding, left: targetRect.left };
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]"
            onClick={handleClose}
          />

          {/* Highlight target element */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[91] rounded-xl ring-4 ring-primary/60 ring-offset-2 ring-offset-background pointer-events-none"
              style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: step.position === 'top' ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed z-[92] w-[340px] bg-card border border-border rounded-xl shadow-2xl p-5"
            style={getTooltipStyle()}
          >
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1 rounded-md hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {step.description}
            </p>

            <div className="flex items-center justify-between">
              {/* Step indicator */}
              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      i === currentStep ? "bg-primary" : i < currentStep ? "bg-primary/40" : "bg-muted"
                    )}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button variant="ghost" size="sm" onClick={handlePrev} className="gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    {lang === 'uz' ? "Oldingi" : lang === 'ru' ? "Назад" : "Back"}
                  </Button>
                )}
                <Button size="sm" onClick={handleNext} className="gap-1">
                  {currentStep < steps.length - 1 ? (
                    <>
                      {lang === 'uz' ? "Keyingi" : lang === 'ru' ? "Далее" : "Next"}
                      <ArrowRight className="w-3 h-3" />
                    </>
                  ) : (
                    lang === 'uz' ? "Tushunarli!" : lang === 'ru' ? "Понятно!" : "Got it!"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
