import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, FileText, ShieldCheck, ArrowLeft, X,
  ChevronRight, Globe, GraduationCap, Quote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useSettingsStore } from "@/store/settingsStore";
import { sampleArticlesData, type SampleArticle } from "@/lib/sampleArticles";

const domainColors: Record<string, string> = {
  law: "from-blue-500 to-indigo-600",
  economics: "from-emerald-500 to-teal-600",
  "cs-ai": "from-violet-500 to-purple-600",
  sociology: "from-pink-500 to-rose-600",
  biology: "from-green-500 to-lime-600",
  history: "from-amber-500 to-orange-600",
  other: "from-gray-500 to-slate-600",
};

const langFlags: Record<string, string> = { uz: "🇺🇿", en: "🇬🇧", ru: "🇷🇺" };

const pageText = {
  uz: {
    title: "Namuna maqolalar",
    subtitle: "Platformamizda yaratilgan barcha talablarga javob beradigan ilmiy maqolalar",
    all: "Barchasi",
    back: "Ortga",
    words: "so'z",
    references: "Manbalar",
    filterLang: "Til",
    filterDomain: "Soha",
  },
  en: {
    title: "Sample Articles",
    subtitle: "Academic articles created on our platform meeting all requirements",
    all: "All",
    back: "Back",
    words: "words",
    references: "References",
    filterLang: "Language",
    filterDomain: "Domain",
  },
  ru: {
    title: "Примеры статей",
    subtitle: "Академические статьи, созданные на нашей платформе",
    all: "Все",
    back: "Назад",
    words: "слов",
    references: "Источники",
    filterLang: "Язык",
    filterDomain: "Область",
  },
};

const Samples = () => {
  const { theme, language } = useSettingsStore();
  const [selectedArticle, setSelectedArticle] = useState<SampleArticle | null>(null);
  const [filterLang, setFilterLang] = useState<string>("all");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const t = pageText[language];

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    window.scrollTo(0, 0);
  }, [theme]);

  const filteredArticles = sampleArticlesData.filter(a => {
    if (filterLang !== "all" && a.language !== filterLang) return false;
    if (filterDomain !== "all" && a.domainId !== filterDomain) return false;
    return true;
  });

  const uniqueDomains = [...new Set(sampleArticlesData.map(a => a.domainId))];

  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <button
              onClick={() => setSelectedArticle(null)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.back}
            </button>

            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 sm:p-8 md:p-12"
            >
              {/* Article header */}
              <div className="mb-8 border-b border-border pb-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${domainColors[selectedArticle.domainId]}`}>
                    {selectedArticle.domain}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                    {langFlags[selectedArticle.language]} {selectedArticle.language.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                    {selectedArticle.level.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                    {selectedArticle.citationStyle.toUpperCase()}
                  </span>
                </div>
                <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-tight mb-3">
                  {selectedArticle.title}
                </h1>
                <p className="text-sm text-muted-foreground">{selectedArticle.author}</p>
                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span>{selectedArticle.wordCount.toLocaleString()} {t.words}</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Turnitin: {selectedArticle.turnitinScore}%
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    AI: {selectedArticle.aiScore}%
                  </span>
                </div>
              </div>

              {/* Article sections */}
              <div className="space-y-6 sm:space-y-8">
                {selectedArticle.sections.map((section, i) => (
                  <div key={i}>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground mb-3 uppercase tracking-wide">
                      {section.name}
                    </h2>
                    <div className="font-serif text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-line text-justify">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* References */}
              {selectedArticle.references.length > 0 && (
                <div className="mt-8 sm:mt-12 pt-6 border-t border-border">
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground mb-4 uppercase tracking-wide text-center">
                    {t.references}
                  </h2>
                  <ol className="space-y-2 text-xs sm:text-sm text-muted-foreground font-serif">
                    {selectedArticle.references.map((ref, i) => (
                      <li key={i} className="pl-6 -indent-6">{i + 1}. {ref}</li>
                    ))}
                  </ol>
                </div>
              )}
            </motion.article>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 sm:mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-4 sm:mb-6">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-medium">{sampleArticlesData.length}+ {language === 'uz' ? 'maqola' : language === 'ru' ? 'статей' : 'articles'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">{t.title}</h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">{t.subtitle}</p>
          </motion.div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
            {/* Language filter */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-xs text-muted-foreground">{t.filterLang}:</span>
              <button
                onClick={() => setFilterLang("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterLang === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
              >
                {t.all}
              </button>
              {(['uz', 'en', 'ru'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setFilterLang(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterLang === l ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                >
                  {langFlags[l]} {l.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-border hidden sm:block" />

            {/* Domain filter */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-xs text-muted-foreground">{t.filterDomain}:</span>
              <button
                onClick={() => setFilterDomain("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterDomain === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
              >
                {t.all}
              </button>
              {uniqueDomains.map(d => (
                <button
                  key={d}
                  onClick={() => setFilterDomain(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterDomain === d ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                >
                  {d === 'cs-ai' ? 'IT/AI' : d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Articles grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredArticles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => { setSelectedArticle(article); window.scrollTo(0, 0); }}
                className="glass-panel overflow-hidden group cursor-pointer hover:border-primary/30 transition-all duration-300"
              >
                {/* Gradient header bar */}
                <div className={`h-2 bg-gradient-to-r ${domainColors[article.domainId] || domainColors.other}`} />

                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {langFlags[article.language]} {article.language.toUpperCase()}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {article.domain}
                    </span>
                  </div>

                  <h3 className="font-serif font-semibold text-foreground leading-snug mb-3 line-clamp-2 group-hover:text-primary transition-colors text-sm sm:text-base">
                    {article.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span>{article.author}</span>
                    <span>{article.wordCount.toLocaleString()} {t.words}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(article.turnitinScore * 4, 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        T:{article.turnitinScore}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        AI:{article.aiScore}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              {language === 'uz' ? "Hech qanday maqola topilmadi" : language === 'ru' ? "Статьи не найдены" : "No articles found"}
            </div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12 sm:mt-16"
          >
            <Link to="/studio">
              <Button variant="hero" size="xl" className="group">
                <FileText className="w-5 h-5" />
                {language === 'uz' ? "O'z maqolangizni yarating" : language === 'ru' ? "Создайте свою статью" : "Create your own article"}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Samples;
