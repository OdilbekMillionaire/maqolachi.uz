import { motion, AnimatePresence } from "framer-motion";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/store/projectStore";
import { getTranslation, Language } from "@/lib/translations";

interface ArticlePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sections: Section[];
  language: Language;
}

export const ArticlePreview = ({ isOpen, onClose, title, sections, language }: ArticlePreviewProps) => {
  const t = getTranslation(language);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = sections
      .filter(s => s.content)
      .map(s => `<h2 style="font-family:'Times New Roman',serif;font-size:16pt;font-weight:bold;margin-top:24pt;margin-bottom:12pt;">${s.name}</h2>
        <div style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.8;text-align:justify;">${s.content.split('\n\n').map(p => `<p style="margin-bottom:12pt;text-indent:1.27cm;">${p}</p>`).join('')}</div>`)
      .join('');

    printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>@page{margin:2.5cm;}body{font-family:'Times New Roman',serif;}</style></head>
      <body>
        <h1 style="text-align:center;font-size:18pt;font-weight:bold;margin:60pt 0 40pt;">${title}</h1>
        ${content}
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">{t.previewTitle}</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-2 text-gray-700 border-gray-300"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Article content - always white bg for paper look */}
            <div className="flex-1 overflow-y-auto px-16 py-12 bg-white">
              {/* Title */}
              <h1 className="text-2xl font-bold text-center text-gray-900 mb-12 font-serif leading-relaxed">
                {title}
              </h1>

              {/* Sections */}
              {sections.map((section) => {
                if (!section.content) return null;

                return (
                  <div key={section.id} className="mb-8">
                    <h2 className="text-lg font-bold text-gray-900 font-serif mb-4 mt-8">
                      {section.name}
                    </h2>
                    <div className="text-gray-800 font-serif leading-[1.8] text-justify">
                      {section.content.split('\n\n').map((paragraph, pIdx) => {
                        // Render citations as superscript
                        const parts = paragraph.split(/(\[\d+\])/g);
                        return (
                          <p key={pIdx} className="mb-3 indent-8">
                            {parts.map((part, partIdx) => {
                              if (/^\[\d+\]$/.test(part)) {
                                return (
                                  <sup key={partIdx} className="text-blue-600 text-xs font-sans">
                                    {part}
                                  </sup>
                                );
                              }
                              return <span key={partIdx}>{part}</span>;
                            })}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
