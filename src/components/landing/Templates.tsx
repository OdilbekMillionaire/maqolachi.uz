import { motion } from "framer-motion";
import { ChevronRight, BookOpen, Scale, TrendingUp, Cpu, Users, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

const templates = [
  {
    id: "imrad",
    name: "IMRAD",
    domain: "Ilmiy tadqiqot",
    icon: BookOpen,
    color: "from-amber-500 to-orange-600",
    sections: ["Kirish", "Metodologiya", "Natijalar", "Muhokama"],
    description: "Tabiiy va ijtimoiy fanlar uchun standart ilmiy maqola formati",
  },
  {
    id: "law-review",
    name: "Huquq sharhi",
    domain: "Yuridik",
    icon: Scale,
    color: "from-blue-500 to-indigo-600",
    sections: ["Kirish", "Huquqiy asos", "Tahlil", "Xulosa"],
    description: "OSCOLA uslubida huquqiy tadqiqot va sharh maqolalari",
  },
  {
    id: "economics",
    name: "Iqtisodiy tahlil",
    domain: "Iqtisodiyot",
    icon: TrendingUp,
    color: "from-emerald-500 to-teal-600",
    sections: ["Kirish", "Nazariy asos", "Empirik tahlil", "Siyosat tavsiyalari"],
    description: "Makro va mikroiqtisodiy tadqiqotlar uchun",
  },
  {
    id: "cs-ai",
    name: "Texnik maqola",
    domain: "IT va AI",
    icon: Cpu,
    color: "from-violet-500 to-purple-600",
    sections: ["Muammo bayoni", "Yondashuv", "Eksperimentlar", "Natijalar"],
    description: "Kompyuter fanlari va sun'iy intellekt sohasida",
  },
  {
    id: "sociology",
    name: "Ijtimoiy tadqiqot",
    domain: "Sotsiologiya",
    icon: Users,
    color: "from-pink-500 to-rose-600",
    sections: ["Kirish", "Adabiyot sharhi", "Metodologiya", "Topilmalar"],
    description: "Ijtimoiy hodisalar va jarayonlar tahlili",
  },
  {
    id: "biology",
    name: "Biologik tadqiqot",
    domain: "Biologiya",
    icon: Leaf,
    color: "from-green-500 to-lime-600",
    sections: ["Annotatsiya", "Kirish", "Materiallar", "Natijalar"],
    description: "Biologiya va tibbiyot sohasidagi tadqiqotlar",
  },
];

export const Templates = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Professional
            <span className="text-gradient"> shablonlar</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Soha va maqola turiga mos keladigan tayyor shablonlardan foydalaning
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="glass-panel overflow-hidden group cursor-pointer hover:border-primary/30 transition-all duration-300"
            >
              {/* Header with gradient */}
              <div className={`h-24 bg-gradient-to-r ${template.color} p-6 relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <template.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white/80 bg-white/10 px-3 py-1 rounded-full">
                    {template.domain}
                  </span>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {template.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {template.description}
                </p>
                
                {/* Sections preview */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.sections.map((section) => (
                    <span
                      key={section}
                      className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground"
                    >
                      {section}
                    </span>
                  ))}
                </div>
                
                <Button variant="ghost" className="w-full group-hover:bg-primary/10 group-hover:text-primary">
                  Tanlash
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
