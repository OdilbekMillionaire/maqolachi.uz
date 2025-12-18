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

// Function to search using SerpAPI
async function searchWithSerpAPI(query: string, domain: string): Promise<string> {
  const searchQuery = `${query} ${domain} academic research`;
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${SERPAPI_KEY}&num=10`;
  
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
  const searchContext = organicResults.slice(0, 8).map((result: any, i: number) => 
    `Source ${i + 1}: "${result.title}" - ${result.snippet || ''} (${result.link})`
  ).join('\n\n');
  
  console.log(`SerpAPI returned ${organicResults.length} results`);
  return searchContext;
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
    ? `${userPrompt}\n\n--- REAL SOURCES FROM WEB SEARCH (use these for citations) ---\n${searchContext}\n\nUSE THE ABOVE REAL SOURCES for your citations. Format them properly according to the citation style.`
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

    // Section generation
    if (type === 'section' || type === 'references') {
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
        
        return new Response(JSON.stringify({ content, summary, citationsUsed: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // For sections that need citations - use web search
      const searchQuery = `${title} ${sectionName} ${domain}`;
      let searchContext = '';
      let usedSerpAPI = false;
      let usedGemini = false;

      // Try SerpAPI first
      if (SERPAPI_KEY) {
        try {
          searchContext = await searchWithSerpAPI(searchQuery, domain);
          usedSerpAPI = true;
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

RULES:
- Write ONLY in ${langName}
- RELEVANT to "${sectionName}" and title "${title}"
- Citations starting from [${startNum}] sequentially
- Approximately ${wordTarget} words
- ${domainSpecificCitations}
- Use web search for REAL, ACCURATE sources${humanizeInstructions}`;

          const geminiUserPrompt = `Write "${sectionName}" section for: "${title}"
Domain: ${domain}, Level: ${academicLevel}, Citation: ${citationStyle}
Target: ${wordTarget} words, Start citations at [${startNum}]${sourcesInfo}${priorContext}${regenInstructions}

Search web for real sources. Include citations [${startNum}], [${startNum + 1}], etc.
End with: "CITATIONS_USED: X"`;

          const content = await callGeminiWithGrounding(geminiUserPrompt, geminiSystemPrompt);
          usedGemini = true;
          
          let citationsUsed = 0;
          let cleanContent = content;
          const citationCountMatch = content.match(/CITATIONS_USED:\s*(\d+)/i);
          if (citationCountMatch) {
            citationsUsed = parseInt(citationCountMatch[1], 10);
            cleanContent = content.replace(/CITATIONS_USED:\s*\d+/gi, '').trim();
          } else {
            const citations = content.match(/\[\d+\]/g) || [];
            citationsUsed = new Set(citations).size;
          }
          
          const summary = cleanContent.substring(0, 200) + '...';
          console.log(`Generated with Gemini, citations: ${citationsUsed}`);
          
          return new Response(JSON.stringify({ content: cleanContent, summary, citationsUsed }), {
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

RULES:
- Write ONLY in ${langName}
- RELEVANT to "${sectionName}" and title "${title}"
- Citations starting from [${startNum}] sequentially
- Approximately ${wordTarget} words
- ${domainSpecificCitations}
- Use the provided web search results for accurate citations${humanizeInstructions}`;

      userPrompt = `Write "${sectionName}" section for: "${title}"
Domain: ${domain}, Level: ${academicLevel}, Citation: ${citationStyle}
Target: ${wordTarget} words, Start citations at [${startNum}]${sourcesInfo}${priorContext}${regenInstructions}

Include citations [${startNum}], [${startNum + 1}], etc. based on provided sources.
End with: "CITATIONS_USED: X"`;

      console.log(`Generating with GROQ + ${usedSerpAPI ? 'SerpAPI context' : 'no search context'}`);
      
      const content = await callGroqWithContext(systemPrompt, userPrompt, searchContext, model, 0.7, 4000);
      
      let citationsUsed = 0;
      let cleanContent = content;
      const citationCountMatch = content.match(/CITATIONS_USED:\s*(\d+)/i);
      if (citationCountMatch) {
        citationsUsed = parseInt(citationCountMatch[1], 10);
        cleanContent = content.replace(/CITATIONS_USED:\s*\d+/gi, '').trim();
      } else {
        const citations = content.match(/\[\d+\]/g) || [];
        citationsUsed = new Set(citations).size;
      }
      
      const summary = cleanContent.substring(0, 200) + '...';
      console.log(`Generated successfully, citations: ${citationsUsed}`);
      
      return new Response(JSON.stringify({ content: cleanContent, summary, citationsUsed }), {
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