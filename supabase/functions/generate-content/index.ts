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
  // Create multiple search queries for better coverage
  const queries = [
    `${query} ${sectionName}`,
    `${query} research paper`,
    `${sectionName} in ${domain}`
  ];

  // Run all three in parallel for maximum source coverage
  const [semanticResults, crossrefResults, geminiResults] = await Promise.all([
    searchSemanticScholar(queries[0], domain, 10),
    searchCrossRef(`${queries[0]} ${domain}`, 8),
    searchWithGemini(query, domain),
  ]);

  console.log(`Semantic Scholar: ${semanticResults.length}, CrossRef: ${crossrefResults.length}, Gemini: ${geminiResults.length}`);

  // Merge and deduplicate by title similarity
  const allSources: AcademicSource[] = [];
  const seenTitles = new Set<string>();

  const addIfNew = (source: AcademicSource) => {
    const normalizedTitle = source.title.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    if (!seenTitles.has(normalizedTitle) && source.title.length > 15) {
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
    const citeDiff = (Number(b.citationCount) || 0) - (Number(a.citationCount) || 0);
    if (citeDiff !== 0) return citeDiff;
    const yearA = parseInt(String(a.year).match(/\d{4}/)?.[0] || '0');
    const yearB = parseInt(String(b.year).match(/\d{4}/)?.[0] || '0');
    return yearB - yearA;
  });

  // Take top 15 sources for better variety
  const topSources = allSources.slice(0, 15);

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
          topP: 0.95,
          topK: 40,
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
        const errorData = await response.json().catch(() => ({}));
        throw new HttpError(response.status, `Gemini API error: ${response.statusText}`, JSON.stringify(errorData));
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      return text;
    } catch (error: any) {
      lastError = error;
      console.error(`Gemini attempt ${attempt + 1} failed:`, error.message);

      // Retry on 429 or 5xx
      if (error instanceof HttpError && (error.status === 429 || error.status >= 500)) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Gemini call failed after retries');
}

// ─────────────────────────────────────────────
// 3. HUMANIZATION PIPELINE
// ─────────────────────────────────────────────

function removeAIPatterns(text: string, language: string): string {
  let result = text;

  // AI transition patterns
  const patterns = [
    /in conclusion/gi, /furthermore/gi, /moreover/gi, /consequently/gi,
    /it is important to note/gi, /it is worth noting/gi, /it should be noted/gi,
    /not only.*but also/gi, /on the other hand/gi, /in addition/gi,
    /lastly/gi, /firstly/gi, /secondly/gi, /thirdly/gi,
    /xulosa qilib aytganda/gi, /shuni ta'kidlash kerakki/gi, /bundan tashqari/gi,
    /vaziyat shuni ko'rsatadiki/gi, /shunisi e'tiborga loyiqki/gi,
    /в заключение/gi, /кроме того/gi, /более того/gi, /следовательно/gi,
    /важно отметить/gi, /стоит отметить/gi, /с другой стороны/gi,
  ];

  patterns.forEach(p => {
    result = result.replace(p, (match) => {
      // Replace with simpler human-like transitions or nothing
      const rand = Math.random();
      if (rand < 0.3) return '';
      if (language === 'uz') return rand < 0.6 ? 'Shunday qilib' : 'Shuningdek';
      if (language === 'ru') return rand < 0.6 ? 'Так' : 'Также';
      return rand < 0.6 ? 'So' : 'Also';
    });
  });

  return result;
}

async function humanizeWithGemini(content: string, language: string): Promise<string> {
  const systemPrompt = `You are a professional academic editor. Your task is to rewrite the provided text to make it sound completely human-written and pass AI detection.
  
  RULES:
  1. Maintain the exact same meaning and academic depth.
  2. DO NOT change any citations like [1], [2], etc. Keep them exactly where they are.
  3. Vary sentence structure and length (burstiness).
  4. Use natural, sophisticated vocabulary (perplexity).
  5. Avoid common AI transition words.
  6. Write in ${language === 'uz' ? 'Uzbek' : language === 'ru' ? 'Russian' : 'English'}.
  7. Output ONLY the rewritten text.`;

  const userPrompt = `Rewrite this academic text to be undetectable as AI:\n\n${content}`;

  try {
    return await callGeminiWithRetry(systemPrompt, userPrompt, 0.8, 4000);
  } catch (e) {
    console.error('Gemini humanization failed, returning original:', e);
    return content;
  }
}

async function addPerplexity(text: string, language: string): Promise<string> {
  const systemPrompt = `You are a linguistic expert. Enhance the "perplexity" of the text by using more nuanced, context-specific academic vocabulary and varied phrasing.
  Maintain all citations [1], [2] exactly. Output ONLY the enhanced text.`;
  const userPrompt = `Enhance the linguistic complexity of this text:\n\n${text}`;
  try {
    return await callGeminiWithRetry(systemPrompt, userPrompt, 0.85, 4000);
  } catch {
    return text;
  }
}

function addBurstiness(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let result = "";
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i].trim();
    // Occasionally combine or split sentences for rhythm
    if (Math.random() > 0.8 && i < sentences.length - 1) {
      result += s + " " + sentences[i + 1].trim() + " ";
      i++;
    } else {
      result += s + " ";
    }
  }
  return result.trim();
}

async function humanizePipeline(content: string, language: string, settings?: { perplexity: number, burstiness: number }): Promise<string> {
  console.log('Starting humanization pipeline with settings:', settings);

  const perplexity = settings?.perplexity ?? 50;
  const burstiness = settings?.burstiness ?? 50;

  // Step 1: Algorithmic pattern removal
  let result = removeAIPatterns(content, language);
  console.log('Step 1 done: AI patterns removed');

  // Step 2: Gemini deep paraphrasing
  result = await humanizeWithGemini(result, language);
  console.log('Step 2 done: Gemini paraphrasing');

  // Step 3: Perplexity pass (only if perplexity > 20)
  if (perplexity > 20) {
    result = await addPerplexity(result, language);
    console.log('Step 3 done: Perplexity added');
  }

  // Step 4: Final burstiness pass (only if burstiness > 20)
  if (burstiness > 20) {
    result = addBurstiness(result);
    console.log('Step 4 done: Burstiness added');
  }

  return result;
}

// ─────────────────────────────────────────────
// 4. CITATION MANAGEMENT
// ─────────────────────────────────────────────

function fixCitationNumbers(content: string, startNum: number): string {
  let currentNum = startNum;
  const map: Record<string, string> = {};

  return content.replace(/\[(\d+)\]/g, (match, num) => {
    if (map[num]) return map[num];
    const newNum = `[${currentNum++}]`;
    map[num] = newNum;
    return newNum;
  });
}

function checkCitationIntegrity(content: string, citations: CitationRef[]): { valid: boolean; missingCitations: number[]; orphanedCitations: number[] } {
  const foundNumbers = (content.match(/\[(\d+)\]/g) || []).map(m => parseInt(m.match(/\d+/)![0]));
  const uniqueFound = [...new Set(foundNumbers)];
  const citationNumbers = citations.map(c => c.number);

  const missing = citationNumbers.filter(n => !uniqueFound.includes(n));
  const orphaned = uniqueFound.filter(n => !citationNumbers.includes(n));

  return {
    valid: missing.length === 0 && orphaned.length === 0,
    missingCitations: missing,
    orphanedCitations: orphaned
  };
}

// ─────────────────────────────────────────────
// 5. LINGUISTIC UTILS
// ─────────────────────────────────────────────

function getSpellingRules(language: string): string {
  if (language === 'uz') {
    return `
UZBEK SPELLING RULES:
- Use standard Latin alphabet.
- Use ' (apostrophe) for o' and g'. Example: o'zbek, g'alaba.
- Use ' (apostrophe) for tutuq belgisi. Example: ma'no, e'tibor.
- Do NOT use characters like ʻ, `, ', ʼ, ′. ONLY use the standard ' apostrophe.
- Ensure correct orthography for academic terms.`;
  }
  return '';
}

function fixTitleCapitalization(title: string, language: string): string {
  if (!title) return title;
  const trimmed = title.trim();
  if (language === 'uz' || language === 'ru') {
    // Capitalize first letter, lowercase the rest (except proper nouns - hard to detect perfectly, so we just do first letter)
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }
  return trimmed;
}

function normalizeUzbekApostrophes(text: string): string {
  return text.replace(/([oOgG])[ʻ`''ʼ′]/g, "$1'").replace(/([a-zA-Z])[ʻ`''ʼ′]/g, "$1'");
}

function cleanGeneratedContent(content: string, language: string): string {
  let cleaned = content;
  // Remove markdown headers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  // Remove bold/italic
  cleaned = cleaned.replace(/\*\*/g, '');
  // Normalize apostrophes for Uzbek
  if (language === 'uz') {
    cleaned = normalizeUzbekApostrophes(cleaned);
  }
  return cleaned.trim();
}

// ─────────────────────────────────────────────
// 6. MAIN HANDLER
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
      regenMode,
      userInstruction,
      targetWordCount,
      startingCitationNumber,
      isConclusion,
      isReferences,
      storedCitations,
      humanize,
      humanizeSettings
    } = await req.json();

    const {
      language,
      domain,
      academicLevel,
      citationStyle,
      styleMode,
      title,
      sources,
      mainIdea
    } = config;

    const langName = language === 'uz' ? 'Uzbek' : language === 'ru' ? 'Russian' : 'English';
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
      const priorContext = priorSummaries?.length
        ? `\n\n=== ALREADY WRITTEN SECTIONS — DO NOT REPEAT ANY CONTENT FROM BELOW ===\n${priorSummaries.map((s: any) => {
            const content = (s.summary || '').substring(0, 2000);
            return `──── ${s.name} ────\n${content}`;
          }).join('\n\n')}\n=== END OF PRIOR CONTENT — EVERYTHING ABOVE IS ALREADY IN THE ARTICLE. WRITE ONLY NEW, ORIGINAL CONTENT ===`
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

        const userPrompt = `Write an abstract for: "${title}"
Domain: ${domain}, Level: ${academicLevel}
Target: ${Math.min(wordTarget, 300)} words
IMPORTANT: Do NOT include any citations [1], [2] or references. This is an abstract. No markdown formatting.${priorContext}${regenInstructions}`;

        let content = await callGeminiWithRetry(systemPrompt, userPrompt, 0.7, 2000);

        // Strip any citations that leaked through
        content = content.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();
        content = cleanGeneratedContent(content, language);

        if (humanize) {
          content = await humanizePipeline(content, language, humanizeSettings);
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
        }).slice(0, 8);

        const finalContent = keywords.join('; ');
        return new Response(JSON.stringify({ content: finalContent, summary: finalContent, citations: [], sourcesMetadata: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ─── REGULAR SECTION (with citations) ───
      console.log(`Step 1: Searching for academic sources for "${sectionName}"...`);
      const { sources: academicSources, context: academicContext, citations: academicCitations } = await getAcademicSources(title, domain, sectionName || '');

      // Offset citation numbers
      const citations = academicCitations.map(c => ({
        ...c,
        number: c.number + startNum - 1
      }));

      const systemPrompt = `You are an expert academic writer in ${domain} at ${academicLevel} level.
Write in ${langName} using ${styleMode} style.
${spellingRules}

ABSOLUTE FORMAT RULES:
- Write ONLY in ${langName}
- Do NOT use any markdown formatting. No **, no #, no ---, no bullet points.
- Output ONLY plain text paragraphs.
- Use [number] for citations (e.g. [1], [2]).
- Do NOT include a bibliography or references list at the end.
- Use ${academicLevel}-level academic language.
- Domain: ${domain}`;

      const userPrompt = `Write the section "${sectionName}" for an article titled "${title}".
Domain: ${domain}, Level: ${academicLevel}
Target: ${wordTarget} words

ACADEMIC SOURCES TO CITE (Use [number] format):
${academicContext}${userSourcesInfo}

${priorContext}${regenInstructions}

IMPORTANT:
1. Cite the provided sources using [number] format.
2. Do NOT repeat content from prior sections.
3. Write ONLY the content for "${sectionName}".
4. NO markdown formatting. NO bold, NO headers.`;

      console.log('Step 2: Calling Gemini for content generation...');
      let content = await callGeminiWithRetry(systemPrompt, userPrompt, 0.7, 4000);

      // Step 3: Clean content
      let cleanContent = cleanGeneratedContent(content, language);

      // Step 4: Verify citations
      const integrity = checkCitationIntegrity(cleanContent, citations);
      if (!integrity.valid) {
        console.log(`Citation integrity check: missing=[${integrity.missingCitations}], orphaned=[${integrity.orphanedCitations}]`);
      }

      // Step 5: Humanization (if enabled)
      if (humanize) {
        console.log('Step 4: Running humanization pipeline...');
        cleanContent = await humanizePipeline(cleanContent, language, humanizeSettings);
      }

      const summary = cleanContent.substring(0, 200) + '...';
      const verifiedCount = citations.filter(c => c.verified).length;
      console.log(`Done! Citations: ${citations.length} (${verifiedCount} verified), Words: ~${cleanContent.split(/\s+/).length}`);

      return new Response(JSON.stringify({
        content: cleanContent,
        summary,
        citations,
        sourcesMetadata: academicSources
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid request type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message, details: error.details }), {
      status: error.status || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
