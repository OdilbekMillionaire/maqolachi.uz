import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, ExternalLink, X, Pin, Loader2, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProjectStore } from "@/store/projectStore";
import { toast } from "sonner";
import type { Language } from "@/lib/translations";

interface Source {
    title: string;
    authors: string;
    year: string | number;
    abstract: string;
    url: string;
    doi?: string;
    citationCount?: number;
}

interface SmartSourcesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    lang: Language;
}

const LABELS = {
    uz: {
        title: "Manbalar",
        search: "Manbalarni qidirish...",
        searchBtn: "Qidirish",
        add: "Qo'shish",
        added: "Qo'shildi",
        noResults: "Natija topilmadi",
        placeholder: "Mavzu bo'yicha qidiring: \"Uzbek law technology\"",
        citations: "iqtibos",
        doi: "DOI",
        url: "URL",
        loading: "Qidirilmoqda...",
        hint: "Manbalarni maqolaga qo'shing — AI ularni iqtibos qiladi",
    },
    en: {
        title: "Smart Sources",
        search: "Search academic papers...",
        searchBtn: "Search",
        add: "Add",
        added: "Added",
        noResults: "No results found",
        placeholder: "Search by topic: \"machine learning education\"",
        citations: "citations",
        doi: "DOI",
        url: "URL",
        loading: "Searching...",
        hint: "Add sources to your article — AI will cite them automatically",
    },
    ru: {
        title: "Источники",
        search: "Поиск научных статей...",
        searchBtn: "Поиск",
        add: "Добавить",
        added: "Добавлено",
        noResults: "Ничего не найдено",
        placeholder: "Поиск по теме: \"право Узбекистана\"",
        citations: "цитирований",
        doi: "DOI",
        url: "URL",
        loading: "Поиск...",
        hint: "Добавьте источники — ИИ автоматически процитирует их",
    },
};

export const SmartSourcesPanel = ({ isOpen, onClose, lang }: SmartSourcesPanelProps) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Source[]>([]);
    const [loading, setLoading] = useState(false);
    const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());
    const { addSource, currentProject } = useProjectStore();
    const t = LABELS[lang];

    const existingUrls = new Set(currentProject?.sources?.map((s) => s.urlOrDoi) || []);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;
        setLoading(true);
        setResults([]);
        try {
            const { data, error } = await supabase.functions.invoke("generate-content", {
                body: {
                    type: "search",
                    query: query.trim(),
                    domain: currentProject?.config?.domain || "other",
                },
            });
            if (error) throw error;
            setResults(data?.sources || []);
            if (!data?.sources?.length) {
                toast.info(t.noResults);
            }
        } catch (err) {
            console.error("Search error:", err);
            toast.error("Search failed");
        } finally {
            setLoading(false);
        }
    }, [query, currentProject?.config?.domain]);

    const handleAdd = (source: Source) => {
        const urlOrDoi = source.doi ? `https://doi.org/${source.doi}` : source.url;
        addSource({
            title: source.title,
            urlOrDoi,
            type: source.doi ? "DOI" : "URL",
        });
        setAddedUrls((prev) => new Set([...prev, urlOrDoi]));
        toast.success(`"${source.title.substring(0, 40)}..." ${t.added.toLowerCase()}`);
    };

    const isAdded = (source: Source) => {
        const urlOrDoi = source.doi ? `https://doi.org/${source.doi}` : source.url;
        return addedUrls.has(urlOrDoi) || existingUrls.has(urlOrDoi);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 360, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    className="h-full border-l border-border bg-card flex flex-col overflow-hidden flex-shrink-0"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Library className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold text-sm">{t.title}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-lg bg-secondary hover:bg-muted flex items-center justify-center transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="p-3 border-b border-border">
                        <p className="text-xs text-muted-foreground mb-2">{t.hint}</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                placeholder={t.placeholder}
                                className="flex-1 px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary"
                            />
                            <Button size="sm" onClick={handleSearch} disabled={loading || !query.trim()}>
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            </Button>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {loading && (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                <span className="text-sm text-muted-foreground">{t.loading}</span>
                            </div>
                        )}

                        {!loading && results.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                <BookOpen className="w-8 h-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">
                                    {lang === "uz" ? "Manbalarni qidiring" : lang === "ru" ? "Найдите источники" : "Search for sources"}
                                </p>
                            </div>
                        )}

                        {results.map((source, idx) => {
                            const added = isAdded(source);
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className={`p-3 rounded-xl border transition-all ${added ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/30 hover:border-primary/30"
                                        }`}
                                >
                                    <p className="text-xs font-medium text-foreground mb-1 line-clamp-2 leading-tight">
                                        {source.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mb-1">
                                        {source.authors} · {source.year}
                                        {source.citationCount ? ` · ${source.citationCount} ${t.citations}` : ""}
                                    </p>
                                    {source.abstract && (
                                        <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{source.abstract}</p>
                                    )}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex gap-1">
                                            {source.doi && (
                                                <a
                                                    href={`https://doi.org/${source.doi}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                                                >
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                    DOI
                                                </a>
                                            )}
                                            {source.url && !source.doi && (
                                                <a
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                                                >
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                    URL
                                                </a>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={added ? "outline" : "default"}
                                            className="h-6 text-[10px] px-2 gap-1"
                                            onClick={() => !added && handleAdd(source)}
                                            disabled={added}
                                        >
                                            <Pin className="w-2.5 h-2.5" />
                                            {added ? t.added : t.add}
                                        </Button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
