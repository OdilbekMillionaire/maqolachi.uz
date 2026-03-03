import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    Plus, FileText, Trash2, ArrowRight, BookOpen,
    GraduationCap, Globe, Clock, BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore, Project } from "@/store/projectStore";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DOMAIN_ICONS: Record<string, string> = {
    law: "⚖️", economics: "📈", "cs-ai": "🤖",
    sociology: "👥", biology: "🧬", history: "📜", other: "📚",
};

const PHASE_LABELS = {
    config: { uz: "Sozlash", en: "Config", ru: "Настройка" },
    skeleton: { uz: "Tuzilma", en: "Structure", ru: "Структура" },
    write: { uz: "Yozish", en: "Writing", ru: "Написание" },
};

const LEVEL_LABELS = {
    bachelor: { uz: "Bakalavr", en: "Bachelor", ru: "Бакалавр" },
    master: { uz: "Magistr", en: "Master", ru: "Магистр" },
    phd: { uz: "Doktorantura", en: "PhD", ru: "Докторантура" },
};

const Dashboard = () => {
    const { projects, currentProject, createProject, loadProject, saveProject, resetProject } = useProjectStore();
    const { theme } = useSettingsStore();
    const navigate = useNavigate();
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const lang = (currentProject?.config?.language || "uz") as "uz" | "en" | "ru";

    useEffect(() => {
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(theme);
    }, [theme]);

    const UI = {
        uz: {
            title: "Loyihalarim",
            subtitle: "Barcha ilmiy maqolalaringiz",
            newArticle: "Yangi maqola",
            open: "Ochish",
            delete: "O'chirish",
            empty: "Hali maqolalar yo'q",
            emptyDesc: "Birinchi ilmiy maqolangizni yarating",
            start: "Boshlash",
            words: "so'z",
            sections: "bo'lim",
            phase: "Bosqich",
        },
        en: {
            title: "My Projects",
            subtitle: "All your academic articles",
            newArticle: "New Article",
            open: "Open",
            delete: "Delete",
            empty: "No articles yet",
            emptyDesc: "Create your first academic article",
            start: "Get Started",
            words: "words",
            sections: "sections",
            phase: "Phase",
        },
        ru: {
            title: "Мои проекты",
            subtitle: "Все ваши научные статьи",
            newArticle: "Новая статья",
            open: "Открыть",
            delete: "Удалить",
            empty: "Пока нет статей",
            emptyDesc: "Создайте вашу первую научную статью",
            start: "Начать",
            words: "слов",
            sections: "разделов",
            phase: "Этап",
        },
    };

    const t = UI[lang];

    const handleNewArticle = () => {
        createProject();
        navigate("/studio");
    };

    const handleOpen = (project: Project) => {
        loadProject(project.id);
        navigate("/studio");
    };

    const handleDelete = (id: string) => {
        if (deleteId === id) {
            // Only remove from local store (not DB for now)
            useProjectStore.setState((state) => ({
                projects: state.projects.filter((p) => p.id !== id),
                currentProject: state.currentProject?.id === id ? null : state.currentProject,
            }));
            setDeleteId(null);
            toast.success(lang === "uz" ? "O'chirildi" : lang === "ru" ? "Удалено" : "Deleted");
        } else {
            setDeleteId(id);
            setTimeout(() => setDeleteId(null), 3000);
        }
    };

    const getWordCount = (project: Project) =>
        project.sections.reduce((sum, s) => sum + (s.content?.trim().split(/\s+/).filter(Boolean).length || 0), 0);

    const getCompletedSections = (project: Project) =>
        project.sections.filter((s) => s.status === "GENERATED" || s.status === "EDITED").length;

    const allProjects = [...projects].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/")} className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-bold text-foreground">MAQOLACHI</span>
                        </button>
                    </div>
                    <Button onClick={handleNewArticle} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t.newArticle}
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t.title}</h1>
                    <p className="text-muted-foreground mb-8">{t.subtitle}</p>

                    {allProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-5">
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <FileText className="w-10 h-10 text-primary/60" />
                            </div>
                            <div className="text-center">
                                <h2 className="text-xl font-semibold mb-2">{t.empty}</h2>
                                <p className="text-muted-foreground mb-6">{t.emptyDesc}</p>
                                <Button onClick={handleNewArticle} variant="hero" size="lg" className="gap-2">
                                    <Plus className="w-5 h-5" />
                                    {t.start}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* New article card */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleNewArticle}
                                className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[200px]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Plus className="w-6 h-6 text-primary" />
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">{t.newArticle}</span>
                            </motion.button>

                            {allProjects.map((project, idx) => {
                                const wordCount = getWordCount(project);
                                const completed = getCompletedSections(project);
                                const phase = (project.currentPhase || "config") as keyof typeof PHASE_LABELS;
                                const domainIcon = DOMAIN_ICONS[project.config?.domain || "other"];
                                const projLang = (project.config?.language || "uz") as "uz" | "en" | "ru";
                                const level = (project.config?.academicLevel || "bachelor") as keyof typeof LEVEL_LABELS;

                                return (
                                    <motion.div
                                        key={project.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="glass-panel p-5 flex flex-col gap-4 hover:ring-2 hover:ring-primary/20 transition-all"
                                    >
                                        {/* Domain + Language */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{domainIcon}</span>
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                                    {LEVEL_LABELS[level]?.[projLang]}
                                                </span>
                                            </div>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                                {project.config?.language?.toUpperCase() || "UZ"}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <div className="flex-1">
                                            <h3 className="font-medium text-foreground text-sm leading-snug line-clamp-3 font-serif">
                                                {project.title || (lang === "uz" ? "Sarlavsiz" : lang === "ru" ? "Без заголовка" : "Untitled")}
                                            </h3>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <BarChart2 className="w-3 h-3" />
                                                {wordCount} {t.words}
                                            </span>
                                            <span>·</span>
                                            <span className="flex items-center gap-1">
                                                <FileText className="w-3 h-3" />
                                                {completed}/{project.sections.length} {t.sections}
                                            </span>
                                            <span>·</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(project.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {/* Phase badge */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary font-medium">
                                                {PHASE_LABELS[phase]?.[projLang]}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 mt-auto pt-2 border-t border-border">
                                            <Button
                                                size="sm"
                                                className="flex-1 gap-1"
                                                onClick={() => handleOpen(project)}
                                            >
                                                {t.open}
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className={cn(
                                                    "gap-1 transition-all",
                                                    deleteId === project.id && "border-red-500/50 text-red-400 bg-red-500/5"
                                                )}
                                                onClick={() => handleDelete(project.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                {deleteId === project.id
                                                    ? (lang === "uz" ? "Tasdiqlang" : lang === "ru" ? "Подтвердить" : "Confirm")
                                                    : t.delete}
                                            </Button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
