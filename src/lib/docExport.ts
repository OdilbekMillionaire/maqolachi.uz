import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType, PageBreak } from 'docx';
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
  const titles = {
    uz: 'Adabiyotlar ro\'yxati',
    en: 'References',
    ru: 'Список литературы'
  };
  return titles[lang];
};

export const exportToDoc = async (data: ExportData): Promise<void> => {
  const { title, sections, language } = data;
  
  // Filter out the references section for separate handling
  const contentSections = sections.filter(s => !s.name.toLowerCase().includes('reference') && !s.name.toLowerCase().includes('adabiyot'));
  const referencesSection = sections.find(s => s.name.toLowerCase().includes('reference') || s.name.toLowerCase().includes('adabiyot'));
  
  // Extract all citations [1], [2], etc. from content
  const allContent = contentSections.map(s => s.content).join('\n');
  const citationMatches = allContent.match(/\[(\d+)\]/g) || [];
  const uniqueCitations = [...new Set(citationMatches)].sort((a, b) => {
    const numA = parseInt(a.replace(/[\[\]]/g, ''));
    const numB = parseInt(b.replace(/[\[\]]/g, ''));
    return numA - numB;
  });
  
  const children: Paragraph[] = [];
  
  // Title page
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '', size: 28 })],
      spacing: { after: 400 }
    })
  );
  
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 48, // 24pt
          font: 'Times New Roman'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 }
    })
  );
  
  children.push(
    new Paragraph({
      children: [new PageBreak()]
    })
  );
  
  // Content sections
  for (const section of contentSections) {
    if (!section.content) continue;
    
    // Section heading
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.name,
            bold: true,
            size: 28, // 14pt
            font: 'Times New Roman'
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    // Section content - split by paragraphs
    const paragraphs = section.content.split('\n\n').filter(p => p.trim());
    
    for (const para of paragraphs) {
      // Handle paragraphs with citations
      const parts: TextRun[] = [];
      let lastIndex = 0;
      const citationRegex = /\[(\d+)\]/g;
      let match;
      
      while ((match = citationRegex.exec(para)) !== null) {
        // Add text before citation
        if (match.index > lastIndex) {
          parts.push(
            new TextRun({
              text: para.slice(lastIndex, match.index),
              size: 24, // 12pt
              font: 'Times New Roman'
            })
          );
        }
        // Add citation with superscript style
        parts.push(
          new TextRun({
            text: match[0],
            size: 20, // 10pt for citations
            font: 'Times New Roman',
            superScript: true
          })
        );
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < para.length) {
        parts.push(
          new TextRun({
            text: para.slice(lastIndex),
            size: 24,
            font: 'Times New Roman'
          })
        );
      }
      
      // If no parts, add the whole paragraph
      if (parts.length === 0) {
        parts.push(
          new TextRun({
            text: para,
            size: 24,
            font: 'Times New Roman'
          })
        );
      }
      
      children.push(
        new Paragraph({
          children: parts,
          spacing: { after: 200 },
          alignment: AlignmentType.JUSTIFIED
        })
      );
    }
  }
  
  // References section
  if (referencesSection && referencesSection.content) {
    children.push(
      new Paragraph({
        children: [new PageBreak()]
      })
    );
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: getReferencesTitle(language),
            bold: true,
            size: 28,
            font: 'Times New Roman'
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    // Parse references content
    const refLines = referencesSection.content.split('\n').filter(l => l.trim());
    
    for (const line of refLines) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.trim(),
              size: 24,
              font: 'Times New Roman'
            })
          ],
          spacing: { after: 100 },
          indent: { hanging: 720 } // Hanging indent for references
        })
      );
    }
  }
  
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children
      }
    ]
  });
  
  const blob = await Packer.toBlob(doc);
  const fileName = `${title.replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '').substring(0, 50)}.docx`;
  saveAs(blob, fileName);
};

export const countWords = (sections: Section[]): number => {
  return sections.reduce((total, section) => {
    if (!section.content) return total;
    const words = section.content.trim().split(/\s+/).filter(w => w.length > 0);
    return total + words.length;
  }, 0);
};
