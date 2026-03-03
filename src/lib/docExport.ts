import { Document, Paragraph, TextRun, Packer, AlignmentType, PageBreak, TabStopPosition, TabStopType } from 'docx';
import { saveAs } from 'file-saver';
import type { Section } from '@/store/projectStore';
import type { Language } from '@/lib/translations';

interface ExportData {
  title: string;
  sections: Section[];
  language: Language;
  domain: string;
  academicLevel: string;
  citationStyle: string;
}

const getReferencesTitle = (lang: Language): string => {
  const titles = { uz: 'Adabiyotlar ro\'yxati', en: 'References', ru: 'Список литературы' };
  return titles[lang];
};

// Clean markdown artifacts from AI-generated content
function cleanMarkdown(text: string): string {
  let cleaned = text;
  // Remove bold markdown: **text** or __text__
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
  cleaned = cleaned.replace(/__(.+?)__/g, '$1');
  // Remove italic markdown: *text* or _text_
  cleaned = cleaned.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '$1');
  cleaned = cleaned.replace(/(?<!_)_([^_]+?)_(?!_)/g, '$1');
  // Remove heading markers: ### text
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  // Remove bullet points: - text or * text
  cleaned = cleaned.replace(/^\s*[-*•]\s+/gm, '');
  // Remove numbered list markers that aren't citations: 1. text
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');
  // Remove blockquote markers
  cleaned = cleaned.replace(/^\s*>\s*/gm, '');
  // Remove horizontal rules
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, '');
  // Remove code backticks
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

// Parse a paragraph into text runs (handling citations as superscript)
function parseParagraphRuns(text: string, fontSize: number = 24): TextRun[] {
  const runs: TextRun[] = [];
  let lastIndex = 0;
  const citationRegex = /\[(\d+)\]/g;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    // Text before citation
    if (match.index > lastIndex) {
      runs.push(new TextRun({
        text: text.slice(lastIndex, match.index),
        size: fontSize,
        font: 'Times New Roman',
        color: '000000',
      }));
    }
    // Citation as superscript
    runs.push(new TextRun({
      text: match[0],
      size: fontSize - 4,
      font: 'Times New Roman',
      color: '000000',
      superScript: true,
    }));
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    runs.push(new TextRun({
      text: text.slice(lastIndex),
      size: fontSize,
      font: 'Times New Roman',
      color: '000000',
    }));
  }

  if (runs.length === 0) {
    runs.push(new TextRun({
      text: text,
      size: fontSize,
      font: 'Times New Roman',
      color: '000000',
    }));
  }

  return runs;
}

const isRefsSection = (name: string) => {
  const terms = ['reference', 'adabiyot', 'литература', 'manba', 'источник', 'bibliography'];
  return terms.some(t => name.toLowerCase().includes(t));
};

export const exportToDoc = async (data: ExportData): Promise<void> => {
  const { title, sections, language } = data;

  const contentSections = sections.filter(s => !isRefsSection(s.name));
  const referencesSection = sections.find(s => isRefsSection(s.name));

  const children: Paragraph[] = [];

  // ── TITLE PAGE ──
  // Spacer to push title to ~1/3 page
  for (let i = 0; i < 8; i++) {
    children.push(new Paragraph({ children: [new TextRun({ text: '', size: 24 })] }));
  }

  // Title - centered, bold, 16pt, black
  children.push(new Paragraph({
    children: [new TextRun({
      text: cleanMarkdown(title),
      bold: true,
      size: 32, // 16pt
      font: 'Times New Roman',
      color: '000000',
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
  }));

  // Page break after title page
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ── CONTENT SECTIONS ──
  for (const section of contentSections) {
    if (!section.content) continue;

    const cleanContent = cleanMarkdown(section.content);

    // Section heading - bold, 14pt, black, left-aligned (NO HeadingLevel to avoid blue)
    children.push(new Paragraph({
      children: [new TextRun({
        text: cleanMarkdown(section.name).toUpperCase(),
        bold: true,
        size: 28, // 14pt
        font: 'Times New Roman',
        color: '000000',
      })],
      alignment: AlignmentType.LEFT,
      spacing: { before: 480, after: 240 },
    }));

    // Split content into paragraphs
    const paragraphs = cleanContent.split('\n\n').filter(p => p.trim());

    for (const para of paragraphs) {
      // Skip if paragraph is just whitespace or a stray heading
      const trimmed = para.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      children.push(new Paragraph({
        children: parseParagraphRuns(trimmed),
        spacing: { after: 200, line: 360 }, // 1.5 line spacing
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 720 }, // First-line indent (0.5 inch)
      }));
    }
  }

  // ── REFERENCES SECTION ──
  if (referencesSection && referencesSection.content) {
    children.push(new Paragraph({ children: [new PageBreak()] }));

    // References heading
    children.push(new Paragraph({
      children: [new TextRun({
        text: getReferencesTitle(language).toUpperCase(),
        bold: true,
        size: 28,
        font: 'Times New Roman',
        color: '000000',
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 300 },
    }));

    const cleanRefs = cleanMarkdown(referencesSection.content);
    const refLines = cleanRefs.split('\n').filter(l => l.trim());

    for (const line of refLines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      children.push(new Paragraph({
        children: [new TextRun({
          text: trimmedLine,
          size: 24, // 12pt
          font: 'Times New Roman',
          color: '000000',
        })],
        spacing: { after: 120, line: 360 },
        indent: { hanging: 720, left: 720 }, // Hanging indent for refs
      }));
    }
  }

  // ── BUILD DOCUMENT ──
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1800,   // ~3.2cm
            right: 1440,  // ~2.5cm
            bottom: 1440, // ~2.5cm
            left: 1800,   // ~3.2cm
          }
        }
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = title.replace(/[^a-zA-Z0-9\u0400-\u04FF\u0600-\u06FF\s]/g, '').substring(0, 50).trim();
  saveAs(blob, `${safeName || 'maqola'}.docx`);
};

export const exportToPdf = (data: ExportData): void => {
  const { title, sections, language } = data;

  const refsSection = sections.find(s => isRefsSection(s.name));
  const contentSections = sections.filter(s => !isRefsSection(s.name) && s.content);

  const langFont = language === 'ru' ? 'Helvetica, Arial, sans-serif' : 'Georgia, "Times New Roman", serif';

  const sectionsHtml = contentSections.map(s => {
    const cleaned = cleanMarkdown(s.content || '');
    const paragraphs = cleaned.split('\n\n').filter(p => p.trim());
    const pHtml = paragraphs.map(p => {
      // Render citations as superscript
      const withSup = p.replace(/\[(\d+)\]/g, '<sup>[$1]</sup>');
      return `<p class="body-text">${withSup}</p>`;
    }).join('');
    return `
      <div class="section">
        <h2 class="section-title">${cleanMarkdown(s.name).toUpperCase()}</h2>
        ${pHtml}
      </div>`;
  }).join('');

  const refsHtml = refsSection?.content ? `
    <div class="section refs-section">
      <h2 class="section-title">${getReferencesTitle(language).toUpperCase()}</h2>
      ${cleanMarkdown(refsSection.content).split('\n').filter(l => l.trim()).map(l =>
    `<p class="ref-line">${l.trim()}</p>`
  ).join('')}
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page { size: A4; margin: 3.2cm 2.5cm 2.5cm 3.2cm; }
  body { font-family: ${langFont}; font-size: 12pt; line-height: 1.5; color: #000; background: #fff; }
  .title-page { text-align: center; margin-top: 8cm; margin-bottom: 3cm; }
  .title-page h1 { font-size: 16pt; font-weight: bold; line-height: 1.4; }
  .section { margin-top: 1.5cm; page-break-inside: avoid; }
  .section-title { font-size: 14pt; font-weight: bold; text-align: left; margin-bottom: 0.6cm; letter-spacing: 0.01em; }
  .body-text { text-align: justify; text-indent: 1.25cm; margin-bottom: 0.4cm; font-size: 12pt; }
  .refs-section { page-break-before: always; }
  .ref-line { text-indent: -1.25cm; margin-left: 1.25cm; margin-bottom: 0.3cm; font-size: 11pt; }
  sup { font-size: 8pt; vertical-align: super; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="title-page"><h1>${cleanMarkdown(title)}</h1></div>
  ${sectionsHtml}
  ${refsHtml}
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // Fallback: download the HTML file directly
    const a = document.createElement('a');
    a.href = url;
    const safeName = title.replace(/[^a-zA-Z0-9\u0400-\u04FF\u0600-\u06FF\s]/g, '').substring(0, 50).trim();
    a.download = `${safeName || 'maqola'}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

export const countWords = (sections: Section[]): number => {
  return sections.reduce((total, section) => {
    if (!section.content) return total;
    return total + section.content.trim().split(/\s+/).filter(w => w.length > 0).length;
  }, 0);
};
