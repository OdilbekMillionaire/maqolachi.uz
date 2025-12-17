import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const CTA = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(38 92% 50%), transparent)" }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="glass-panel p-12 md:p-16">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-8"
            >
              <Sparkles className="w-10 h-10 text-primary" />
            </motion.div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Hoziroq
              <span className="text-gradient"> boshlang</span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Ro'yxatdan o'tish shart emas. Mehmon rejimida platformani sinab ko'ring 
              va akademik yozish jarayonini yangi darajaga olib chiqing.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/studio">
                <Button variant="hero" size="xl" className="group">
                  Bepul boshlash
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="hero-outline" size="xl">
                Ko'proq ma'lumot
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-8">
              Mehmon rejimida: 1 loyiha, 4 bo'lim generatsiyasi, DOCX eksport
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
