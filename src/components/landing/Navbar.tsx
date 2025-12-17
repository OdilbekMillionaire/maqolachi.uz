import { motion } from "framer-motion";
import { BookOpen, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border/50" />
      
      <nav className="container mx-auto px-6 relative z-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground">
              MAQOLACHI
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/templates" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Shablonlar
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Narxlar
            </Link>
            <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Qo'llanma
            </Link>
          </div>
          
          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Kirish
            </Button>
            <Link to="/studio">
              <Button variant="default" size="sm">
                Boshlash
              </Button>
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Mobile menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4"
          >
            <div className="flex flex-col gap-2">
              <Link 
                to="/templates" 
                className="px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Shablonlar
              </Link>
              <Link 
                to="/pricing" 
                className="px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Narxlar
              </Link>
              <Link 
                to="/docs" 
                className="px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Qo'llanma
              </Link>
              <div className="border-t border-border my-2" />
              <Button variant="ghost" className="justify-start">
                Kirish
              </Button>
              <Link to="/studio" onClick={() => setIsOpen(false)}>
                <Button className="w-full">
                  Boshlash
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </nav>
    </motion.header>
  );
};
