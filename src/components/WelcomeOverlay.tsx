import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sun, Moon, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore, Theme } from "@/store/settingsStore";
import type { Language } from "@/lib/translations";
import { cn } from "@/lib/utils";

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'uz', label: "O'zbek tili", flag: '🇺🇿' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

export const WelcomeOverlay = () => {
  const { language, theme, hasSeenWelcome, setLanguage, setTheme, setHasSeenWelcome } = useSettingsStore();
  
  if (hasSeenWelcome) return null;
  
  const welcomeText = {
    uz: {
      title: "MAQOLACHI'ga xush kelibsiz",
      subtitle: "AI yordamchi akademik maqola yozish platformasi",
      selectLanguage: "Tilni tanlang",
      selectTheme: "Mavzuni tanlang",
      dark: "Qorong'u",
      light: "Yorug'",
      continue: "Davom etish",
    },
    en: {
      title: "Welcome to MAQOLACHI",
      subtitle: "AI-powered academic article writing platform",
      selectLanguage: "Select language",
      selectTheme: "Select theme",
      dark: "Dark",
      light: "Light",
      continue: "Continue",
    },
    ru: {
      title: "Добро пожаловать в MAQOLACHI",
      subtitle: "Платформа для написания научных статей с ИИ",
      selectLanguage: "Выберите язык",
      selectTheme: "Выберите тему",
      dark: "Тёмная",
      light: "Светлая",
      continue: "Продолжить",
    },
  };
  
  const t = welcomeText[language];
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="glass-panel p-8 md:p-12 max-w-lg w-full mx-4 text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6"
          >
            <BookOpen className="w-10 h-10 text-primary" />
          </motion.div>
          
          {/* Title */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-3xl font-bold text-foreground mb-2"
          >
            {t.title}
          </motion.h1>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-muted-foreground mb-8"
          >
            {t.subtitle}
          </motion.p>
          
          {/* Language selection */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 justify-center mb-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t.selectLanguage}</span>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={cn(
                    "px-4 py-2 rounded-xl border transition-all flex items-center gap-2",
                    language === lang.code
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
          
          {/* Theme selection */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 justify-center mb-3">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Sun className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">{t.selectTheme}</span>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  "px-6 py-3 rounded-xl border transition-all flex items-center gap-2",
                  theme === 'dark'
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 border-border hover:border-primary/50"
                )}
              >
                <Moon className="w-4 h-4" />
                <span className="text-sm font-medium">{t.dark}</span>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  "px-6 py-3 rounded-xl border transition-all flex items-center gap-2",
                  theme === 'light'
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 border-border hover:border-primary/50"
                )}
              >
                <Sun className="w-4 h-4" />
                <span className="text-sm font-medium">{t.light}</span>
              </button>
            </div>
          </motion.div>
          
          {/* Continue button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <Button
              variant="hero"
              size="xl"
              className="group"
              onClick={() => setHasSeenWelcome(true)}
            >
              {t.continue}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
