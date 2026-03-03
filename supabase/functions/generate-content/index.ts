import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface CitationRef {
  number: number;
  text: string;
  doi?: string;
  url?: string;
  verified: boolean;
}

interface AcademicSource {
  title: string;
  authors: string;
  year: number | string;
  abstract: string;
  url: string;
  doi?: string;
  citationCount?: number;
}

class HttpError extends Error {
  status: number;
  details?: string;
  constructor(status: number, message: string, details?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

// ─────────────────────────────────────────────
// 1. ACADEMIC SOURCE SEARCH
// ─────────────────────────────────────────────

// Semantic Scholar API - FREE, no key needed, real academic papers
async function searchSemanticScholar(query: string, domain: string, limit = 10): Promise<AcademicSource[]> {
  try {
    const searchQuery = `${query} ${domain}`;
    const fields = 'title,authors,year,abstract,url,externalIds,citationCount';
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(searchQuery)}&limit=${limit}&fields=${fields}`;

    console.log('Searching Semantic Scholar:', searchQuery);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.error('Semantic Scholar error:', response.status);
      return [];
    }

    const data = await response.json();
    const papers = data.data || [];

    return papers
      .filter((p: any) => p.title && p.year)
      .map((p: any) => ({
        title: p.title,
        authors: (p.authors || []).map((a: any) => a.name).join(', ') || 'Unknown',
        year: p.year || 'n.d.',
        abstract: p.abstract || '',
        url: p.url || '',
        doi: p.externalIds?.DOI || undefined,
        citationCount: p.citationCount || 0,
      }));
  } catch (error) {
    console.error('Semantic Scholar failed:', error);
    return [];
  }
}

// CrossRef API - FREE, no key needed, DOI-based papers
async function searchCrossRef(query: string, limit = 8): Promise<AcademicSource[]> {
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}&sort=relevance`;

    console.log('Searching CrossRef:', query);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.error('CrossRef error:', response.status);
      return [];
    }

    const data = await response.json();
    const items = data.message?.items || [];

    return items
      .filter((item: any) => item.title?.[0])
      .map((item: any) => ({
        title: item.title[0],
        authors: (item.author || []).map((a: any) => `${a.family || ''}, ${a.given || ''}`).join('; ') || 'Unknown',
        year: item.published?.['date-parts']?.[0]?.[0] || item.created?.['date-parts']?.[0]?.[0] || 'n.d.',
        abstract: (item.abstract || '').replace(/<[^>]*>/g, '').substring(0, 500),
        url: item.URL || `https://doi.org/${item.DOI}`,
        doi: item.DOI || undefined,
        citationCount: item['is-referenced-by-count'] || 0,
      }));
  } catch (error) {
    console.error('CrossRef failed:', error);
    return [];
  }
}

// Gemini Google Search grounding - uses Gemini's built-in web search
async function searchWithGemini(query: string, domain: string): Promise<AcademicSource[]> {
  if (!GEMINI_API_KEY) return [];

  try {
    const searchQuery = `${query} ${domain} academic research papers`;
    console.log('Searching with Gemini Google Search:', searchQuery);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: `Find 8-10 real academic research papers about: "${searchQuery}". For each paper, provide: title, authors, year, a brief summary, and URL or DOI if available. Respond ONLY with a JSON array like: [{"title":"...","authors":"...","year":"...","abstract":"...","url":"...","doi":"..."}]. No other text.` }]
        }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        }
      }),
    });

    if (!response.ok) {
      console.error('Gemini Search error:', response.status);
      return [];
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const papers = JSON.parse(jsonMatch[0]);
    return papers.slice(0, 8).map((p: any) => ({
      title: p.title || '',
      authors: p.authors || 'Unknown',
      year: p.year || 'n.d.',
      abstract: p.abstract || p.summary || '',
      url: p.url || '',
      doi: p.doi || undefined,
      citationCount: 0,
    }));
  } catch (error) {
    console.error('Gemini Search failed:', error);
    return [];
  }
}

// Orchestrator: Get the best academic sources from multiple APIs
async function getAcademicSources(
  query: string,
  domain: string,
  sectionName: string
): Promise<{ sources: AcademicSource[]; context: string; citations: CitationRef[] }> {
  const searchQuery = `${query} ${sectionName}`;

  // Run all three in parallel for maximum source coverage
  const [semanticResults, crossrefResults, geminiResults] = await Promise.all([
    searchSemanticScholar(searchQuery, domain, 10),
    searchCrossRef(`${searchQuery} ${domain}`, 8),
    searchWithGemini(query, domain),
  ]);

  console.log(`Semantic Scholar: ${semanticResults.length}, CrossRef: ${crossrefResults.length}, Gemini: ${geminiResults.length}`);

  // Merge and deduplicate by title similarity
  const allSources: AcademicSource[] = [];
  const seenTitles = new Set<string>();

  const addIfNew = (source: AcademicSource) => {
    const normalizedTitle = source.title.toLowerCase().trim();
    if (!seenTitles.has(normalizedTitle) && source.title.length > 10) {
      seenTitles.add(normalizedTitle);
      allSources.push(source);
    }
  };

  // Prefer Semantic Scholar (better academic coverage), then CrossRef (has DOIs), then Gemini
  semanticResults.forEach(addIfNew);
  crossrefResults.forEach(addIfNew);
  geminiResults.forEach(addIfNew);

  // Sort by citation count (most cited first) then by year (newest first)
  allSources.sort((a, b) => {
    const citeDiff = (b.citationCount || 0) - (a.citationCount || 0);
    if (citeDiff !== 0) return citeDiff;
    return Number(b.year || 0) - Number(a.year || 0);
  });

  // Take top 12 sources
  const topSources = allSources.slice(0, 12);

  // Build context string for LLM
  const context = topSources.map((s, i) => {
    const doiInfo = s.doi ? ` DOI: ${s.doi}` : '';
    return `Source ${i + 1}: "${s.title}" by ${s.authors} (${s.year}).${doiInfo}\nAbstract: ${s.abstract || 'N/A'}\nURL: ${s.url}`;
  }).join('\n\n');

  // Pre-build citation refs
  const citations: CitationRef[] = topSources.map((s, i) => ({
    number: i + 1, // Will be offset later
    text: formatSourceAsCitation(s),
    doi: s.doi,
    url: s.url,
    verified: !!(s.doi || (s.url && !s.url.includes('google'))),
  }));

  console.log(`Total academic sources found: ${topSources.length}, verified: ${citations.filter(c => c.verified).length}`);

  return { sources: topSources, context, citations };
}

function formatSourceAsCitation(source: AcademicSource): string {
  const doi = source.doi ? ` DOI: ${source.doi}` : '';
  const url = source.url ? ` URL: ${source.url}` : '';
  return `${source.authors} (${source.year}). ${source.title}.${doi}${url}`;
}

// ─────────────────────────────────────────────
// 2. GEMINI — PRIMARY AI ENGINE
// ─────────────────────────────────────────────

async function callGeminiWithRetry(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7,
  maxTokens = 8192,
  useGrounding = false,
  maxRetries = 4
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

      const body: any = {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: userPrompt }]
        }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      };

      if (useGrounding) {
        body.tools = [{ google_search: {} }];
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 3000;
        lastError = new HttpError(429, 'Gemini rate limited', `Retry ${attempt + 1}/${maxRetries}`);
        console.log(`Gemini 429, waiting ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpError(response.status, `Gemini error: ${response.status}`, errorText);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      return text;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 3000;
        console.log(`Gemini error, retrying in ${waitTime}ms...`);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }

  throw lastError || new Error('Gemini failed after retries');
}

// ─────────────────────────────────────────────
// 3. CONTENT CLEANING PIPELINE
// ─────────────────────────────────────────────

// Strip ALL markdown formatting from generated content
function stripMarkdown(content: string): string {
  let result = content;

  // Remove markdown headers (# ## ### etc.)
  result = result.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic markers
  result = result.replace(/\*\*\*(.*?)\*\*\*/g, '$1');
  result = result.replace(/\*\*(.*?)\*\*/g, '$1');
  result = result.replace(/\*(.*?)\*/g, '$1');
  result = result.replace(/___(.*?)___/g, '$1');
  result = result.replace(/__(.*?)__/g, '$1');

  // Remove horizontal rules
  result = result.replace(/^[-*_]{3,}\s*$/gm, '');

  // Remove markdown links but keep text: [text](url) -> text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove code blocks
  result = result.replace(/```[\s\S]*?```/g, '');
  result = result.replace(/`([^`]+)`/g, '$1');

  // Remove blockquotes
  result = result.replace(/^>\s+/gm, '');

  // Remove bullet/list markers that AI adds
  result = result.replace(/^[-*+]\s+/gm, '');

  // Remove extra blank lines (3+ consecutive newlines -> 2)
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

// Fix citation spacing: "word [1]" -> "word[1]"
function fixCitationSpacing(content: string): string {
  // Remove space before citation numbers
  return content.replace(/\s+\[(\d+)\]/g, '[$1]');
}

// Deduplicate repeated paragraphs
function deduplicateParagraphs(content: string): string {
  const paragraphs = content.split('\n\n');
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Normalize for comparison: lowercase, remove extra spaces
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');

    // Check for exact duplicates
    if (seen.has(normalized)) {
      console.log('Removed duplicate paragraph');
      continue;
    }

    // Check for near-duplicates (>80% overlap with any existing paragraph)
    let isDuplicate = false;
    for (const existing of seen) {
      if (existing.length > 50 && normalized.length > 50) {
        const overlap = computeOverlap(normalized, existing);
        if (overlap > 0.80) {
          console.log(`Removed near-duplicate paragraph (${Math.round(overlap * 100)}% overlap)`);
          isDuplicate = true;
          break;
        }
      }
    }

    if (!isDuplicate) {
      seen.add(normalized);
      unique.push(trimmed);
    }
  }

  return unique.join('\n\n');
}

// Simple overlap computation using shared word sequences
function computeOverlap(a: string, b: string): number {
  const wordsA = a.split(/\s+/);
  const wordsB = new Set(b.split(/\s+/));
  let shared = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) shared++;
  }
  return shared / Math.max(wordsA.length, 1);
}

// Full content cleaning pipeline — runs after every generation
function cleanGeneratedContent(content: string, language?: string): string {
  let result = content;

  // 1. Strip markdown
  result = stripMarkdown(result);

  // 2. Fix citation spacing
  result = fixCitationSpacing(result);

  // 3. Deduplicate paragraphs
  result = deduplicateParagraphs(result);

  // 4. Remove AI meta-commentary that leaked
  result = result.replace(/^(Here is|Here's|Below is|I have written|I will write|Let me write|Sure[,!]?).*$/gm, '');

  // 5. Remove "Section:", "Title:" prefixes AI sometimes adds
  result = result.replace(/^(Section|Title|Bo['']lim|Раздел)\s*:\s*/im, '');

  // 6. Clean up extra whitespace
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.replace(/[ \t]{2,}/g, ' ');

  // 7. Normalize Uzbek apostrophes
  if (language === 'uz') {
    result = normalizeUzbekApostrophes(result);
  }

  return result.trim();
}

// ─────────────────────────────────────────────
// 4. HUMANIZATION PIPELINE
// ─────────────────────────────────────────────

// AI patterns that detectors look for - organized by language
const AI_PATTERNS: Record<string, string[]> = {
  en: [
    'It is important to note that',
    'It is worth noting that',
    'It should be noted that',
    'In today\'s rapidly evolving',
    'In the realm of',
    'plays a crucial role',
    'plays a pivotal role',
    'it is essential to',
    'the landscape of',
    'a comprehensive understanding',
    'a nuanced understanding',
    'delve into',
    'delve deeper',
    'a myriad of',
    'paradigm shift',
    'holistic approach',
    'Moreover,',
    'Furthermore,',
    'Additionally,',
    'In conclusion,',
    'Consequently,',
    'Nonetheless,',
    'Significantly,',
    'Notably,',
  ],
  uz: [
    'Shuni ta\'kidlash kerakki',
    'Shuni aytish kerakki',
    'Ta\'kidlash joizki',
    'Bugungi kunda',
    'Zamonaviy davrda',
    'muhim ahamiyatga ega',
    'katta ahamiyatga ega',
    'alohida ahamiyatga ega',
    'dolzarb masalalardan biri',
    'Bundan tashqari,',
    'Shuningdek,',
    'Xulosa qilib aytganda,',
    'Yuqoridagilarni umumlashtirib,',
  ],
  ru: [
    'Важно отметить, что',
    'Стоит отметить, что',
    'Следует отметить, что',
    'В современном мире',
    'играет ключевую роль',
    'играет важную роль',
    'комплексный подход',
    'парадигмальный сдвиг',
    'Более того,',
    'Кроме того,',
    'В заключение,',
    'Следовательно,',
    'Тем не менее,',
  ]
};

// Natural replacements for common AI transition words
const TRANSITION_REPLACEMENTS: Record<string, Record<string, string[]>> = {
  en: {
    'Moreover,': ['Beyond this,', 'What\'s more,', 'On top of that,', 'Adding to this,'],
    'Furthermore,': ['In addition,', 'Also worth considering:', 'Building on this,', 'To expand on this,'],
    'Additionally,': ['Also,', 'On another note,', 'Alongside this,', 'Plus,'],
    'In conclusion,': ['To sum up,', 'All things considered,', 'Looking at the bigger picture,', 'Taking everything into account,'],
    'Consequently,': ['As a result,', 'This means that', 'Because of this,', 'The upshot is that'],
    'Nonetheless,': ['Even so,', 'That said,', 'Still,', 'Be that as it may,'],
    'Significantly,': ['Importantly,', 'What stands out is', 'A key point here is', 'Crucially,'],
    'Notably,': ['Interestingly,', 'What catches attention is', 'Worth highlighting:', 'In particular,'],
  },
  uz: {
    'Bundan tashqari,': ['Shu bilan birga,', 'Yana shuni ham aytish mumkinki,', 'Bunga qo\'shimcha ravishda,'],
    'Shuningdek,': ['Ayni paytda,', 'Shu ohangda,', 'Boshqa tomondan,'],
    'Xulosa qilib aytganda,': ['Umuman olganda,', 'Barchasini hisobga olsak,', 'Fikrni yakunlasak,'],
  },
  ru: {
    'Более того,': ['Помимо этого,', 'Вдобавок к этому,', 'К тому же,'],
    'Кроме того,': ['Наряду с этим,', 'Дополнительно стоит сказать,', 'Вместе с тем,'],
    'В заключение,': ['Подводя итоги,', 'Резюмируя сказанное,', 'Обобщая вышесказанное,'],
    'Следовательно,': ['Из этого вытекает, что', 'Таким образом,', 'Отсюда следует, что'],
  }
};

function removeAIPatterns(content: string, language: string): string {
  let result = content;
  const lang = language || 'en';
  const patterns = AI_PATTERNS[lang] || AI_PATTERNS['en'];
  const transitions = TRANSITION_REPLACEMENTS[lang] || TRANSITION_REPLACEMENTS['en'];

  for (const pattern of patterns) {
    if (transitions[pattern]) {
      const alternatives = transitions[pattern];
      const replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
      result = result.replace(new RegExp(escapeRegex(pattern), 'g'), replacement);
    }
  }

  // Remove repetitive sentence starters
  const paragraphs = result.split('\n\n');
  for (let i = 2; i < paragraphs.length; i++) {
    const getFirstWord = (p: string) => p.trim().split(/\s+/)[0]?.toLowerCase();
    if (getFirstWord(paragraphs[i]) === getFirstWord(paragraphs[i - 1]) &&
        getFirstWord(paragraphs[i]) === getFirstWord(paragraphs[i - 2])) {
      const words = paragraphs[i].trim().split(/\s+/);
      if (words.length > 3) {
        paragraphs[i] = words.slice(2).join(' ') + ' — ' + words.slice(0, 2).join(' ').replace(/,$/,'');
      }
    }
  }
  result = paragraphs.join('\n\n');

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addBurstiness(content: string): string {
  const paragraphs = content.split('\n\n');

  return paragraphs.map(para => {
    const sentences = para.match(/[^.!?]+[.!?]+/g);
    if (!sentences || sentences.length < 3) return para;

    const modified = sentences.map((sentence, idx) => {
      const trimmed = sentence.trim();
      const wordCount = trimmed.split(/\s+/).length;

      if (wordCount > 30 && idx % 3 === 0) {
        const midPoint = Math.floor(trimmed.length * 0.5);
        const breakPoints = [', ', '; ', ' — ', ' – '];
        for (const bp of breakPoints) {
          const nearMid = trimmed.indexOf(bp, midPoint - 20);
          if (nearMid > 0 && nearMid < midPoint + 20) {
            return trimmed;
          }
        }
      }

      return trimmed;
    });

    return modified.join(' ');
  }).join('\n\n');
}

async function humanizeWithGemini(content: string, language: string): Promise<string> {
  if (!GEMINI_API_KEY) return content;

  const langNames: Record<string, string> = { uz: 'Uzbek', en: 'English', ru: 'Russian' };
  const langName = langNames[language] || 'English';

  const systemPrompt = `You are a seasoned human professor who has been writing academic papers for 20+ years. Rewrite the text below so it sounds EXACTLY like a real human expert wrote it — not an AI. This must pass Turnitin AI detection and GPTZero with under 25% AI score.

ABSOLUTE RULES:
1. Keep ALL citations [1], [2], etc. EXACTLY as they are — do NOT change, remove, or renumber
2. Same meaning, same facts, same academic rigor
3. Write ONLY in ${langName}
4. Same approximate word count
5. Return ONLY the rewritten text, no meta-commentary
6. Do NOT use any markdown formatting (no **, no #, no ---)
7. Citation numbers must be attached directly to the preceding word with NO space: word[1] NOT word [1]

HOW REAL HUMANS WRITE (apply ALL of these):
- Sentence length varies wildly: "This matters." followed by a 35-word sentence with multiple clauses
- Humans make deliberate word choices, not generic ones
- Real academics use first-person sparingly: "We observed", "Our analysis suggests"
- Include small imperfections: occasional comma before "and", starting a sentence with "But" or "And", using dashes — like this
- Parenthetical asides appear naturally (often to qualify a claim or add nuance)
- Hedging is SPECIFIC: not "it is important" but "the data points toward" or "one interpretation is"
- Real paragraphs are uneven: some are 2 sentences, others are 6-7
- Avoid formulaic transitions
- Some sentences should be questions: "But does this hold across all contexts?"
- Use concrete language: numbers, names, dates, specific examples
- Mix tenses naturally: present for established facts, past for specific studies
- NEVER use these AI-giveaway phrases: "It is important to note", "plays a crucial role", "In today's rapidly evolving", "delve into", "a myriad of", "holistic approach", "paradigm shift", "it is essential", "landscape of", "comprehensive understanding"`;

  const userPrompt = `Rewrite this academic text. Preserve every [N] citation exactly. Make it sound like a real human professor wrote it. Return ONLY the rewritten text:\n\n${content}`;

  try {
    const result = await callGeminiWithRetry(systemPrompt, userPrompt, 0.8, 8192);
    const originalCitations = content.match(/\[\d+\]/g) || [];
    const resultCitations = result.match(/\[\d+\]/g) || [];

    if (originalCitations.length > 0 && resultCitations.length < originalCitations.length * 0.7) {
      console.log('Humanization lost too many citations, using original');
      return content;
    }

    return result;
  } catch (error) {
    console.error('Gemini humanization failed:', error);
    return content;
  }
}

async function humanizePipeline(content: string, language: string): Promise<string> {
  console.log('Starting humanization pipeline...');

  let result = removeAIPatterns(content, language);
  console.log('Step 1 done: AI patterns removed');

  result = await humanizeWithGemini(result, language);
  console.log('Step 2 done: Gemini paraphrasing');

  result = addBurstiness(result);
  console.log('Step 3 done: Burstiness added');

  return result;
}

// ─────────────────────────────────────────────
// 5. CITATION MANAGEMENT
// ─────────────────────────────────────────────

function extractCitationsFromContent(
  rawContent: string,
  startNum: number,
  academicSources: CitationRef[]
): { content: string; citations: CitationRef[] } {
  const citationSplit = rawContent.split('---CITATIONS---');
  let cleanContent = citationSplit[0].trim();
  const citations: CitationRef[] = [];

  if (citationSplit.length > 1) {
    const citationBlock = citationSplit[1];
    const citationLines = citationBlock.split('\n').filter(l => l.trim());

    for (const line of citationLines) {
      const match = line.match(/\[(\d+)\]\s*(.+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        const text = match[2].trim();
        const academicMatch = academicSources.find(s =>
          s.text.toLowerCase().includes(text.split('.')[0]?.toLowerCase() || '') ||
          text.toLowerCase().includes(s.text.split('.')[0]?.toLowerCase() || '')
        );
        citations.push({
          number: num,
          text: text,
          doi: academicMatch?.doi,
          url: academicMatch?.url,
          verified: !!academicMatch?.verified || !!(academicMatch?.doi),
        });
      }
    }
  }

  // If no explicit citations, map in-text citations to academic sources
  if (citations.length === 0 && academicSources.length > 0) {
    const inTextCitations = cleanContent.match(/\[\d+\]/g) || [];
    const uniqueNums = [...new Set(inTextCitations.map(c => parseInt(c.replace(/[\[\]]/g, ''))))].sort((a, b) => a - b);

    uniqueNums.forEach(num => {
      const sourceIdx = num - startNum;
      if (sourceIdx >= 0 && sourceIdx < academicSources.length) {
        const source = academicSources[sourceIdx];
        citations.push({
          ...source,
          number: num,
        });
      }
    });
  }

  // Clean up reference blocks that leaked into main content
  cleanContent = cleanContent.replace(/References?:?\s*\n+(\[\d+\].*\n?)+/gi, '').trim();
  cleanContent = cleanContent.replace(/\*\*References?\*\*:?\s*\n+(\[\d+\].*\n?)+/gi, '').trim();
  cleanContent = cleanContent.replace(/\*\*CITATIONS_USED:?\s*\d+\*\*/gi, '').trim();
  cleanContent = cleanContent.replace(/CITATIONS_USED:?\s*\d+/gi, '').trim();

  return { content: cleanContent, citations };
}

function verifyCitationIntegrity(content: string, citations: CitationRef[]): {
  valid: boolean;
  missingCitations: number[];
  orphanedCitations: number[];
} {
  const inTextNums = [...new Set(
    (content.match(/\[\d+\]/g) || []).map(c => parseInt(c.replace(/[\[\]]/g, '')))
  )];
  const citationNums = new Set(citations.map(c => c.number));

  const missingCitations = inTextNums.filter(n => !citationNums.has(n));
  const orphanedCitations = citations.filter(c => !inTextNums.includes(c.number)).map(c => c.number);

  return {
    valid: missingCitations.length === 0,
    missingCitations,
    orphanedCitations,
  };
}

// ─────────────────────────────────────────────
// 6. SPELLING/ORTHOGRAPHY RULES
// ─────────────────────────────────────────────

function getSpellingRules(language: string): string {
  if (language === 'uz') {
    return `
UZBEK ORTHOGRAPHY RULES (Mandatory):
- Use the official Latin script of Uzbek (O'zbek lotin alifbosi)
- For o' letter: write as o followed by apostrophe (o'). Examples: o'zbek, bo'lim, so'z, ko'p, to'g'ri
- For g' letter: write as g followed by apostrophe (g'). Examples: g'arb, g'oya, to'g'ri
- Use sh for ш, ch for ч, ng for нг
- Double vowels are NOT standard Uzbek — do NOT write "aa", "oo" etc.
- Use -lar/-ler for plurals correctly based on vowel harmony
- WRONG forms to NEVER use: o\`, ó, oʻ, gʻ, g\`, ğ
- Academic terms may remain in their original language if no standard Uzbek equivalent exists
- Follow the 1995 Uzbek Latin alphabet standard strictly
- CAPITALIZATION: In Uzbek, section headings and subheadings should only capitalize the first word (and proper nouns). Do NOT use Title Case.`;
  }

  if (language === 'ru') {
    return `
RUSSIAN ORTHOGRAPHY RULES (Mandatory):
- Follow modern Russian orthographic norms (Правила русской орфографии и пунктуации)
- Use ё where required (not replacing with е): учёный, расчёт, etc.
- Correct punctuation: em-dash (—) with spaces, NOT hyphen (-) for parenthetical
- Academic abbreviations: и т.д., и т.п., т.е., др.
- Correct declension of foreign names and terms
- Proper use of soft/hard signs in academic terminology`;
  }

  return `
ENGLISH ORTHOGRAPHY RULES (Mandatory):
- Follow standard academic English conventions
- Use consistent spelling throughout (American OR British, not mixed)
- Correct hyphenation of compound modifiers: well-known, state-of-the-art
- Academic abbreviations: e.g., i.e., et al., etc.
- Proper capitalization of proper nouns and acronyms`;
}

// ─────────────────────────────────────────────
// 7. UZBEK APOSTROPHE + TITLE CAPITALIZATION
// ─────────────────────────────────────────────

// Normalize Uzbek apostrophes: ensure o' and g' use consistent apostrophe (')
function normalizeUzbekApostrophes(text: string): string {
  let result = text;
  // Replace various apostrophe characters with standard apostrophe (')
  // Common wrong variants: ʻ (U+02BB), ` (backtick), ' (U+2018), ' (U+2019), ʼ (U+02BC), ′ (prime)
  // We want to use standard apostrophe (') for o' and g'
  result = result.replace(/([oOgG])[ʻ`''ʼ′]/g, "$1'");
  return result;
}

// Fix title capitalization for Uzbek/Russian: only first word capitalized (+ proper nouns)
function fixTitleCapitalization(title: string, language: string): string {
  if (!title || title.length === 0) return title;

  // Common proper nouns / abbreviations that should stay capitalized
  const properNouns = new Set([
    // Uzbek
    "O'zbekiston", "Toshkent", "Samarqand", "Buxoro", "Farg'ona", "BMT", "AQSH", "YeI",
    // Russian
    'Узбекистан', 'Россия', 'Ташкент', 'ООН', 'США', 'ЕС',
    // International
    'AI', 'IT', 'GDP', 'IMRAD', 'UNESCO', 'WHO', 'WTO', 'IMF',
  ]);

  const words = title.split(/\s+/);
  if (words.length === 0) return title;

  return words.map((word, index) => {
    // First word: keep its capitalization (capitalize first letter)
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }

    // Proper nouns / abbreviations: keep as-is
    if (properNouns.has(word) || /^[A-Z]{2,}$/.test(word)) {
      return word;
    }

    // Everything else: lowercase
    return word.toLowerCase();
  }).join(' ');
}

// ─────────────────────────────────────────────
// 8. MAIN HANDLER
// ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      type,
      config,
      sectionName,
      priorSummaries,
      extraInstructions,
      regenMode,
      userInstruction,
      targetWordCount,
      startingCitationNumber,
      isConclusion,
      isReferences,
      storedCitations,
      humanize
    } = await req.json();

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const { language, domain, academicLevel, citationStyle, styleMode, modelMode, mainIdea, title, sources } = config || {};

    const languageNames: Record<string, string> = { uz: 'Uzbek', en: 'English', ru: 'Russian' };
    const langName = languageNames[language] || 'Uzbek';
    const spellingRules = getSpellingRules(language);

    // ─── TITLES GENERATION ───
    if (type === 'titles') {
      const capitalizationRule = language === 'uz'
        ? `\nUZBEK TITLE CAPITALIZATION: In Uzbek, only the FIRST word of the title starts with a capital letter, all other words are lowercase (except proper nouns). Example: "Huquqiy davlat tushunchasi va uning rivojlanishi" NOT "Huquqiy Davlat Tushunchasi Va Uning Rivojlanishi". This is the standard Uzbek academic convention.`
        : language === 'ru'
        ? `\nRUSSIAN TITLE CAPITALIZATION: In Russian, only the FIRST word of the title starts with a capital letter, all other words are lowercase (except proper nouns). Example: "Правовое государство и его развитие" NOT "Правовое Государство И Его Развитие".`
        : '';

      const systemPrompt = `You are an expert academic writer specializing in ${domain} research. You write in ${langName} language.
Your task is to generate compelling academic article titles.
${spellingRules}${capitalizationRule}
IMPORTANT: Respond ONLY with a JSON array of strings, no other text. Example: ["Title 1", "Title 2"]`;

      const userPrompt = `Generate 8-12 academic article titles for a ${academicLevel} level paper in ${domain}.
Main idea/research question: ${mainIdea}
Citation style: ${citationStyle}
Writing style: ${styleMode}

Requirements:
- All titles must be in ${langName}
- Titles should be appropriate for ${academicLevel} level academic writing
- Include a mix of descriptive, analytical, and argumentative title styles
- Make titles specific and engaging
${language === 'uz' || language === 'ru' ? '- IMPORTANT: Only capitalize the FIRST word of each title (and proper nouns). Do NOT use Title Case.' : ''}

Respond with ONLY a JSON array of title strings.`;

      const content = await callGeminiWithRetry(systemPrompt, userPrompt, 0.9, 1000);

      let titles: string[];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        titles = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        titles = content.split('\n').filter((line: string) => line.trim()).slice(0, 12);
      }

      // Post-process titles: fix capitalization for Uzbek/Russian
      if (language === 'uz' || language === 'ru') {
        titles = titles.map(t => fixTitleCapitalization(t, language));
      }

      // Post-process: normalize Uzbek apostrophes
      if (language === 'uz') {
        titles = titles.map(t => normalizeUzbekApostrophes(t));
      }

      return new Response(JSON.stringify({ titles }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── REFERENCES COMPILATION ───
    if (type === 'references' || isReferences) {
      console.log('Compiling References from stored citations');

      const citations = storedCitations || [];

      if (citations.length === 0) {
        const noRefsMessage = language === 'uz'
          ? "Hozircha manbalar mavjud emas. Avval boshqa bo'limlarni yarating."
          : language === 'ru'
          ? 'Источники пока отсутствуют. Сначала сгенерируйте другие разделы.'
          : 'No references available yet. Generate other sections first.';

        return new Response(JSON.stringify({
          content: noRefsMessage,
          summary: noRefsMessage,
          citations: [],
          sourcesMetadata: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sortedCitations = [...citations].sort((a: CitationRef, b: CitationRef) => a.number - b.number);

      const referencesContent = sortedCitations.map((c: CitationRef) =>
        `[${c.number}] ${c.text}`
      ).join('\n\n');

      const verifiedCount = citations.filter((c: CitationRef) => c.verified).length;
      const summary = `${citations.length} references compiled (${verifiedCount} verified with DOI)`;

      return new Response(JSON.stringify({
        content: referencesContent,
        summary,
        citations: [],
        sourcesMetadata: sortedCitations
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── SECTION GENERATION ───
    if (type === 'section') {
      const startNum = startingCitationNumber || 1;
      const wordTarget = targetWordCount || 700;

      // User-provided sources
      const userSourcesInfo = sources?.length
        ? `\n\nUser-provided priority sources (cite these first):\n${sources.map((s: any, i: number) => `[${startNum + i}] ${s.title}: ${s.urlOrDoi}`).join('\n')}`
        : '';

      // Prior section context — uses FULL content to prevent repetition
      // Cap each section at 2000 chars to stay within token limits, but provide as much as possible
      const priorContext = priorSummaries?.length
        ? `\n\n=== ALREADY WRITTEN SECTIONS — DO NOT REPEAT ANY CONTENT FROM BELOW ===\n${priorSummaries.map((s: any) => {
            const content = (s.summary || '').substring(0, 2000);
            return `──── ${s.name} ────\n${content}`;
          }).join('\n\n')}\n=== END OF PRIOR CONTENT — EVERYTHING ABOVE IS ALREADY IN THE ARTICLE. WRITE ONLY NEW, ORIGINAL CONTENT ===`
        : '';

      // Extract key sentences from prior content for explicit "do not repeat" list
      const priorSentences = priorSummaries?.length
        ? priorSummaries.flatMap((s: any) => {
            const sentences = (s.summary || '').match(/[^.!?]+[.!?]+/g) || [];
            // Take first sentence of each paragraph as the most likely to be repeated
            const paragraphs = (s.summary || '').split('\n\n');
            const firstSentences = paragraphs
              .map((p: string) => (p.match(/[^.!?]+[.!?]+/) || [''])[0].trim())
              .filter((sent: string) => sent.length > 20);
            return [...firstSentences, ...sentences.slice(0, 5).map((sent: string) => sent.trim())];
          })
        : [];
      const uniquePriorSentences = [...new Set(priorSentences.map((s: string) => s.substring(0, 100)))];
      const priorSentenceWarning = uniquePriorSentences.length > 0
        ? `\n\nEXPLICIT BLACKLIST — these exact sentences/openings are ALREADY in the article. Using any of them = FAILURE:\n${uniquePriorSentences.slice(0, 30).map((s: string) => `FORBIDDEN: "${s}"`).join('\n')}`
        : '';

      // Regeneration instructions
      let regenInstructions = '';
      if (regenMode) {
        const modes: Record<string, string> = {
          concise: 'Make the content more concise and to-the-point.',
          technical: 'Make the content more technical and detailed.',
          counterargument: 'Add counterarguments and critical analysis.',
          examples: 'Add more specific examples and case studies.',
          transitions: 'Improve transitions between ideas.',
          deeper: 'Go deeper into the analysis with more nuance.',
        };
        regenInstructions = `\n\nSPECIAL INSTRUCTION: ${modes[regenMode] || regenMode}`;
      }
      if (userInstruction) {
        regenInstructions += `\n\nUSER REQUESTED CHANGES (apply these precisely): ${userInstruction}`;
      }

      // ─── ABSTRACT (no citations) ───
      const isAbstract = ['abstract', 'annotatsiya', 'аннотация', 'abstrakt'].some(
        term => sectionName?.toLowerCase().includes(term)
      );

      if (isAbstract) {
        let systemPrompt = `You are an expert academic writer in ${domain} at ${academicLevel} level.
Write in ${langName} using ${styleMode} style.
${spellingRules}

ABSOLUTE FORMAT RULES:
- Write ONLY in ${langName}
- Do NOT use any markdown formatting. No **, no #, no ---, no bullet points.
- Output ONLY plain text paragraphs.
- This is an ABSTRACT for the article titled: "${title}"
- Approximately ${Math.min(wordTarget, 300)} words (abstracts are concise)
- NO citations [1], [2] or references — abstracts NEVER contain references
- NO bibliography or source list
- Summarize the research problem, methodology, key findings, and conclusion
- Write as a single cohesive paragraph or 2-3 short paragraphs
- Use ${academicLevel}-level academic language
- Domain: ${domain}`;

        if (humanize) {
          systemPrompt += `\n\nWRITING STYLE: Vary sentence length, use active voice predominantly, avoid AI clichés.`;
        }

        const userPrompt = `Write an abstract for: "${title}"
Domain: ${domain}, Level: ${academicLevel}
Target: ${Math.min(wordTarget, 300)} words
IMPORTANT: Do NOT include any citations [1], [2] or references. This is an abstract. No markdown formatting.${priorContext}${regenInstructions}`;

        let content = await callGeminiWithRetry(systemPrompt, userPrompt, 0.7, 2000);

        // Strip any citations that leaked through
        content = content.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();
        content = cleanGeneratedContent(content, language);

        if (humanize) {
          content = await humanizePipeline(content, language);
          content = content.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();
          content = cleanGeneratedContent(content, language);
        }

        const summary = content.substring(0, 200) + '...';

        return new Response(JSON.stringify({ content, summary, citations: [], sourcesMetadata: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ─── KEYWORDS (special format) ───
      const isKeywords = ['keyword', 'kalit', 'ключев'].some(
        term => sectionName?.toLowerCase().includes(term)
      );

      if (isKeywords) {
        const systemPrompt = `Output ONLY a single line of academic keywords separated by semicolons. Example: "artificial intelligence; machine learning; neural networks; deep learning; computer vision"
RULES: 5-8 keywords, each 1-3 words, language: ${langName}, domain: ${domain}. NO explanations, NO descriptions, NO sentences, NO bullets, NO numbering. ONLY the keywords line.
${spellingRules}`;

        const userPrompt = `Keywords for: "${title}". Output format: keyword1; keyword2; keyword3; keyword4; keyword5`;

        let content = await callGeminiWithRetry(systemPrompt, userPrompt, 0.3, 200);

        // BULLETPROOF post-processing — force exact format
        content = content.replace(/\[\d+\]/g, '');
        content = content.replace(/\*\*/g, '');
        content = content.replace(/["""'']/g, '');
        content = content.replace(/^(keywords?|kalit\s*so['']?zlar|ключевые\s*слова)\s*:?\s*/im, '');
        content = content.replace(/^\s*[-*•►▸]\s*/gm, '');
        content = content.replace(/^\s*\d+[\.\)]\s*/gm, '');

        let keywords = content
          .split(/[;\n|]/)
          .map(k => k.trim())
          .filter(k => k.length > 0 && k.length < 60);

        keywords = keywords.filter(k => k.split(/\s+/).length <= 5);

        const seen = new Set<string>();
        keywords = keywords.filter(k => {
          const lower = k.toLowerCase();
          if (seen.has(lower)) return false;
          seen.add(lower);
          return true;
        });

        keywords = keywords.slice(0, 8);
        content = keywords.length >= 3
          ? keywords.join('; ')
          : content.replace(/\n/g, '; ').replace(/\s{2,}/g, ' ').trim();

        return new Response(JSON.stringify({ content, summary: content, citations: [], sourcesMetadata: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ─── CONCLUSION (no citations) ───
      if (isConclusion) {
        let systemPrompt = `You are an expert academic writer in ${domain} at ${academicLevel} level.
Write in ${langName} using ${citationStyle} style. Style: ${styleMode}.
${spellingRules}

CONCLUSION RULES:
- Write ONLY in ${langName}
- Do NOT use any markdown formatting. No **, no #, no ---, no bullet points.
- Output ONLY plain text paragraphs.
- RELEVANT to "${sectionName}" and title "${title}"
- NO citations [1], [2] in conclusion
- Approximately ${wordTarget} words
- Summarize findings and provide final thoughts
- Citation numbers must NOT appear in the conclusion`;

        if (humanize) {
          systemPrompt += `\n\nWRITING STYLE (critical):
- Vary sentence length significantly (some 5 words, some 30+)
- Use occasional rhetorical questions
- Write as a knowledgeable human expert sharing insights
- Add hedging language where appropriate
- Use predominantly active voice
- Avoid generic filler phrases`;
        }

        const userPrompt = `Write "${sectionName}" (Conclusion) for: "${title}"
Domain: ${domain}, Level: ${academicLevel}
Target: ${wordTarget} words${priorContext}${regenInstructions}

NO CITATIONS. Summarize findings and provide recommendations. No markdown.`;

        let content = await callGeminiWithRetry(systemPrompt, userPrompt, 0.7, 4000);

        content = cleanGeneratedContent(content, language);

        if (humanize) {
          content = await humanizePipeline(content, language);
          content = cleanGeneratedContent(content, language);
        }

        const summary = content.substring(0, 200) + '...';

        return new Response(JSON.stringify({ content, summary, citations: [], sourcesMetadata: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ─── REGULAR SECTION (with citations) ───

      // Step 1: Get real academic sources
      console.log('Step 1: Searching academic sources...');
      const academicData = await getAcademicSources(title || mainIdea, domain, sectionName);

      // Offset citation numbers
      const offsetCitations = academicData.citations.map((c, i) => ({
        ...c,
        number: startNum + i,
      }));

      // Step 2: Build context with real sources
      const sourcesContext = academicData.sources.map((s, i) => {
        const num = startNum + i;
        const doiInfo = s.doi ? ` (DOI: ${s.doi})` : '';
        return `[${num}] "${s.title}" by ${s.authors} (${s.year})${doiInfo}\nKey info: ${s.abstract?.substring(0, 300) || 'N/A'}`;
      }).join('\n\n');

      // Domain-specific citation instructions
      const domainCitations = domain === 'law'
        ? 'Cite REAL laws, regulations, court cases with specific article numbers. Also use the academic sources provided.'
        : 'Cite the REAL academic sources provided below. Use their actual authors, titles, and years.';

      // Step 3: Generate content with GEMINI using real sources
      const systemPrompt = `You are an expert academic writer in ${domain} at ${academicLevel} level.
Write in ${langName} using ${citationStyle} citation format. Writing style: ${styleMode}.
${spellingRules}

CRITICAL FORMAT RULES:
- Write ONLY in ${langName}
- Do NOT use any markdown formatting. No **, no #, no ---, no bullet points, no bold, no italic markers.
- Output ONLY plain academic text paragraphs.
- This section is "${sectionName}" for the article: "${title}"
- Use citations ONLY as numbers [${startNum}], [${startNum + 1}], etc. in the text
- Citation numbers must be attached directly to the preceding word with NO space: word[1] NOT word [1]
- DO NOT include full reference text in the main content
- Approximately ${wordTarget} words
- ${domainCitations}
- EVERY citation [N] MUST correspond to a real source from the list provided
- Use information from the source abstracts to write accurate, factual content

ANTI-REPETITION RULES (absolutely critical — violation means failure):
- You have been given the FULL TEXT of previously written sections below
- Do NOT repeat ANY sentence, phrase, or idea that already exists in prior sections
- Do NOT restate the article's purpose/goals if already covered
- Do NOT paraphrase content from prior sections — write COMPLETELY NEW analysis
- Each paragraph must contain ideas NOT found in any prior section
- If prior sections already discussed a concept, skip it or mention "As noted earlier" in one short phrase${priorSentenceWarning}

PARAMETER COMPLIANCE:
- Academic level "${academicLevel}" means: ${academicLevel === 'bachelor' ? 'clear explanations, foundational concepts, accessible language' : academicLevel === 'master' ? 'deeper analysis, methodological rigor, critical evaluation' : 'original contribution, advanced methodology, novel theoretical frameworks'}
- Domain "${domain}" means: focus content specifically on ${domain} concepts, terminology, and frameworks
- Style "${styleMode}" means: ${styleMode === 'formal' ? 'strict academic tone, third person, passive voice acceptable' : styleMode === 'natural' ? 'readable academic tone, occasional first person, active voice preferred' : 'refined professional tone, precise language, elegant phrasing'}

AT THE VERY END of your response, add "---CITATIONS---" and list each citation used:
[${startNum}] Full reference: Author(s), Title, Year, DOI/URL
[${startNum + 1}] Full reference...

${humanize ? `WRITING STYLE (critical for natural text):
- Vary sentence length dramatically: mix 5-word sentences with 30+ word ones
- Start paragraphs with different patterns each time
- Use occasional rhetorical questions
- Add parenthetical clarifications naturally
- Use hedging: "seems to suggest", "might indicate", "arguably"
- Predominantly active voice
- NO generic filler: avoid "It is important to note", "plays a crucial role"` : ''}`;

      const userPrompt = `Write "${sectionName}" section for: "${title}"
Domain: ${domain}, Level: ${academicLevel}, Citation: ${citationStyle}
Target: ${wordTarget} words, Start citations at [${startNum}]
${userSourcesInfo}${priorContext}${regenInstructions}

--- REAL ACADEMIC SOURCES (use these for citations) ---
${sourcesContext}

IMPORTANT:
1. In the main text, only use [number] citations — attached to the word with no space
2. Base your content on the REAL information from the sources above
3. After "---CITATIONS---", list each citation with full reference details
4. Every [number] in the text MUST have a corresponding entry in citations
5. Do NOT repeat content already covered in prior sections — produce COMPLETELY NEW analysis for "${sectionName}"
6. Match the academic level (${academicLevel}) in depth and complexity
7. Write exclusively in ${langName}
8. NO markdown formatting — plain text only`;

      console.log('Step 2: Generating content with Gemini...');
      let rawContent = await callGeminiWithRetry(systemPrompt, userPrompt, 0.7, 8192);

      // Step 4: Extract and verify citations
      console.log('Step 3: Extracting citations...');
      const extracted = extractCitationsFromContent(rawContent, startNum, offsetCitations);
      let cleanContent = extracted.content;
      let citations = extracted.citations;

      // If no citations were extracted from output, use our academic sources
      if (citations.length === 0 && offsetCitations.length > 0) {
        const inTextNums = [...new Set(
          (cleanContent.match(/\[\d+\]/g) || []).map(c => parseInt(c.replace(/[\[\]]/g, '')))
        )].sort((a, b) => a - b);

        citations = inTextNums.map(num => {
          const idx = num - startNum;
          if (idx >= 0 && idx < offsetCitations.length) {
            return offsetCitations[idx];
          }
          return { number: num, text: `Reference ${num}`, verified: false };
        });
      }

      // Verify citation integrity
      const integrity = verifyCitationIntegrity(cleanContent, citations);
      if (!integrity.valid) {
        console.log(`Citation integrity check: missing=[${integrity.missingCitations}], orphaned=[${integrity.orphanedCitations}]`);
      }

      // Step 5: Clean content (strip markdown, fix spacing, deduplicate)
      console.log('Step 4: Cleaning content...');
      cleanContent = cleanGeneratedContent(cleanContent);

      // Step 6: Humanization (if enabled)
      if (humanize) {
        console.log('Step 5: Running humanization pipeline...');
        cleanContent = await humanizePipeline(cleanContent, language);
        cleanContent = cleanGeneratedContent(cleanContent, language);
      }

      const summary = cleanContent.substring(0, 200) + '...';
      const verifiedCount = citations.filter(c => c.verified).length;
      console.log(`Done! Citations: ${citations.length} (${verifiedCount} verified), Words: ~${cleanContent.split(/\s+/).length}`);

      return new Response(JSON.stringify({
        content: cleanContent,
        summary,
        citations,
        sourcesMetadata: academicData.sources.slice(0, citations.length).map(s => ({
          title: s.title,
          authors: s.authors,
          year: s.year,
          doi: s.doi,
          url: s.url,
          citationCount: s.citationCount,
        })),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid generation type');
  } catch (error: unknown) {
    console.error('Error in generate-content:', error);

    if (error instanceof HttpError) {
      return new Response(
        JSON.stringify({ error: error.message, details: error.details }),
        {
          status: error.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
