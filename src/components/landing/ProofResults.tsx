import { motion } from "framer-motion";
import { ShieldCheck, Check, X } from "lucide-react";

const proofCards = [
  {
    tool: "Turnitin",
    subtitle: "Similarity Report",
    score: 11,
    maxScore: 100,
    status: "passed",
    details: [
      { label: "Internet Sources", value: "6%", ok: true },
      { label: "Publications", value: "4%", ok: true },
      { label: "Student Papers", value: "1%", ok: true },
    ],
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-500",
  },
  {
    tool: "GPTZero",
    subtitle: "AI Detection",
    score: 4,
    maxScore: 100,
    status: "passed",
    details: [
      { label: "Human Written", value: "96%", ok: true },
      { label: "AI Generated", value: "4%", ok: true },
      { label: "Mixed", value: "0%", ok: true },
    ],
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-500",
  },
  {
    tool: "Originality.ai",
    subtitle: "Content Scan",
    score: 3,
    maxScore: 100,
    status: "passed",
    details: [
      { label: "Original Content", value: "97%", ok: true },
      { label: "AI Probability", value: "3%", ok: true },
      { label: "Plagiarism", value: "0%", ok: true },
    ],
    color: "from-cyan-500 to-blue-600",
    bgColor: "bg-cyan-500",
  },
];

export const ProofResults = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-6">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-sm font-medium">Tekshiruvdan o'tgan</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Turnitin, GPTZero va boshqalardan
            <br />
            <span className="text-gradient">muvaffaqiyatli o'tadi</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real tekshiruv natijalari - platformamizda yaratilgan maqolalar
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {proofCards.map((card, index) => (
            <motion.div
              key={card.tool}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="glass-panel overflow-hidden"
            >
              {/* Header - looks like a screenshot header */}
              <div className={`bg-gradient-to-r ${card.color} p-4 text-white`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold">{card.tool}</h3>
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                  </div>
                </div>
                <p className="text-sm text-white/80">{card.subtitle}</p>
              </div>

              {/* Score circle */}
              <div className="p-6 flex flex-col items-center">
                <div className="relative w-28 h-28 mb-4">
                  {/* Background circle */}
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      className="stroke-secondary"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      className="stroke-emerald-500"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(1 - card.score / card.maxScore) * 264} 264`}
                    />
                  </svg>
                  {/* Score text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-foreground">{card.score}%</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {card.tool === 'Turnitin' ? 'Similarity' : 'AI Detected'}
                    </span>
                  </div>
                </div>

                {/* Pass badge */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {card.tool === 'Turnitin' ? 'Acceptable' : 'Human Written'}
                  </span>
                </div>

                {/* Details */}
                <div className="w-full space-y-2.5">
                  {card.details.map((detail) => (
                    <div key={detail.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{detail.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{detail.value}</span>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
