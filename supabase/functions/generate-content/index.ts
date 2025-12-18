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

interface CitationRef {
  number: number;
  text: string;
}

// Function to search using SerpAPI
async function searchWithSerpAPI(query: string, domain: string): Promise<{ context: string; sources: CitationRef[] }> {
  const searchQuery = `${query} ${domain} academic research`;
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${SERPAPI_KEY}&num=15`;
  
  console.log('Searching with SerpAPI:', searchQuery);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('SerpAPI error:', response.status, errorText);
    throw new Error(`SerpAPI error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Extract relevant search results
  const organicResults = data.organic_results || [];
  const sources: CitationRef[] = [];
  
  const searchContext = organicResults.slice(0, 12).map((result: any, i: number) => {
    sources.push({
      number: i + 1,
      text: `${result.title}. ${result.snippet || ''} URL: ${result.link}`
    });
    return `Source ${i + 1}: "${result.title}" - ${result.snippet || ''} (${result.link})`;
  }).join('\n\n');
  
  console.log(`SerpAPI returned ${organicResults.length} results`);
  return { context: searchContext, sources };
}

// Function to call Gemini with web grounding (fallback)
async function callGeminiWithGrounding(prompt: string, systemPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
        }
      ],
      tools: [{
        google_search: {}
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return content;
}

// Function to call GROQ with search context
async function callGroqWithContext(systemPrompt: string, userPrompt: string, searchContext: string, model: string, temperature: number, maxTokens: number): Promise<string> {
  const enhancedPrompt = searchContext 
    ? `${userPrompt}\n\n--- REAL SOURCES FROM WEB SEARCH (use these for citations) ---\n${searchContext}`
    : userPrompt;

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
        { role: 'user', content: enhancedPrompt }
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('GROQ API error:', response.status, errorText);
    throw new Error(`GROQ API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Function to call GROQ without search
async function callGroq(systemPrompt: string, userPrompt: string, model: string, temperature: number, maxTokens: number): Promise<string> {
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('GROQ API error:', response.status, errorText);
    throw new Error(`GROQ API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

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
    
    const languageNames: Record<string, string> = {
      uz: 'Uzbek',
      en: 'English', 
      ru: 'Russian'
    };
    const langName = languageNames[language] || 'Uzbek';

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'titles') {
      systemPrompt = `You are an expert academic writer specializing in ${domain} research. You write in ${langName} language.
Your task is to generate compelling academic article titles.
IMPORTANT: Respond ONLY with a JSON array of strings, no other text. Example: ["Title 1", "Title 2", "Title 3"]`;

      userPrompt = `Generate 8-12 academic article titles for a ${academicLevel} level paper in ${domain}.
Main idea/research question: ${mainIdea}
Citation style: ${citationStyle}
Writing style: ${styleMode}

Requirements:
- All titles must be in ${langName}
- Titles should be appropriate for ${academicLevel} level academic writing
- Include a mix of descriptive, analytical, and argumentative title styles
- Make titles specific and engaging

Respond with ONLY a JSON array of title strings.`;

      // Titles don't need web search
      const content = await callGroq(systemPrompt, userPrompt, model, 0.9, 1000);
      
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

    // Handle References section - compile from stored citations
    if (type === 'references' || isReferences) {
      console.log('Generating References section from stored citations');
      
      const citations = storedCitations || [];
      
      if (citations.length === 0) {
        const noRefsMessage = language === 'uz' 
          ? 'Hozircha manbalar mavjud emas. Avval boshqa bo\'limlarni yarating.'
          : language === 'ru'
          ? 'Источники пока отсутствуют. Сначала сгенерируйте другие разделы.'
          : 'No references available yet. Generate other sections first.';
        
        return new Response(JSON.stringify({ 
          content: noRefsMessage, 
          summary: noRefsMessage,
          citations: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Sort citations by number and format them
      const sortedCitations = [...citations].sort((a: CitationRef, b: CitationRef) => a.number - b.number);
      
      const referencesContent = sortedCitations.map((c: CitationRef) => `[${c.number}] ${c.text}`).join('\n\n');
      
      const summary = `${citations.length} references compiled`;
      
      return new Response(JSON.stringify({ 
        content: referencesContent, 
        summary,
        citations: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Section generation
    if (type === 'section') {
      const startNum = startingCitationNumber || 1;
      
      const sourcesInfo = sources?.length 
        ? `\n\nUser-provided sources (cite these first):\n${sources.map((s: any, i: number) => `[${startNum + i}] ${s.title}: ${s.urlOrDoi}`).join('\n')}`
        : '';

      const priorContext = priorSummaries?.length
        ? `\n\nPrior sections (maintain continuity):\n${priorSummaries.map((s: any) => `${s.name}: ${s.summary}`).join('\n\n')}`
        : '';

      let regenInstructions = '';
      if (regenMode) {
        const regenModes: Record<string, string> = {
          concise: 'Make the content more concise.',
          technical: 'Make the content more technical.',
          counterargument: 'Add counterarguments.',
          examples: 'Add more examples.',
          transitions: 'Improve transitions.'
        };
        regenInstructions = `\n\nSpecial: ${regenModes[regenMode] || regenMode}`;
      }

      const wordTarget = targetWordCount || 700;
      
      const humanizeInstructions = humanize ? `

HUMANIZATION (make text natural, undetectable by AI detectors):
- Vary sentence length significantly
- Use occasional contractions and natural transitions
- Include rhetorical questions and engaging hooks
- Add parenthetical asides and mid-sentence clarifications
- Use diverse vocabulary, avoid repetitive phrases
- Include hedging language ("perhaps", "it seems", "one might argue")
- Write as a knowledgeable human expert
- Vary paragraph lengths unpredictably
- Use active voice predominantly` : '';

      // Handle conclusion (no citations needed)
      if (isConclusion) {
        systemPrompt = `You are an expert academic writer in ${domain} at ${academicLevel} level.
Write in ${langName} using ${citationStyle} style. Style: ${styleMode}.

CONCLUSION RULES:
- Write ONLY in ${langName}
- RELEVANT to "${sectionName}" and title "${title}"
- NO citations [1], [2] in conclusion
- Approximately ${wordTarget} words
- Summarize findings, provide final thoughts${humanizeInstructions}`;

        userPrompt = `Write "${sectionName}" (Conclusion) for: "${title}"
Domain: ${domain}, Level: ${academicLevel}
Target: ${wordTarget} words${priorContext}

NO CITATIONS. Summarize findings and provide recommendations.`;

        const content = await callGroq(systemPrompt, userPrompt, model, 0.7, 4000);
        const summary = content.substring(0, 200) + '...';
        
        return new Response(JSON.stringify({ content, summary, citations: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // For sections that need citations - use web search
      const searchQuery = `${title} ${sectionName} ${domain}`;
      let searchContext = '';
      let searchSources: CitationRef[] = [];

      // Try SerpAPI first
      if (SERPAPI_KEY) {
        try {
          const result = await searchWithSerpAPI(searchQuery, domain);
          searchContext = result.context;
          searchSources = result.sources;
          console.log('Using SerpAPI for web search');
        } catch (error) {
          console.log('SerpAPI failed (possibly rate limited), falling back to Gemini');
        }
      }

      // If SerpAPI failed or not available, try Gemini
      if (!searchContext && GEMINI_API_KEY) {
        try {
          console.log('Using Gemini with web grounding as fallback');
          
          const domainSpecificCitations = domain === 'law' 
            ? 'Cite REAL laws, legal codes, regulations, court cases with specific article numbers and dates.'
            : 'Cite REAL academic sources, research papers with author names and years.';

          const geminiSystemPrompt = `You are an expert academic writer in ${domain} at ${academicLevel} level.
Write in ${langName} using ${citationStyle} style. Style: ${styleMode}.

CRITICAL FORMAT RULES:
- Write ONLY in ${langName}
- RELEVANT to "${sectionName}" and title "${title}"
- Use citations ONLY as numbers [${startNum}], [${startNum + 1}], etc. in the text
- DO NOT write full reference text in the content
- Approximately ${wordTarget} words
- ${domainSpecificCitations}
- Use web search for REAL, ACCURATE sources${humanizeInstructions}

AT THE VERY END, after "---CITATIONS---", list each citation with its full reference:
[${startNum}] Author, Title, Year, URL
[${startNum + 1}] Author, Title, Year, URL
etc.`;

          const geminiUserPrompt = `Write "${sectionName}" section for: "${title}"
Domain: ${domain}, Level: ${academicLevel}, Citation: ${citationStyle}
Target: ${wordTarget} words, Start citations at [${startNum}]${sourcesInfo}${priorContext}${regenInstructions}

IMPORTANT: Only put [number] citations in the text. Put full references after "---CITATIONS---" at the end.`;

          const rawContent = await callGeminiWithGrounding(geminiUserPrompt, geminiSystemPrompt);
          
          // Parse out citations from the end
          const citationSplit = rawContent.split('---CITATIONS---');
          let cleanContent = citationSplit[0].trim();
          const citations: CitationRef[] = [];
          
          if (citationSplit.length > 1) {
            const citationBlock = citationSplit[1];
            const citationLines = citationBlock.split('\n').filter(l => l.trim());
            
            for (const line of citationLines) {
              const match = line.match(/\[(\d+)\]\s*(.+)/);
              if (match) {
                citations.push({
                  number: parseInt(match[1], 10),
                  text: match[2].trim()
                });
              }
            }
          }
          
          // If no citations were parsed, try to extract from content
          if (citations.length === 0) {
            const inTextCitations = cleanContent.match(/\[\d+\]/g) || [];
            const uniqueNums = [...new Set(inTextCitations.map(c => parseInt(c.replace(/[\[\]]/g, ''))))];
            uniqueNums.forEach(num => {
              citations.push({
                number: num,
                text: `Reference ${num} - Source from web search`
              });
            });
          }
          
          const summary = cleanContent.substring(0, 200) + '...';
          console.log(`Generated with Gemini, citations: ${citations.length}`);
          
          return new Response(JSON.stringify({ content: cleanContent, summary, citations }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('Gemini also failed:', error);
        }
      }

      // Use GROQ with search context (or without if no search available)
      const domainSpecificCitations = domain === 'law' 
        ? 'Cite laws, legal codes, regulations, court cases with specific article numbers.'
        : 'Cite academic sources, research papers with author names and years.';

      systemPrompt = `You are an expert academic writer in ${domain} at ${academicLevel} level.
Write in ${langName} using ${citationStyle} style. Style: ${styleMode}.

CRITICAL FORMAT RULES:
- Write ONLY in ${langName}
- RELEVANT to "${sectionName}" and title "${title}"
- Use citations ONLY as numbers [${startNum}], [${startNum + 1}], etc. in the text
- DO NOT include full reference text in the main content
- Approximately ${wordTarget} words
- ${domainSpecificCitations}
- Use the provided web search results for accurate citations${humanizeInstructions}

AT THE VERY END of your response, add "---CITATIONS---" and then list each citation:
[${startNum}] Full reference text with author, title, year, URL
[${startNum + 1}] Full reference text...`;

      userPrompt = `Write "${sectionName}" section for: "${title}"
Domain: ${domain}, Level: ${academicLevel}, Citation: ${citationStyle}
Target: ${wordTarget} words, Start citations at [${startNum}]${sourcesInfo}${priorContext}${regenInstructions}

IMPORTANT RULES:
1. In the main text, only use [number] citations
2. After "---CITATIONS---", list each citation with full reference details from the sources provided
3. Make sure each [number] in the text has a corresponding entry in the citations list`;

      console.log(`Generating with GROQ + ${searchContext ? 'SerpAPI context' : 'no search context'}`);
      
      const rawContent = await callGroqWithContext(systemPrompt, userPrompt, searchContext, model, 0.7, 4000);
      
      // Parse out citations from the end
      const citationSplit = rawContent.split('---CITATIONS---');
      let cleanContent = citationSplit[0].trim();
      const citations: CitationRef[] = [];
      
      if (citationSplit.length > 1) {
        const citationBlock = citationSplit[1];
        const citationLines = citationBlock.split('\n').filter(l => l.trim());
        
        for (const line of citationLines) {
          const match = line.match(/\[(\d+)\]\s*(.+)/);
          if (match) {
            citations.push({
              number: parseInt(match[1], 10),
              text: match[2].trim()
            });
          }
        }
      }
      
      // If citations were found in search, use those for any missing numbers
      if (searchSources.length > 0 && citations.length === 0) {
        const inTextCitations = cleanContent.match(/\[\d+\]/g) || [];
        const uniqueNums = [...new Set(inTextCitations.map(c => parseInt(c.replace(/[\[\]]/g, ''))))].sort((a, b) => a - b);
        
        uniqueNums.forEach((num, idx) => {
          const sourceIdx = num - startNum;
          if (sourceIdx >= 0 && sourceIdx < searchSources.length) {
            citations.push({
              number: num,
              text: searchSources[sourceIdx].text
            });
          } else {
            citations.push({
              number: num,
              text: `Reference ${num} - Academic source`
            });
          }
        });
      }
      
      // Clean up any remaining citation blocks that weren't properly separated
      cleanContent = cleanContent.replace(/References?:?\s*\n+(\[\d+\].*\n?)+/gi, '').trim();
      cleanContent = cleanContent.replace(/\*\*References?\*\*:?\s*\n+(\[\d+\].*\n?)+/gi, '').trim();
      cleanContent = cleanContent.replace(/\*\*CITATIONS_USED:?\s*\d+\*\*/gi, '').trim();
      cleanContent = cleanContent.replace(/CITATIONS_USED:?\s*\d+/gi, '').trim();
      
      const summary = cleanContent.substring(0, 200) + '...';
      console.log(`Generated successfully, citations: ${citations.length}`);
      
      return new Response(JSON.stringify({ content: cleanContent, summary, citations }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid generation type');
  } catch (error: unknown) {
    console.error('Error in generate-content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});