import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Shield, ShieldAlert, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Language } from "@/lib/translations";

interface DetectionBadgeProps {
    content: string;
    sectionId: string;
    lang: Language;
    disabled?: boolean;
}

type ScoreLevel = "safe" | "caution" | "risky" | null;

const getLevel = (score: number): ScoreLevel => {
    if (score < 25) return "safe";
    if (score < 55) return "caution";
    return "risky";
};

const LEVEL_CONFIG = {
    safe: {
        colors: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        icon: ShieldCheck,
        iconColor: "text-emerald-400",
        labels: { uz: "Xavfsiz", en: "Safe", ru: "Безопасно" },
    },
    caution: {
        colors: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        icon: Shield,
        iconColor: "text-amber-400",
        labels: { uz: "Ehtiyot bo'ling", en: "Caution", ru: "Осторожно" },
    },
    risky: {
        colors: "bg-red-500/10 text-red-400 border-red-500/20",
        icon: ShieldAlert,
        iconColor: "text-red-400",
        labels: { uz: "Xavfli", en: "Risky", ru: "Опасно" },
    },
};

const CHECK_LABEL = {
    uz: "AI tekshirish",
    en: "AI Check",
    ru: "AI Проверка",
};

export const DetectionBadge = ({ content, sectionId, lang, disabled }: DetectionBadgeProps) => {
    const [score, setScore] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [checked, setChecked] = useState(false);

    const handleCheck = useCallback(async () => {
        if (!content || content.length < 50) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("generate-content", {
                body: {
                    type: "score",
                    content: content.substring(0, 2000), // cap at 2000 chars for speed
                    language: lang,
                },
            });
            if (error) throw error;
            setScore(typeof data?.score === "number" ? data.score : 50);
            setChecked(true);
        } catch {
            setScore(50);
            setChecked(true);
        } finally {
            setLoading(false);
        }
    }, [content, lang]);

    const level = score !== null ? getLevel(score) : null;
    const config = level ? LEVEL_CONFIG[level] : null;
    const Icon = config?.icon || Shield;

    return (
        <AnimatePresence mode="wait">
            {!checked ? (
                <motion.button
                    key="check-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={handleCheck}
                    disabled={loading || disabled || !content || content.length < 50}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-secondary/50 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-40"
                >
                    {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Shield className="w-3 h-3" />
                    )}
                    {CHECK_LABEL[lang]}
                </motion.button>
            ) : (
                <motion.div
                    key="score-badge"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${config?.colors}`}
                >
                    <Icon className={`w-3 h-3 ${config?.iconColor}`} />
                    <span>{score}% AI</span>
                    <span>·</span>
                    <span>{config?.labels[lang]}</span>
                    <button
                        onClick={() => { setChecked(false); setScore(null); }}
                        className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                        title="Recheck"
                    >
                        <RefreshCw className="w-2.5 h-2.5" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
