import { motion } from "framer-motion";
import { FileText, ShieldCheck, BookOpen, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const sampleArticles = [
  {
    title: "O'zbekiston Respublikasida mulkiy huquqlarni himoya qilish mexanizmlari",
    domain: "Huquq", color: "from-blue-500 to-indigo-600",
    author: "Karimov A.S.", words: 5200, turnitin: 11, aiScore: 4,
  },
  {
    title: "Raqamli iqtisodiyotning O'zbekiston kichik biznesiga ta'siri: empirik tahlil",
    domain: "Iqtisodiyot", color: "from-emerald-500 to-teal-600",
    author: "Rahimova D.T.", words: 4800, turnitin: 9, aiScore: 3,
  },
  {
    title: "Sun'iy intellektning ta'lim tizimida qo'llanilishi: muammolar va yechimlar",
    domain: "IT va AI", color: "from-violet-500 to-purple-600",
    author: "Nazarov I.B.", words: 5500, turnitin: 13, aiScore: 5,
  },
  {
    title: "Urbanizatsiya jarayonlarining oilaviy munosabatlarga ta'siri",
    domain: "Sotsiologiya", color: "from-pink-500 to-rose-600",
    author: "Abdullayeva M.K.", words: 4600, turnitin: 8, aiScore: 2,
  },
  {
    title: "Orol dengizi mintaqasidagi ekologik o'zgarishlar va biodiversitet",
    domain: "Biologiya", color: "from-green-500 to-lime-600",
    author: "Toshmatov R.U.", words: 5100, turnitin: 12, aiScore: 6,
  },
  {
    title: "Ipak yo'li savdo aloqalarining Markaziy Osiyo madaniyatiga ta'siri",
    domain: "Tarix", color: "from-amber-500 to-orange-600",
    author: "Mirzayev O.N.", words: 4900, turnitin: 10, aiScore: 3,
  },
];

export const SampleArticles = () => {
  return (
    <section className="py-16 sm:py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-4 sm:mb-6">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">Namuna maqolalar</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            Platformamizda yaratilgan
            <br />
            <span className="text-gradient">real maqolalar</span>
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Barcha maqolalar Turnitin va AI detektorlardan muvaffaqiyatli o'tgan
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {sampleArticles.map((article, index) => (
            <Link to="/samples" key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="glass-panel p-4 sm:p-5 hover:border-primary/30 transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${article.color} flex items-center justify-center flex-shrink-0`}>
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-semibold text-foreground leading-snug mb-2 line-clamp-2 text-sm sm:text-base group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{article.author}</span>
                      <span>{article.words.toLocaleString()} so'z</span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {article.domain}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 mt-3">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-16 sm:w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(article.turnitin * 3, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Turnitin {article.turnitin}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
                        <span className="text-[10px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          AI: {article.aiScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* View all button */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-8"
        >
          <Link to="/samples">
            <Button variant="outline" size="lg" className="group gap-2">
              Barcha maqolalarni ko'rish (20+)
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
