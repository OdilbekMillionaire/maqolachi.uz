import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Globe, BookOpen, GraduationCap, Quote, Pen, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const stepsData: Record<string, Step[]> = {
  uz: [
    {
      icon: <Globe className="w-7 h-7" />,
      title: "Tilni tanlang",
      description: "Maqolangiz qaysi tilda yozilishini belgilang — o'zbek, ingliz yoki rus tilida.",
    },
    {
      icon: <BookOpen className="w-7 h-7" />,
      title: "Sohani belgilang",
      description: "Huquq, iqtisodiyot, IT, sotsiologiya — qaysi ilmiy soha ekanligini tanlang. AI to'g'ri manbalar topishda foydalanadi.",
    },
    {
      icon: <GraduationCap className="w-7 h-7" />,
      title: "Daraja va uslubni tanlang",
      description: "Bakalavr, magistr yoki PhD darajasini, iqtibos (APA, MLA...) va yozish uslubini belgilang.",
    },
    {
      icon: <Lightbulb className="w-7 h-7" />,
      title: "Asosiy g'oyani kiriting",
      description: "Tadqiqot savolingizni yozing va \"Sarlavhalar generatsiya qilish\" tugmasini bosing. AI bir necha variant taklif qiladi.",
    },
    {
      icon: <Pen className="w-7 h-7" />,
      title: "Struktura va yozish",
      description: "Keyingi bosqichlarda maqola tuzilishini sozlaysiz (bo'limlarni qo'shish/o'chirish), so'ng har bir bo'limni AI generatsiya qiladi.",
    },
  ],
  en: [
    {
      icon: <Globe className="w-7 h-7" />,
      title: "Select Language",
      description: "Choose the language your article will be written in — Uzbek, English, or Russian.",
    },
    {
      icon: <BookOpen className="w-7 h-7" />,
      title: "Choose Domain",
      description: "Law, Economics, IT, Sociology — select your academic field. AI uses this to find the right sources.",
    },
    {
      icon: <GraduationCap className="w-7 h-7" />,
      title: "Set Level & Style",
      description: "Pick your academic level (Bachelor/Master/PhD), citation format (APA, MLA...), and writing style.",
    },
    {
      icon: <Lightbulb className="w-7 h-7" />,
      title: "Enter Your Main Idea",
      description: "Type your research question and click \"Generate Titles\". AI will suggest several title options for you.",
    },
    {
      icon: <Pen className="w-7 h-7" />,
      title: "Structure & Write",
      description: "In the next steps, customize the article structure (add/remove sections), then let AI generate each section.",
    },
  ],
  ru: [
    {
      icon: <Globe className="w-7 h-7" />,
      title: "Выберите язык",
      description: "Укажите, на каком языке будет написана статья — узбекский, английский или русский.",
    },
    {
      icon: <BookOpen className="w-7 h-7" />,
      title: "Выберите область",
      description: "Право, экономика, ИТ, социология — укажите научную область. ИИ использует это для поиска источников.",
    },
    {
      icon: <GraduationCap className="w-7 h-7" />,
      title: "Уровень и стиль",
      description: "Выберите академический уровень (бакалавр/магистр/PhD), формат цитирования (APA, MLA...) и стиль написания.",
    },
    {
      icon: <Lightbulb className="w-7 h-7" />,
      title: "Введите основную идею",
      description: "Напишите исследовательский вопрос и нажмите «Сгенерировать заголовки». ИИ предложит несколько вариантов.",
    },
    {
      icon: <Pen className="w-7 h-7" />,
      title: "Структура и написание",
      description: "На следующих этапах настройте структуру статьи (добавьте/удалите разделы), затем ИИ сгенерирует каждый раздел.",
    },
  ],
};

export const OnboardingTour = () => {
  const { hasSeenTour, setHasSeenTour, language } = useSettingsStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);

  const lang = language || "uz";
  const steps = stepsData[lang] || stepsData["uz"];

  useEffect(() => {
    if (!hasSeenTour) {
      const timer = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour]);

  if (hasSeenTour || !show) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const close = () => {
    setShow(false);
    setHasSeenTour(true);
  };

  const next = () => {
    if (isLast) {
      close();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const skipLabel = lang === "uz" ? "O'tkazib yuborish" : lang === "ru" ? "Пропустить" : "Skip";
  const nextLabel = lang === "uz" ? "Keyingi" : lang === "ru" ? "Далее" : "Next";
  const prevLabel = lang === "uz" ? "Orqaga" : lang === "ru" ? "Назад" : "Back";
  const doneLabel = lang === "uz" ? "Boshlash!" : lang === "ru" ? "Начать!" : "Let's go!";
  const headerLabel =
    lang === "uz"
      ? "Qanday ishlaydi?"
      : lang === "ru"
        ? "Как это работает?"
        : "How does it work?";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {headerLabel} ({currentStep + 1}/{steps.length})
              </span>
              <button
                onClick={close}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="px-6 py-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center text-primary mb-4">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-between">
              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === currentStep
                        ? "w-6 bg-primary"
                        : i < currentStep
                          ? "w-1.5 bg-primary/40"
                          : "w-1.5 bg-muted"
                    )}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2">
                {currentStep === 0 ? (
                  <Button variant="ghost" size="sm" onClick={close} className="text-muted-foreground">
                    {skipLabel}
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={prev} className="gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {prevLabel}
                  </Button>
                )}
                <Button size="sm" onClick={next} className="gap-1">
                  {isLast ? (
                    doneLabel
                  ) : (
                    <>
                      {nextLabel}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
