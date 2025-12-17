import { motion } from "framer-motion";
import { 
  BookOpen, 
  Wand2, 
  FileOutput, 
  Users, 
  Lock, 
  Sparkles,
  Globe,
  Layout,
  History
} from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "AI-yordamchi yozish",
    description: "Har bir bo'limni AI yordamida yarating, qayta ishlang va tahrirlang. Kontekstni saqlab qolish bilan davomiylik ta'minlanadi.",
  },
  {
    icon: BookOpen,
    title: "Akademik shablonlar",
    description: "IMRAD, Huquq sharhi, Siyosat tahlili va boshqa ko'plab professional shablonlar.",
  },
  {
    icon: Globe,
    title: "Ko'p tillilik",
    description: "O'zbek, ingliz va rus tillarida maqola yozing. Iqtibos uslublarini avtomatik sozlash.",
  },
  {
    icon: Layout,
    title: "Intuitiv interfeys",
    description: "Chap panel, asosiy ish maydoni va kontekst paneli bilan professional studio muhiti.",
  },
  {
    icon: FileOutput,
    title: "Professional eksport",
    description: "DOCX va PDF formatlarida yuqori sifatli hujjatlar eksporti. Sarlavha sahifasi va bibliografiya bilan.",
  },
  {
    icon: History,
    title: "Versiyalar tarixi",
    description: "Avtomatik saqlash va versiyalarni qayta tiklash imkoniyati. Hech qachon ishingizni yo'qotmaysiz.",
  },
  {
    icon: Users,
    title: "O'qituvchi rejimi",
    description: "Shablonlar yarating, topshiriqlar bering va talabalar ishini nazorat qiling.",
  },
  {
    icon: Lock,
    title: "Xavfsiz va maxfiy",
    description: "Ma'lumotlaringiz shifrlanadi va faqat sizga tegishli. API kalitlari xavfsiz saqlanadi.",
  },
];

export const Features = () => {
  return (
    <section className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Imkoniyatlar</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Akademik yozish uchun
            <br />
            <span className="text-gradient">barcha kerakli vositalar</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional maqola yozish jarayonini boshlang'ichdan tugallanguncha osonlashtiring
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="glass-panel p-6 group hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
