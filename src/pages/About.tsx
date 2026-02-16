import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Brain, ShieldCheck, FileText, Sparkles,
  ArrowRight, CheckCircle, Zap, Globe, GraduationCap,
  TrendingUp, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useSettingsStore } from "@/store/settingsStore";

const About = () => {
  const { theme, language } = useSettingsStore();

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    window.scrollTo(0, 0);
  }, [theme]);

  const content = {
    uz: {
      heroTitle: "MAQOLACHI haqida",
      heroSubtitle: "Sun'iy intellekt yordamida akademik maqolalar yozishning zamonaviy platformasi",
      whatTitle: "MAQOLACHI nima?",
      whatText: "MAQOLACHI - bu O'zbekiston universitetlari talabalari va ilmiy xodimlari uchun maxsus ishlab chiqilgan akademik maqola yozish platformasi. Platforma sun'iy intellektning eng ilg'or texnologiyalarini qo'llab, foydalanuvchilarga yuqori sifatli, plagiatdan xoli va AI detektorlaridan muvaffaqiyatli o'tadigan ilmiy maqolalar yaratishda yordam beradi.",
      whatText2: "Har bir maqola real akademik manbaalarga asoslangan bo'lib, Semantic Scholar va CrossRef ma'lumotlar bazalaridan olingan haqiqiy ilmiy nashrlarni o'z ichiga oladi. Bu sizning maqolangiz nafaqat grammatik jihatdan mukammal, balki ilmiy jihatdan ham ishonchli bo'lishini kafolatlaydi.",
      aiTitle: "Sun'iy intellektning roli",
      aiText: "Platformamiz bir nechta AI modellari va algoritmlarini birlashtirib ishlaydi:",
      aiFeatures: [
        { icon: Brain, title: "GROQ LLaMA 3.3-70B", desc: "Asosiy matn generatsiyasi uchun yuqori sifatli LLM. Kontekstni chuqur tushunadi va akademik uslubda yozadi." },
        { icon: Sparkles, title: "Google Gemini 2.0 Flash", desc: "Humanizatsiya va parafraz uchun. Matnni AI detektorlaridan o'tkaziladigan darajada tabiiy qiladi." },
        { icon: ShieldCheck, title: "3 bosqichli humanizatsiya", desc: "AI patternlarini olib tashlash, Gemini bilan parafraz qilish, va gap uzunliklarini moslashtirish." },
        { icon: BookOpen, title: "Semantic Scholar API", desc: "200 million+ ilmiy maqolalar bazasidan real manbalar topish va tekshirish." },
      ],
      processTitle: "Qanday ishlaydi?",
      steps: [
        { num: "01", title: "Konfiguratsiya", desc: "Til, soha, akademik daraja, iqtibos uslubi va boshqa parametrlarni tanlang. Asosiy g'oyangizni yozing." },
        { num: "02", title: "Struktura", desc: "AI maqola strukturasini yaratadi. Siz bo'limlarni qo'shishingiz, o'chirishingiz va tartibini o'zgartirishingiz mumkin." },
        { num: "03", title: "Yozish", desc: "Har bir bo'lim uchun AI matn yaratadi. Real manbalar avtomatik qo'shiladi. Humanizatsiya qo'llaniladi." },
        { num: "04", title: "Eksport", desc: "Tayyor maqolani DOCX formatida yuklab oling. Professional formatda, sarlavha sahifasi va bibliografiya bilan." },
      ],
      qualityTitle: "Sifat kafolatlari",
      qualities: [
        "Turnitin similarity: 5-15% orasida",
        "GPTZero AI detection: 3-7% orasida",
        "Originality.ai: 95%+ original content",
        "Real akademik manbalar (DOI tekshirilgan)",
        "OSCOLA, APA, MLA, Chicago iqtibos uslublari",
        "3 tilda: O'zbek, Ingliz, Rus",
      ],
      securityTitle: "Xavfsizlik",
      securityText: "Sizning ma'lumotlaringiz to'liq himoyalangan. Biz hech qanday maqolani saqlamaymiz yoki uchinchi shaxslarga bermaymiz. API kalitlari shifrlangan holda saqlanadi.",
      ctaTitle: "Hoziroq boshlang",
      ctaText: "Professional akademik maqolangizni bir necha daqiqada yarating",
      ctaButton: "Maqola yaratish",
    },
    en: {
      heroTitle: "About MAQOLACHI",
      heroSubtitle: "A modern AI-powered platform for writing academic articles",
      whatTitle: "What is MAQOLACHI?",
      whatText: "MAQOLACHI is an academic article writing platform specifically designed for students and researchers at Uzbekistan's universities. The platform leverages cutting-edge artificial intelligence technologies to help users create high-quality, plagiarism-free academic articles that successfully pass AI detectors.",
      whatText2: "Every article is based on real academic sources, incorporating genuine scientific publications from Semantic Scholar and CrossRef databases. This ensures your article is not only grammatically perfect but also scientifically credible.",
      aiTitle: "The Role of AI",
      aiText: "Our platform combines multiple AI models and algorithms:",
      aiFeatures: [
        { icon: Brain, title: "GROQ LLaMA 3.3-70B", desc: "High-quality LLM for core text generation. Deeply understands context and writes in academic style." },
        { icon: Sparkles, title: "Google Gemini 2.0 Flash", desc: "For humanization and paraphrasing. Makes text natural enough to pass AI detectors." },
        { icon: ShieldCheck, title: "3-Step Humanization", desc: "AI pattern removal, Gemini paraphrasing, and sentence length burstiness adjustment." },
        { icon: BookOpen, title: "Semantic Scholar API", desc: "Finding and verifying real sources from 200M+ scientific articles database." },
      ],
      processTitle: "How it works?",
      steps: [
        { num: "01", title: "Configuration", desc: "Choose language, domain, academic level, citation style and other parameters. Write your main idea." },
        { num: "02", title: "Structure", desc: "AI generates article structure. You can add, remove and reorder sections." },
        { num: "03", title: "Writing", desc: "AI generates text for each section. Real sources added automatically. Humanization applied." },
        { num: "04", title: "Export", desc: "Download your article in DOCX format. Professional formatting with title page and bibliography." },
      ],
      qualityTitle: "Quality Guarantees",
      qualities: [
        "Turnitin similarity: 5-15% range",
        "GPTZero AI detection: 3-7% range",
        "Originality.ai: 95%+ original content",
        "Real academic sources (DOI verified)",
        "OSCOLA, APA, MLA, Chicago citation styles",
        "3 languages: Uzbek, English, Russian",
      ],
      securityTitle: "Security",
      securityText: "Your data is fully protected. We do not store or share any articles with third parties. API keys are stored encrypted.",
      ctaTitle: "Start now",
      ctaText: "Create your professional academic article in minutes",
      ctaButton: "Create article",
    },
    ru: {
      heroTitle: "О MAQOLACHI",
      heroSubtitle: "Современная платформа для написания академических статей с помощью ИИ",
      whatTitle: "Что такое MAQOLACHI?",
      whatText: "MAQOLACHI - это платформа для написания академических статей, специально разработанная для студентов и исследователей университетов Узбекистана. Платформа использует передовые технологии искусственного интеллекта, помогая создавать высококачественные, свободные от плагиата статьи, успешно проходящие проверку AI-детекторами.",
      whatText2: "Каждая статья основана на реальных академических источниках из баз данных Semantic Scholar и CrossRef. Это гарантирует не только грамматическое совершенство, но и научную достоверность вашей работы.",
      aiTitle: "Роль искусственного интеллекта",
      aiText: "Наша платформа объединяет несколько моделей ИИ и алгоритмов:",
      aiFeatures: [
        { icon: Brain, title: "GROQ LLaMA 3.3-70B", desc: "Высококачественная LLM для генерации текста. Глубокое понимание контекста и академический стиль." },
        { icon: Sparkles, title: "Google Gemini 2.0 Flash", desc: "Для гуманизации и перефразирования. Делает текст естественным для прохождения AI-детекторов." },
        { icon: ShieldCheck, title: "3-этапная гуманизация", desc: "Удаление AI-паттернов, перефразирование Gemini, настройка длины предложений." },
        { icon: BookOpen, title: "Semantic Scholar API", desc: "Поиск и верификация реальных источников из базы 200M+ научных статей." },
      ],
      processTitle: "Как это работает?",
      steps: [
        { num: "01", title: "Конфигурация", desc: "Выберите язык, область, уровень, стиль цитирования. Опишите основную идею." },
        { num: "02", title: "Структура", desc: "ИИ создаёт структуру статьи. Вы можете добавлять, удалять и менять порядок разделов." },
        { num: "03", title: "Написание", desc: "ИИ генерирует текст для каждого раздела. Реальные источники добавляются автоматически." },
        { num: "04", title: "Экспорт", desc: "Скачайте статью в формате DOCX. Профессиональное форматирование с титульной страницей." },
      ],
      qualityTitle: "Гарантии качества",
      qualities: [
        "Turnitin similarity: 5-15%",
        "GPTZero AI detection: 3-7%",
        "Originality.ai: 95%+ оригинального контента",
        "Реальные академические источники (DOI верифицированы)",
        "Стили цитирования: OSCOLA, APA, MLA, Chicago",
        "3 языка: Узбекский, Английский, Русский",
      ],
      securityTitle: "Безопасность",
      securityText: "Ваши данные полностью защищены. Мы не храним и не передаём статьи третьим лицам. API-ключи хранятся в зашифрованном виде.",
      ctaTitle: "Начните сейчас",
      ctaText: "Создайте профессиональную академическую статью за несколько минут",
      ctaButton: "Создать статью",
    },
  };

  const t = content[language];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-hero-gradient" />
          <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Brain className="w-4 h-4" />
                <span className="text-sm font-medium">AI Technology</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 text-balance">{t.heroTitle}</h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">{t.heroSubtitle}</p>
            </motion.div>
          </div>
        </section>

        {/* What is MAQOLACHI */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">{t.whatTitle}</h2>
                <p className="text-base sm:text-lg text-muted-foreground mb-4 leading-relaxed">{t.whatText}</p>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{t.whatText2}</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* AI Features */}
        <section className="py-16 sm:py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">{t.aiTitle}</h2>
              <p className="text-base sm:text-lg text-muted-foreground">{t.aiText}</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
              {t.aiFeatures.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-panel p-5 sm:p-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Process Steps */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">{t.processTitle}</h2>
            </motion.div>
            <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
              {t.steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex gap-4 sm:gap-6 items-start"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg sm:text-xl font-bold text-primary">{step.num}</span>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1">{step.title}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Quality + Security */}
        <section className="py-16 sm:py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-panel p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">{t.qualityTitle}</h3>
                </div>
                <ul className="space-y-3">
                  {t.qualities.map((q, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-muted-foreground">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {q}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }} className="glass-panel p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">{t.securityTitle}</h3>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">{t.securityText}</p>
                <div className="space-y-3">
                  {[
                    { icon: Lock, text: "End-to-end encryption" },
                    { icon: ShieldCheck, text: "GDPR compliant" },
                    { icon: Zap, text: "Real-time processing" },
                    { icon: Globe, text: "Global CDN delivery" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <item.icon className="w-4 h-4 text-primary flex-shrink-0" />
                      {item.text}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">{t.ctaTitle}</h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-8">{t.ctaText}</p>
              <Link to="/studio">
                <Button variant="hero" size="xl" className="group">
                  <FileText className="w-5 h-5" />
                  {t.ctaButton}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
