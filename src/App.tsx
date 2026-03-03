import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, createContext, useContext } from "react";
import Landing from "./pages/Landing";
import Studio from "./pages/Studio";
import NotFound from "./pages/NotFound";
import { useSettingsStore } from "@/store/settingsStore";
import { AuthModal } from "@/components/auth/AuthModal";

const About = lazy(() => import("./pages/About"));
const Samples = lazy(() => import("./pages/Samples"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

const queryClient = new QueryClient();

// Global Auth Modal Context
interface AuthModalContextType {
  openAuth: () => void;
  closeAuth: () => void;
}
export const AuthModalContext = createContext<AuthModalContextType>({ openAuth: () => { }, closeAuth: () => { } });
export const useAuthModal = () => useContext(AuthModalContext);

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useSettingsStore();

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return <>{children}</>;
};

const App = () => {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthModalContext.Provider value={{ openAuth: () => setAuthOpen(true), closeAuth: () => setAuthOpen(false) }}>
            <Toaster />
            <Sonner />
            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
            <BrowserRouter>
              <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/studio" element={<Studio />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/samples" element={<Samples />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthModalContext.Provider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
