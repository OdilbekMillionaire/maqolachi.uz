import { BookOpen, Github, Twitter, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground">
                MAQOLACHI
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
              Akademik maqola yozish jarayonini soddalashtiruvchi zamonaviy AI-yordamchi platforma.
              O'zbekiston universitetlari uchun maxsus ishlab chiqilgan.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Platforma</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/studio" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Studio
                </Link>
              </li>
              <li>
                <Link to="/templates" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Shablonlar
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Narxlar
                </Link>
              </li>
              <li>
                <Link to="/docs" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Qo'llanma
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Huquqiy</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Foydalanish shartlari
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Maxfiylik siyosati
                </Link>
              </li>
              <li>
                <a href="mailto:support@maqolachi.uz" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Aloqa
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 MAQOLACHI. Barcha huquqlar himoyalangan.
          </p>
          <p className="text-sm text-muted-foreground">
            O'zbekistonda ❤️ bilan yaratilgan
          </p>
        </div>
      </div>
    </footer>
  );
};
