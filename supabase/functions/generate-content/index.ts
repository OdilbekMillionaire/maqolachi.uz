import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, config, sectionName, priorSummaries, extraInstructions, regenMode } = await req.json();

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
    } else if (type === 'section') {
      const sourcesInfo = sources?.length 
        ? `\n\nUser-provided sources (cite ONLY these if you need citations):\n${sources.map((s: any) => `- ${s.title}: ${s.urlOrDoi}`).join('\n')}`
        : '\n\nNo specific sources provided. If you mention references, label them as "Suggested references (verify)" without specific URLs or DOIs.';

      const priorContext = priorSummaries?.length
        ? `\n\nPrior sections context:\n${priorSummaries.map((s: any) => `${s.name}: ${s.summary}`).join('\n\n')}`
        : '';

      let regenInstructions = '';
      if (regenMode) {
        const regenModes: Record<string, string> = {
          concise: 'Make the content more concise and to the point.',
          technical: 'Make the content more technical and detailed.',
          counterargument: 'Add counterarguments and alternative perspectives.',
          examples: 'Add more examples, case studies, or illustrations.',
          transitions: 'Improve transitions and overall flow.'
        };
        regenInstructions = `\n\nSpecial instruction: ${regenModes[regenMode] || regenMode}`;
      }

      systemPrompt = `You are an expert academic writer specializing in ${domain} research at the ${academicLevel} level.
You write in ${langName} language using ${citationStyle} citation style.
Your writing style is ${styleMode}.

CRITICAL RULES:
- Write ONLY in ${langName} language
- Never hallucinate URLs, DOIs, or specific case citations
- If citing sources, use ONLY the user-provided sources
- For Law domain: avoid inventing case citations; use doctrinal explanation if uncertain
- Maintain academic rigor appropriate for ${academicLevel} level`;

      userPrompt = `Write the "${sectionName}" section for an academic article.

Article title: ${title || 'Untitled'}
Domain: ${domain}
Academic level: ${academicLevel}
Citation style: ${citationStyle}${sourcesInfo}${priorContext}${regenInstructions}${extraInstructions ? `\n\nAdditional instructions: ${extraInstructions}` : ''}

Write comprehensive, well-structured content for this section (500-800 words). Include proper academic formatting and maintain continuity with prior sections if provided.`;
    } else {
      throw new Error('Invalid generation type');
    }

    console.log(`Generating ${type} with model ${model}`);

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
        temperature: type === 'titles' ? 0.9 : 0.7,
        max_tokens: type === 'titles' ? 1000 : 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GROQ API error:', response.status, errorText);
      throw new Error(`GROQ API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    console.log(`Generated ${type} successfully`);

    if (type === 'titles') {
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
    } else {
      const summary = content.substring(0, 200) + '...';
      return new Response(JSON.stringify({ content, summary }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    console.error('Error in generate-content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
