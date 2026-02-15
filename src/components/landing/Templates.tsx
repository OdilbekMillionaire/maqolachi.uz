import { motion } from "framer-motion";
import { ChevronRight, BookOpen, Scale, TrendingUp, Cpu, Users, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/store/projectStore";
import type { Domain, CitationStyle } from "@/store/projectStore";

const templates = [
  {
    id: "imrad",
    name: "IMRAD",
    domain: "Ilmiy tadqiqot",
    domainId: "other" as Domain,
    citationStyle: "apa" as CitationStyle,
    icon: BookOpen,
    color: "from-amber-500 to-orange-600",
    sections: ["Kirish", "Metodologiya", "Natijalar", "Muhokama"],
    description: "Tabiiy va ijtimoiy fanlar uchun standart ilmiy maqola formati",
  },
  {
    id: "law-review",
    name: "Huquq sharhi",
    domain: "Yuridik",
    domainId: "law" as Domain,
    citationStyle: "oscola" as CitationStyle,
    icon: Scale,
    color: "from-blue-500 to-indigo-600",
    sections: ["Kirish", "Huquqiy asos", "Tahlil", "Xulosa"],
    description: "OSCOLA uslubida huquqiy tadqiqot va sharh maqolalari",
  },
  {
    id: "economics",
    name: "Iqtisodiy tahlil",
    domain: "Iqtisodiyot",
    domainId: "economics" as Domain,
    citationStyle: "apa" as CitationStyle,
    icon: TrendingUp,
    color: "from-emerald-500 to-teal-600",
    sections: ["Kirish", "Nazariy asos", "Empirik tahlil", "Siyosat tavsiyalari"],
    description: "Makro va mikroiqtisodiy tadqiqotlar uchun",
  },
  {
    id: "cs-ai",
    name: "Texnik maqola",
    domain: "IT va AI",
    domainId: "cs-ai" as Domain,
    citationStyle: "apa" as CitationStyle,
    icon: Cpu,
    color: "from-violet-500 to-purple-600",
    sections: ["Muammo bayoni", "Yondashuv", "Eksperimentlar", "Natijalar"],
    description: "Kompyuter fanlari va sun'iy intellekt sohasida",
  },
  {
    id: "sociology",
    name: "Ijtimoiy tadqiqot",
    domain: "Sotsiologiya",
    domainId: "sociology" as Domain,
    citationStyle: "chicago" as CitationStyle,
    icon: Users,
    color: "from-pink-500 to-rose-600",
    sections: ["Kirish", "Adabiyot sharhi", "Metodologiya", "Topilmalar"],
    description: "Ijtimoiy hodisalar va jarayonlar tahlili",
  },
  {
    id: "biology",
    name: "Biologik tadqiqot",
    domain: "Biologiya",
    domainId: "biology" as Domain,
    citationStyle: "apa" as CitationStyle,
    icon: Leaf,
    color: "from-green-500 to-lime-600",
    sections: ["Annotatsiya", "Kirish", "Materiallar", "Natijalar"],
    description: "Biologiya va tibbiyot sohasidagi tadqiqotlar",
  },
];

export const Templates = () => {
  const navigate = useNavigate();
  const { createProject, updateConfig } = useProjectStore();

  const handleTemplateClick = (template: typeof templates[0]) => {
    createProject();
    updateConfig({
      domain: template.domainId,
      citationStyle: template.citationStyle,
      templateId: template.id,
    });
    navigate('/studio');
  };

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
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Professional
            <span className="text-gradient"> shablonlar</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Soha va maqola turiga mos keladigan tayyor shablonlardan foydalaning
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              onClick={() => handleTemplateClick(template)}
              className="glass-panel overflow-hidden group cursor-pointer hover:border-primary/30 transition-all duration-300"
            >
              {/* Header with gradient */}
              <div className={`h-20 sm:h-24 bg-gradient-to-r ${template.color} p-4 sm:p-6 relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <template.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-white/80 bg-white/10 px-2 sm:px-3 py-1 rounded-full">
                    {template.domain}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                  {template.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {template.description}
                </p>

                {/* Sections preview */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
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
