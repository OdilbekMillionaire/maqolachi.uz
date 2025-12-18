import { motion } from "framer-motion";
import { BookOpen, Menu, X, Sun, Moon, Globe, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import type { Language } from "@/lib/translations";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

const navText = {
  uz: { templates: "Shablonlar", pricing: "Narxlar", docs: "Qo'llanma", login: "Kirish", start: "Boshlash" },
  en: { templates: "Templates", pricing: "Pricing", docs: "Guide", login: "Login", start: "Start" },
  ru: { templates: "Шаблоны", pricing: "Цены", docs: "Руководство", login: "Войти", start: "Начать" },
};

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, theme, setLanguage, toggleTheme } = useSettingsStore();
  const t = navText[language];
  const currentLang = languages.find(l => l.code === language);
  
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border/50" />
      
      <nav className="container mx-auto px-6 relative z-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground">
              MAQOLACHI
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/templates" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              {t.templates}
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              {t.pricing}
            </Link>
            <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              {t.docs}
            </Link>
          </div>
          
          {/* Right side controls */}
          <div className="hidden md:flex items-center gap-2">
            {/* Language selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="text-lg">{currentLang?.flag}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={cn(language === lang.code && "bg-primary/10")}
                  >
                    <span className="text-lg mr-2">{lang.flag}</span>
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            
            <div className="w-px h-6 bg-border mx-1" />
            
            <Button variant="ghost" size="sm">
              {t.login}
            </Button>
            <Link to="/studio">
              <Button variant="default" size="sm">
                {t.start}
              </Button>
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {/* Theme toggle mobile */}
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            
            <button
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4"
          >
            <div className="flex flex-col gap-2">
              {/* Language selector mobile */}
              <div className="flex gap-2 mb-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm flex items-center gap-2",
                      language === lang.code
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/50 border-border"
                    )}
                  >
                    <span>{lang.flag}</span>
                  </button>
                ))}
              </div>
              
              <Link 
                to="/templates" 
                className="px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t.templates}
              </Link>
              <Link 
                to="/pricing" 
                className="px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t.pricing}
              </Link>
              <Link 
                to="/docs" 
                className="px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t.docs}
              </Link>
              <div className="border-t border-border my-2" />
              <Button variant="ghost" className="justify-start">
                {t.login}
              </Button>
              <Link to="/studio" onClick={() => setIsOpen(false)}>
                <Button className="w-full">
                  {t.start}
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </nav>
    </motion.header>
  );
};
