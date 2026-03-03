import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

export type SectionStatus = 'EMPTY' | 'DRAFT' | 'GENERATED' | 'EDITED';
export type Phase = 'config' | 'skeleton' | 'write';
export type Language = 'uz' | 'en' | 'ru';
export type Domain = 'law' | 'economics' | 'cs-ai' | 'sociology' | 'biology' | 'history' | 'other';
export type AcademicLevel = 'bachelor' | 'master' | 'phd';
export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'oscola';
export type StyleMode = 'formal' | 'natural' | 'polished';
export type ModelMode = 'fast' | 'quality';

export interface Section {
  id: string;
  name: string;
  notes: string;
  content: string;
  status: SectionStatus;
  summary: string;
  order: number;
}

export interface Source {
  id: string;
  title: string;
  urlOrDoi: string;
  type: 'URL' | 'DOI' | 'TEXT';
}

// Citation reference that gets accumulated across sections
export interface CitationReference {
  number: number;
  text: string; // Full reference text (author, title, year, URL, etc.)
  sectionId: string; // Which section it came from
}

export interface ProjectConfig {
  language: Language;
  domain: Domain;
  academicLevel: AcademicLevel;
  citationStyle: CitationStyle;
  templateId: string;
  mainIdea: string;
  styleMode: StyleMode;
  modelMode: ModelMode;
}

export interface Project {
  id: string;
  title: string;
  generatedTitles: string[];
  config: ProjectConfig;
  sections: Section[];
  sources: Source[];
  citations: CitationReference[]; // Global citations storage
  currentPhase: Phase;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  isGenerating: boolean;
  generationProgress: string;
  
  // Actions
  createProject: () => void;
  updateConfig: (config: Partial<ProjectConfig>) => void;
  setTitle: (title: string) => void;
  setGeneratedTitles: (titles: string[]) => void;
  setPhase: (phase: Phase) => void;
  addSection: (section: Omit<Section, 'id' | 'order'>) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  removeSection: (id: string) => void;
  reorderSections: (sections: Section[]) => void;
  addSource: (source: Omit<Source, 'id'>) => void;
  removeSource: (id: string) => void;
  addCitations: (citations: CitationReference[]) => void;
  clearCitations: () => void;
  getNextCitationNumber: () => number;
  setIsGenerating: (value: boolean) => void;
  setGenerationProgress: (value: string) => void;
  saveProject: () => void;
  loadProject: (id: string) => void;
  resetProject: () => void;
}

const defaultConfig: ProjectConfig = {
  language: 'uz',
  domain: 'law',
  academicLevel: 'bachelor',
  citationStyle: 'oscola',
  templateId: 'imrad',
  mainIdea: '',
  styleMode: 'formal',
  modelMode: 'fast',
};

const defaultSections: Section[] = [
  { id: '1', name: 'Annotatsiya (Abstract)', notes: '', content: '', status: 'EMPTY', summary: '', order: 0 },
  { id: '2', name: 'Kalit so\'zlar (Keywords)', notes: '', content: '', status: 'EMPTY', summary: '', order: 1 },
  { id: '3', name: 'Kirish (Introduction)', notes: '', content: '', status: 'EMPTY', summary: '', order: 2 },
  { id: '4', name: 'Metodologiya (Methodology)', notes: '', content: '', status: 'EMPTY', summary: '', order: 3 },
  { id: '5', name: 'Natijalar (Results)', notes: '', content: '', status: 'EMPTY', summary: '', order: 4 },
  { id: '6', name: 'Muhokama (Discussion)', notes: '', content: '', status: 'EMPTY', summary: '', order: 5 },
  { id: '7', name: 'Xulosa (Conclusion)', notes: '', content: '', status: 'EMPTY', summary: '', order: 6 },
  { id: '8', name: 'Adabiyotlar (References)', notes: '', content: '', status: 'EMPTY', summary: '', order: 7 },
];

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentProject: null,
      projects: [],
      isGenerating: false,
      generationProgress: '',

      createProject: () => {
        const newProject: Project = {
          id: generateId(),
          title: '',
          generatedTitles: [],
          config: { ...defaultConfig },
          sections: defaultSections.map(s => ({ ...s, id: generateId() })),
          sources: [],
          citations: [], // Initialize empty citations array
          currentPhase: 'config',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set({ currentProject: newProject });
      },

      updateConfig: (config) => {
        const { currentProject } = get();
        if (!currentProject) return;
        set({
          currentProject: {
            ...currentProject,
            config: { ...currentProject.config, ...config },
            updatedAt: new Date(),
          },
        });
      },

      setTitle: (title) => {
        const { currentProject } = get();
        if (!currentProject) return;
        set({
          currentProject: {
            ...currentProject,
            title,
            updatedAt: new Date(),
          },
        });
      },

      setGeneratedTitles: (titles) => {
        const { currentProject } = get();
        if (!currentProject) return;
        set({
          currentProject: {
            ...currentProject,
            generatedTitles: titles,
            updatedAt: new Date(),
          },
        });
      },

      setPhase: (phase) => {
        const { currentProject } = get();
        if (!currentProject) return;
        set({
          currentProject: {
            ...currentProject,
            currentPhase: phase,
            updatedAt: new Date(),
          },
        });
      },

      addSection: (section) => {
        const { currentProject } = get();
        if (!currentProject) return;
        const newSection: Section = {
          ...section,
          id: generateId(),
          order: currentProject.sections.length,
        };
        set({
          currentProject: {
            ...currentProject,
            sections: [...currentProject.sections, newSection],
            updatedAt: new Date(),
          },
        });
      },

      updateSection: (id, updates) => {
        const { currentProject } = get();
        if (!currentProject) return;
        set({
          currentProject: {
            ...currentProject,
            sections: currentProject.sections.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
            updatedAt: new Date(),
          },
        });
      },

      removeSection: (id) => {
        const { currentProject } = get();
        if (!currentProject) return;
        set({
          currentProject: {
            ...currentProject,
            sections: currentProject.sections.filter((s) => s.id !== id),
            updatedAt: new Date(),
          },
        });
      },

      reorderSections: (sections) => {
        const { currentProject } = get();
        if (!currentProject) return;
        set({
          currentProject: {
            ...currentProject,
            sections,
            updatedAt: new Date(),
          },
        });
      },

      addSource: (source) => {
        const { currentProject } = get();
        if (!currentProject) return;
        const newSource: Source = {
          ...source,
          id: generateId(),
        };
        set({
          currentProject: {
            ...currentProject,
            sources: [...currentProject.sources, newSource],
            updatedAt: new Date(),
          },
        });
      },

      removeSource: (id) => {
        const { currentProject } = get();
        if (!currentProject) return;
        set({
          currentProject: {
            ...currentProject,
            sources: currentProject.sources.filter((s) => s.id !== id),
            updatedAt: new Date(),
          },
        });
      },

      addCitations: (newCitations) => {
        const { currentProject } = get();
        if (!currentProject) return;
        
        // Merge new citations, avoiding duplicates by number
        const existingNumbers = new Set(currentProject.citations.map(c => c.number));
        const uniqueNew = newCitations.filter(c => !existingNumbers.has(c.number));
        
        set({
          currentProject: {
            ...currentProject,
            citations: [...currentProject.citations, ...uniqueNew],
            updatedAt: new Date(),
          },
        });
      },

      clearCitations: () => {
        const { currentProject } = get();
        if (!currentProject) return;
        set({
          currentProject: {
            ...currentProject,
            citations: [],
            updatedAt: new Date(),
          },
        });
      },

      getNextCitationNumber: () => {
        const { currentProject } = get();
        if (!currentProject || currentProject.citations.length === 0) return 1;
        return Math.max(...currentProject.citations.map(c => c.number)) + 1;
      },

      setIsGenerating: (value) => set({ isGenerating: value }),
      
      setGenerationProgress: (value) => set({ generationProgress: value }),

      saveProject: async () => {
        const { currentProject, projects } = get();
        if (!currentProject) return;

        // Save to local state
        const existingIndex = projects.findIndex((p) => p.id === currentProject.id);
        if (existingIndex >= 0) {
          const updated = [...projects];
          updated[existingIndex] = currentProject;
          set({ projects: updated });
        } else {
          set({ projects: [...projects, currentProject] });
        }

        // Sync to Supabase if user is logged in (optional for now as per user request)
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          // Even if not logged in, we can try to save to the public tables we created
          // using the project ID as a reference
          const projectData = {
            id: currentProject.id,
            title: currentProject.title,
            generated_titles: currentProject.generatedTitles,
            config: currentProject.config,
            current_phase: currentProject.currentPhase,
            updated_at: new Date().toISOString(),
          };

          const { error: projectError } = await supabase
            .from('projects')
            .upsert(projectData);

          if (projectError) console.error('Error syncing project to Supabase:', projectError);

          // Sync sections
          if (currentProject.sections.length > 0) {
            const sectionsData = currentProject.sections.map(s => ({
              id: s.id,
              project_id: currentProject.id,
              name: s.name,
              notes: s.notes,
              content: s.content,
              status: s.status,
              summary: s.summary,
              order: s.order,
              updated_at: new Date().toISOString(),
            }));

            const { error: sectionsError } = await supabase
              .from('sections')
              .upsert(sectionsData);
            
            if (sectionsError) console.error('Error syncing sections to Supabase:', sectionsError);
          }
        } catch (err) {
          console.error('Supabase sync failed:', err);
        }
      },

      loadProject: (id) => {
        const { projects } = get();
        const project = projects.find((p) => p.id === id);
        if (project) {
          set({ currentProject: project });
        }
      },

      resetProject: () => {
        set({ currentProject: null, isGenerating: false, generationProgress: '' });
      },
    }),
    {
      name: 'maqolachi-storage',
      partialize: (state) => ({ projects: state.projects }),
    }
  )
);
