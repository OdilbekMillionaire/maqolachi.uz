import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY');
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

// SerpAPI - existing, improved with academic focus
async function searchWithSerpAPI(query: string, domain: string): Promise<AcademicSource[]> {
  if (!SERPAPI_KEY) return [];

  try {
    const searchQuery = `${query} ${domain} academic research site:scholar.google.com OR site:researchgate.net OR site:academia.edu`;
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${SERPAPI_KEY}&num=10`;

    console.log('Searching SerpAPI:', searchQuery);

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    const results = data.organic_results || [];

    return results.slice(0, 8).map((r: any) => ({
      title: r.title || '',
      authors: 'Web source',
      year: r.date?.match(/\d{4}/)?.[0] || 'n.d.',
      abstract: r.snippet || '',
      url: r.link || '',
      doi: undefined,
      citationCount: 0,
    }));
  } catch (error) {
    console.error('SerpAPI failed:', error);
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

  // Run Semantic Scholar and CrossRef in parallel
  const [semanticResults, crossrefResults] = await Promise.all([
    searchSemanticScholar(searchQuery, domain, 10),
    searchCrossRef(`${searchQuery} ${domain}`, 8),
  ]);

  console.log(`Semantic Scholar: ${semanticResults.length}, CrossRef: ${crossrefResults.length}`);

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

  // Prefer Semantic Scholar (better academic coverage), then CrossRef (has DOIs)
  semanticResults.forEach(addIfNew);
  crossrefResults.forEach(addIfNew);

  // If not enough academic sources, fall back to SerpAPI
  if (allSources.length < 5) {
    const serpResults = await searchWithSerpAPI(query, domain);
    serpResults.forEach(addIfNew);
    console.log(`Added ${serpResults.length} SerpAPI results as fallback`);
  }

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
// 2. AI CALLING FUNCTIONS
// ─────────────────────────────────────────────

async function callGroqWithRetry(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  temperature: number,
  maxTokens: number,
  maxRetries = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(GROQ_BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 2000;
        lastError = new HttpError(429, 'GROQ rate limited', `Retry ${attempt + 1}/${maxRetries}`);
        console.log(`GROQ 429, waiting ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpError(response.status, `GROQ error: ${response.status}`, errorText);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 2000;
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }

  throw lastError || new Error('GROQ failed after retries');
}

async function callGemini(prompt: string, systemPrompt: string, useGrounding = false): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const body: any = {
    contents: [{
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini error:', response.status, errorText);
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─────────────────────────────────────────────
// 3. HUMANIZATION PIPELINE
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

// Step 1: Algorithmic pattern removal and variation
function removeAIPatterns(content: string, language: string): string {
  let result = content;
  const lang = language || 'en';
  const patterns = AI_PATTERNS[lang] || AI_PATTERNS['en'];
  const transitions = TRANSITION_REPLACEMENTS[lang] || TRANSITION_REPLACEMENTS['en'];

  // Replace AI-specific phrases with nothing or lighter alternatives
  for (const pattern of patterns) {
    if (transitions[pattern]) {
      // Replace with a random natural alternative
      const alternatives = transitions[pattern];
      const replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
      result = result.replace(new RegExp(escapeRegex(pattern), 'g'), replacement);
    }
  }

  // Remove repetitive sentence starters - if 3+ consecutive paragraphs start the same
  const paragraphs = result.split('\n\n');
  for (let i = 2; i < paragraphs.length; i++) {
    const getFirstWord = (p: string) => p.trim().split(/\s+/)[0]?.toLowerCase();
    if (getFirstWord(paragraphs[i]) === getFirstWord(paragraphs[i - 1]) &&
        getFirstWord(paragraphs[i]) === getFirstWord(paragraphs[i - 2])) {
      // Vary the third paragraph's opening
      const words = paragraphs[i].trim().split(/\s+/);
      if (words.length > 3) {
        // Move first 2-3 words to create different structure
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

// Step 2: Vary sentence structure for burstiness
function addBurstiness(content: string): string {
  const paragraphs = content.split('\n\n');

  return paragraphs.map(para => {
    const sentences = para.match(/[^.!?]+[.!?]+/g);
    if (!sentences || sentences.length < 3) return para;

    // Randomly combine some short sentences and split some long ones
    const modified = sentences.map((sentence, idx) => {
      const trimmed = sentence.trim();
      const wordCount = trimmed.split(/\s+/).length;

      // If sentence is very long (30+ words), try to add a natural break
      if (wordCount > 30 && idx % 3 === 0) {
        const midPoint = Math.floor(trimmed.length * 0.5);
        const breakPoints = [', ', '; ', ' — ', ' – '];
        for (const bp of breakPoints) {
          const nearMid = trimmed.indexOf(bp, midPoint - 20);
          if (nearMid > 0 && nearMid < midPoint + 20) {
            // Keep as is - natural break exists
            return trimmed;
          }
        }
      }

      return trimmed;
    });

    return modified.join(' ');
  }).join('\n\n');
}

// Step 3: Gemini-based paraphrasing for deep humanization
async function humanizeWithGemini(content: string, language: string): Promise<string> {
  if (!GEMINI_API_KEY) return content;

  const langNames: Record<string, string> = { uz: 'Uzbek', en: 'English', ru: 'Russian' };
  const langName = langNames[language] || 'English';

  const systemPrompt = `You are a professional human academic editor. Your ONLY job is to rewrite the given academic text so that it reads as if written by an experienced human researcher, NOT by AI.

CRITICAL RULES:
1. Keep ALL citations exactly as they are: [1], [2], etc. - do NOT change, remove, or renumber them
2. Keep the SAME meaning, facts, and academic quality
3. Write ONLY in ${langName}
4. Keep the same approximate length
5. DO NOT add any comments, notes, or meta-text. Return ONLY the rewritten text.

HUMANIZATION TECHNIQUES to apply:
- Vary sentence length dramatically: mix very short sentences (5-8 words) with longer complex ones (25-35 words)
- Use occasional parenthetical asides (like this one) to add natural voice
- Start paragraphs differently - never use the same pattern twice in a row
- Use rhetorical questions sparingly but effectively
- Replace generic academic filler with specific, concrete language
- Add hedging where appropriate: "seems to suggest", "might indicate", "arguably"
- Use active voice predominantly, passive only when the actor is truly unimportant
- Include natural academic discourse markers: "interestingly", "upon closer examination", "what stands out"
- Vary paragraph lengths: some short (2-3 sentences), some longer (5-7 sentences)
- Avoid overusing transition words at the start of sentences`;

  const userPrompt = `Rewrite this academic text to sound naturally human while preserving all citations and meaning:\n\n${content}`;

  try {
    const result = await callGemini(userPrompt, systemPrompt, false);
    // Verify citations are preserved
    const originalCitations = content.match(/\[\d+\]/g) || [];
    const resultCitations = result.match(/\[\d+\]/g) || [];

    // If citations were lost, return original
    if (originalCitations.length > 0 && resultCitations.length < originalCitations.length * 0.7) {
      console.log('Humanization lost too many citations, using original');
      return content;
    }

    return result;
  } catch (error) {
    console.error('Gemini humanization failed:', error);
    return content; // Fallback to original
  }
}

// Full humanization pipeline
async function humanizeContent(content: string, language: string): Promise<string> {
  console.log('Starting humanization pipeline...');

  // Step 1: Algorithmic pattern removal
  let result = removeAIPatterns(content, language);
  console.log('Step 1 done: AI patterns removed');

  // Step 2: Gemini deep paraphrasing
  result = await humanizeWithGemini(result, language);
  console.log('Step 2 done: Gemini paraphrasing');

  // Step 3: Final burstiness pass
  result = addBurstiness(result);
  console.log('Step 3 done: Burstiness added');

  return result;
}

// ─────────────────────────────────────────────
// 4. CITATION MANAGEMENT
// ─────────────────────────────────────────────

function extractCitationsFromContent(
  rawContent: string,
  startNum: number,
  academicSources: CitationRef[]
): { content: string; citations: CitationRef[] } {
  // Split content from citation block
  const citationSplit = rawContent.split('---CITATIONS---');
  let cleanContent = citationSplit[0].trim();
  const citations: CitationRef[] = [];

  // Parse explicit citation block
  if (citationSplit.length > 1) {
    const citationBlock = citationSplit[1];
    const citationLines = citationBlock.split('\n').filter(l => l.trim());

    for (const line of citationLines) {
      const match = line.match(/\[(\d+)\]\s*(.+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        const text = match[2].trim();
        // Try to match with our academic sources for verification
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

// Verify citation-content alignment
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
// 5. MAIN HANDLER
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
      targetWordCount,
      startingCitationNumber,
      isConclusion,
      isReferences,
      storedCitations,
      humanize
    } = await req.json();

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const { language, domain, academicLevel, citationStyle, styleMode, modelMode, mainIdea, title, sources } = config || {};

    const model = modelMode === 'quality' ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';

    const languageNames: Record<string, string> = { uz: 'Uzbek', en: 'English', ru: 'Russian' };
    const langName = languageNames[language] || 'Uzbek';

    // ─── TITLES GENERATION ───
    if (type === 'titles') {
      const systemPrompt = `You are an expert academic writer specializing in ${domain} research. You write in ${langName} language.
Your task is to generate compelling academic article titles.
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

Respond with ONLY a JSON array of title strings.`;

      const content = await callGroqWithRetry(systemPrompt, userPrompt, model, 0.9, 1000);

      let titles: string[];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        titles = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        titles = content.split('\n').filter((line: string) => line.trim()).slice(0, 12);
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

      // Sort and format citations based on citation style
      const sortedCitations = [...citations].sort((a: CitationRef, b: CitationRef) => a.number - b.number);

      // Format based on style
      let referencesContent: string;
      if (citationStyle === 'apa') {
        referencesContent = sortedCitations.map((c: CitationRef) =>
          `[${c.number}] ${c.text}`
        ).join('\n\n');
      } else if (citationStyle === 'mla') {
        referencesContent = sortedCitations.map((c: CitationRef) =>
          `[${c.number}] ${c.text}`
        ).join('\n\n');
      } else {
        referencesContent = sortedCitations.map((c: CitationRef) =>
          `[${c.number}] ${c.text}`
        ).join('\n\n');
      }

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

      // Prior section context
      const priorContext = priorSummaries?.length
        ? `\n\nPrior sections for continuity:\n${priorSummaries.map((s: any) => `${s.name}: ${s.summary}`).join('\n\n')}`
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

      // ─── CONCLUSION (no citations) ───
      if (isConclusion) {
        let systemPrompt = `You are an expert academic writer in ${domain} at ${academicLevel} level.
Write in ${langName} using ${citationStyle} style. Style: ${styleMode}.

CONCLUSION RULES:
- Write ONLY in ${langName}
- RELEVANT to "${sectionName}" and title "${title}"
- NO citations [1], [2] in conclusion
- Approximately ${wordTarget} words
- Summarize findings and provide final thoughts`;

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

NO CITATIONS. Summarize findings and provide recommendations.`;

        let content = await callGroqWithRetry(systemPrompt, userPrompt, model, 0.7, 4000);

        if (humanize) {
          content = await humanizeContent(content, language);
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

      // Step 3: Generate content with GROQ using real sources
      const systemPrompt = `You are an expert academic writer in ${domain} at ${academicLevel} level.
Write in ${langName} using ${citationStyle} style. Style: ${styleMode}.

CRITICAL FORMAT RULES:
- Write ONLY in ${langName}
- RELEVANT to "${sectionName}" and title "${title}"
- Use citations ONLY as numbers [${startNum}], [${startNum + 1}], etc. in the text
- DO NOT include full reference text in the main content
- Approximately ${wordTarget} words
- ${domainCitations}
- EVERY citation [N] MUST correspond to a real source from the list provided
- Use information from the source abstracts to write accurate, factual content

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
1. In the main text, only use [number] citations
2. Base your content on the REAL information from the sources above
3. After "---CITATIONS---", list each citation with full reference details
4. Every [number] in the text MUST have a corresponding entry in citations`;

      console.log('Step 2: Generating content with GROQ...');
      let rawContent = await callGroqWithRetry(systemPrompt, userPrompt, model, 0.7, 4000);

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

      // Step 5: Humanization (if enabled)
      if (humanize) {
        console.log('Step 4: Running humanization pipeline...');
        cleanContent = await humanizeContent(cleanContent, language);
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
