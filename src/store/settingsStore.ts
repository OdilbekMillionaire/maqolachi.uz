import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/lib/translations';

export type Theme = 'dark' | 'light';

interface SettingsState {
  language: Language;
  theme: Theme;
  hasSeenWelcome: boolean;
  humanizeContent: boolean;
  perplexityLevel: number;
  burstinessLevel: number;
  
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setHasSeenWelcome: (value: boolean) => void;
  setHumanizeContent: (value: boolean) => void;
  setPerplexityLevel: (value: number) => void;
  setBurstinessLevel: (value: number) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: 'uz',
      theme: 'dark',
      hasSeenWelcome: false,
      humanizeContent: false,
      perplexityLevel: 50,
      burstinessLevel: 50,
      
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setHasSeenWelcome: (hasSeenWelcome) => set({ hasSeenWelcome }),
      setHumanizeContent: (humanizeContent) => set({ humanizeContent }),
      setPerplexityLevel: (perplexityLevel) => set({ perplexityLevel }),
      setBurstinessLevel: (burstinessLevel) => set({ burstinessLevel }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'maqolachi-settings',
    }
  )
);
