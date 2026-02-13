import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Settings,
  Link,
  Sliders,
  Globe,
  BookOpen,
  Quote,
  Zap,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore, Source } from "@/store/projectStore";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { getTranslation, Language } from "@/lib/translations";
import { toast } from "sonner";

interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ResolvedSource {
  title: string;
  authors: string;
  year: string;
  doi?: string;
  url?: string;
}

export const ContextPanel = ({ isOpen, onClose }: ContextPanelProps) => {
  const { currentProject, updateConfig, addSource, removeSource } = useProjectStore();
  const { humanizeContent, setHumanizeContent } = useSettingsStore();
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const config = currentProject?.config;
  const sources = currentProject?.sources || [];
  const lang = (config?.language || 'uz') as Language;
  const t = getTranslation(lang);

  // Resolve DOI to get metadata
  const resolveDOI = async (doi: string): Promise<ResolvedSource | null> => {
    try {
      const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//, '').trim();
      const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) return null;

      const data = await response.json();
      const item = data.message;

      return {
        title: item.title?.[0] || doi,
        authors: (item.author || []).map((a: any) => `${a.family || ''} ${a.given || ''}`).join(', ') || 'Unknown',
        year: String(item.published?.['date-parts']?.[0]?.[0] || item.created?.['date-parts']?.[0]?.[0] || ''),
        doi: item.DOI,
        url: item.URL || `https://doi.org/${item.DOI}`,
      };
    } catch {
      return null;
    }
  };

  const handleAddSource = async () => {
    if (!newSourceUrl.trim()) return;

    const input = newSourceUrl.trim();
    const isDoi = input.startsWith("10.") || input.includes("doi.org");
    const isUrl = input.startsWith("http");

    // If DOI, resolve metadata
    if (isDoi) {
      setIsResolving(true);
      const resolved = await resolveDOI(input);
      setIsResolving(false);

      if (resolved) {
        addSource({
          title: `${resolved.authors} (${resolved.year}). ${resolved.title}`,
          urlOrDoi: resolved.doi ? `https://doi.org/${resolved.doi}` : input,
          type: "DOI",
        });
        toast.success(lang === 'uz' ? "Manba DOI orqali tasdiqlandi" : lang === 'ru' ? 'Источник подтвержден через DOI' : 'Source verified via DOI');
      } else {
        addSource({
          title: input,
          urlOrDoi: input,
          type: "DOI",
        });
        toast.info(lang === 'uz' ? "DOI topilmadi, manba qo'shildi" : lang === 'ru' ? 'DOI не найден, источник добавлен' : 'DOI not found, source added as-is');
      }
    } else {
      addSource({
        title: input,
        urlOrDoi: input,
        type: isUrl ? "URL" : "TEXT",
      });
    }

    setNewSourceUrl("");
  };

  const contextLabel = lang === 'uz' ? 'Kontekst' : lang === 'ru' ? 'Контекст' : 'Context';
  const settingsLabel = lang === 'uz' ? 'Sozlamalar' : lang === 'ru' ? 'Настройки' : 'Settings';
  const aiModeLabel = lang === 'uz' ? 'AI rejimi' : lang === 'ru' ? 'Режим ИИ' : 'AI Mode';
  const fastLabel = lang === 'uz' ? 'Tez' : lang === 'ru' ? 'Быстро' : 'Fast';
  const qualityLabel = lang === 'uz' ? 'Sifatli' : lang === 'ru' ? 'Качество' : 'Quality';
  const sourcesLabel = lang === 'uz' ? 'Manbalar' : lang === 'ru' ? 'Источники' : 'Sources';
  const sourcesDesc = lang === 'uz'
    ? "URL, DOI yoki havola qo'shing. DOI kiritilsa, manba avtomatik tekshiriladi."
    : lang === 'ru'
    ? 'Добавьте URL, DOI или ссылку. DOI будет автоматически проверен.'
    : 'Add URL, DOI or reference. DOI will be auto-verified.';
  const sourcePlaceholder = lang === 'uz' ? 'URL, DOI yoki manba...' : lang === 'ru' ? 'URL, DOI или источник...' : 'URL, DOI or source...';
  const noSourcesLabel = lang === 'uz' ? "Hali manba qo'shilmagan" : lang === 'ru' ? 'Источники не добавлены' : 'No sources added yet';
  const langLabel = lang === 'uz' ? 'Til' : lang === 'ru' ? 'Язык' : 'Language';
  const domainLabel = lang === 'uz' ? 'Soha' : lang === 'ru' ? 'Область' : 'Domain';
  const citationLabel = lang === 'uz' ? 'Iqtibos' : lang === 'ru' ? 'Цитирование' : 'Citation';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full border-l border-border bg-card/50 backdrop-blur-md overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{contextLabel}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Project settings summary */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                {settingsLabel}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{langLabel}:</span>
                  <span className="text-foreground font-medium">
                    {config?.language === "uz" ? "O'zbek" : config?.language === "en" ? "English" : "Русский"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{domainLabel}:</span>
                  <span className="text-foreground font-medium capitalize">
                    {config?.domain}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Quote className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{citationLabel}:</span>
                  <span className="text-foreground font-medium uppercase">
                    {config?.citationStyle}
                  </span>
                </div>
              </div>
            </div>

            {/* Humanization toggle */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                {t.humanizationLabel}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {t.humanizationDesc}
              </p>
              <button
                onClick={() => setHumanizeContent(!humanizeContent)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                  humanizeContent
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {humanizeContent
                      ? (lang === 'uz' ? 'Yoqilgan' : lang === 'ru' ? 'Включено' : 'Enabled')
                      : (lang === 'uz' ? "O'chirilgan" : lang === 'ru' ? 'Отключено' : 'Disabled')
                    }
                  </span>
                </div>
                <div className={cn(
                  "w-10 h-6 rounded-full p-1 transition-colors",
                  humanizeContent ? "bg-primary" : "bg-muted"
                )}>
                  <div className={cn(
                    "w-4 h-4 rounded-full bg-white transition-transform",
                    humanizeContent && "translate-x-4"
                  )} />
                </div>
              </button>
            </div>

            {/* Model mode toggle */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                {aiModeLabel}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => updateConfig({ modelMode: "fast" })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm",
                    config?.modelMode === "fast"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Zap className="w-4 h-4" />
                  {fastLabel}
                </button>
                <button
                  onClick={() => updateConfig({ modelMode: "quality" })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm",
                    config?.modelMode === "quality"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Sliders className="w-4 h-4" />
                  {qualityLabel}
                </button>
              </div>
            </div>

            {/* Sources */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                {sourcesLabel}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {sourcesDesc}
              </p>

              {/* Add source input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder={sourcePlaceholder}
                  className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onKeyDown={(e) => e.key === "Enter" && handleAddSource()}
                  disabled={isResolving}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleAddSource}
                  disabled={!newSourceUrl.trim() || isResolving}
                >
                  {isResolving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Sources list */}
              {sources.length > 0 ? (
                <div className="space-y-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-secondary/30 border border-border group"
                    >
                      {source.type === 'DOI' ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Link className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-2">
                          {source.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            source.type === 'DOI' ? "bg-emerald-500/10 text-emerald-500" : "bg-secondary text-muted-foreground"
                          )}>
                            {source.type}
                          </span>
                          {source.type === 'URL' && (
                            <a
                              href={source.urlOrDoi}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeSource(source.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {noSourcesLabel}
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
