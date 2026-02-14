import { motion } from "framer-motion";
import { FileText, ShieldCheck, BookOpen } from "lucide-react";

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
  {
    title: "Xalqaro investitsiya huquqida arbitraj mexanizmlari: O'zbekiston tajribasi",
    domain: "Huquq", color: "from-blue-500 to-indigo-600",
    author: "Sultanov B.A.", words: 5300, turnitin: 14, aiScore: 5,
  },
  {
    title: "Inflyatsiyaning uy xo'jaliklarining xarid qobiliyatiga ta'siri (2020-2024)",
    domain: "Iqtisodiyot", color: "from-emerald-500 to-teal-600",
    author: "Hasanova L.R.", words: 4700, turnitin: 7, aiScore: 4,
  },
  {
    title: "Kiberxavfsizlik: zamonaviy tahdidlar va himoya strategiyalari",
    domain: "IT va AI", color: "from-violet-500 to-purple-600",
    author: "Yusupov F.M.", words: 5600, turnitin: 11, aiScore: 3,
  },
  {
    title: "Ijtimoiy tarmoqlarning yoshlar ong-tafakkuriga psixologik ta'siri",
    domain: "Sotsiologiya", color: "from-pink-500 to-rose-600",
    author: "Ergasheva N.S.", words: 4500, turnitin: 9, aiScore: 2,
  },
];

export const SampleArticles = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">Namuna maqolalar</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Platformamizda yaratilgan
            <br />
            <span className="text-gradient">real maqolalar</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Barcha maqolalar Turnitin va AI detektorlardan muvaffaqiyatli o'tgan
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sampleArticles.map((article, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="glass-panel p-5 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${article.color} flex items-center justify-center flex-shrink-0`}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-semibold text-foreground leading-snug mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{article.author}</span>
                    <span>{article.words.toLocaleString()} so'z</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {article.domain}
                    </span>
                  </div>

                  {/* Turnitin & AI scores */}
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(article.turnitin * 3, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Turnitin {article.turnitin}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        AI: {article.aiScore}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
