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
    } else if (type === 'section') {
      const startNum = startingCitationNumber || 1;
      
      const sourcesInfo = sources?.length 
        ? `\n\nUser-provided sources (cite these with sequential numbers starting from [${startNum}]):\n${sources.map((s: any, i: number) => `[${startNum + i}] ${s.title}: ${s.urlOrDoi}`).join('\n')}`
        : '';

      const priorContext = priorSummaries?.length
        ? `\n\nPrior sections context (maintain continuity, continue citation numbering from [${startNum}]):\n${priorSummaries.map((s: any) => `${s.name}: ${s.summary}`).join('\n\n')}`
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

      const wordTarget = targetWordCount || 700;
      
      // Humanization instructions
      const humanizeInstructions = humanize ? `

HUMANIZATION INSTRUCTIONS (CRITICAL - make text natural and undetectable by AI detectors):
- Vary sentence length significantly (mix very short with longer complex sentences)
- Use occasional contractions, informal transitions, and natural speech patterns
- Include personal observations, rhetorical questions, and engaging hooks
- Add slight imperfections like parenthetical asides or mid-sentence clarifications
- Use diverse vocabulary - avoid repetitive academic phrases
- Include occasional hedging language ("perhaps", "it seems", "one might argue")
- Write as a knowledgeable human expert would, not as a machine
- Vary paragraph lengths and structure unpredictably
- Use active voice predominantly, with occasional passive for emphasis` : '';

      // Special handling for conclusion - NO citations
      if (isConclusion) {
        systemPrompt = `You are an expert academic writer specializing in ${domain} research at the ${academicLevel} level.
You write in ${langName} language using ${citationStyle} citation style.
Your writing style is ${styleMode}.

CRITICAL RULES FOR CONCLUSION:
- Write ONLY in ${langName} language
- The section MUST be DIRECTLY RELEVANT to the section name "${sectionName}" and the article title "${title}"
- DO NOT include ANY citations or references [1], [2], etc. in the conclusion - conclusions should synthesize without new citations
- Generate approximately ${wordTarget} words for this section
- Summarize key findings and provide final thoughts
- Maintain academic rigor appropriate for ${academicLevel} level${humanizeInstructions}`;

        userPrompt = `Write the "${sectionName}" (Conclusion) section for an academic article.

Article title: ${title || 'Untitled'}
Domain: ${domain}
Academic level: ${academicLevel}
Target word count: ${wordTarget} words${priorContext}

CRITICAL REQUIREMENTS:
1. This is the CONCLUSION section - DO NOT include any citations [1], [2], etc.
2. Summarize the main findings and arguments from previous sections
3. Provide implications, recommendations, or future research directions
4. Write comprehensive, detailed content (approximately ${wordTarget} words)
5. End with a strong closing statement

Write the complete conclusion section now (NO CITATIONS):`;
      } else {
        // Regular section with citations
        systemPrompt = `You are an expert academic writer specializing in ${domain} research at the ${academicLevel} level.
You write in ${langName} language using ${citationStyle} citation style.
Your writing style is ${styleMode}.

CRITICAL RULES:
- Write ONLY in ${langName} language
- The section MUST be DIRECTLY RELEVANT to the section name "${sectionName}" and the article title "${title}"
- Include numbered citations starting from [${startNum}] sequentially (e.g., [${startNum}], [${startNum + 1}], [${startNum + 2}])
- Generate approximately ${wordTarget} words for this section
- For ${domain === 'law' ? 'Law domain: cite actual laws, legal codes, regulations, and legal principles' : 'your domain: cite relevant academic theories, research findings, and authoritative sources'}
- Citations should reference real types of sources (journals, books, laws, regulations) - include author names/titles when possible
- Maintain academic rigor appropriate for ${academicLevel} level
- Track how many citations you use and report the count at the end${humanizeInstructions}`;

        userPrompt = `Write the "${sectionName}" section for an academic article.

Article title: ${title || 'Untitled'}
Domain: ${domain}
Academic level: ${academicLevel}
Citation style: ${citationStyle}
Target word count: ${wordTarget} words
Starting citation number: [${startNum}]${sourcesInfo}${priorContext}${regenInstructions}${extraInstructions ? `\n\nAdditional instructions: ${extraInstructions}` : ''}

IMPORTANT REQUIREMENTS:
1. The content MUST be specifically about "${sectionName}" - write content that directly addresses what this section name implies
2. Stay focused on the article's main topic: "${title}"
3. Include academic citations using sequential numbered format starting from [${startNum}]
4. Write comprehensive, detailed, and informative content (approximately ${wordTarget} words)
5. Maintain continuity with prior sections if provided
6. Use formal academic language appropriate for ${academicLevel} level
7. Include relevant theories, concepts, and analysis specific to ${domain}
8. ${domain === 'law' ? 'Cite actual laws, legal regulations, codes, and legal principles - be specific about legal sources' : 'Cite relevant academic sources, theories, and research - mention author names and publication types'}
9. At the END of your response, add a line: "CITATIONS_USED: X" where X is the count of citations you used

Write the complete section content now:`;
      }
    } else if (type === 'references') {
      // Generate the references section based on citations used
      const totalCitations = startingCitationNumber || 10;
      
      systemPrompt = `You are an expert academic writer creating a references/bibliography section.
You write in ${langName} language using ${citationStyle} citation style.

Generate a properly formatted references list with ${totalCitations} references that would support an academic article about "${title}" in the ${domain} field.`;

      userPrompt = `Create a References section with ${totalCitations} entries for an academic article.

Article title: ${title || 'Untitled'}
Domain: ${domain}
Citation style: ${citationStyle}
Number of references needed: ${totalCitations}

Requirements:
1. Format each reference according to ${citationStyle} style
2. Include a mix of: ${domain === 'law' ? 'legal codes, court cases, legal journals, law textbooks, regulations' : 'journal articles, books, conference papers, authoritative reports'}
3. Number each reference [1], [2], [3], etc. up to [${totalCitations}]
4. Make references realistic and relevant to the topic
5. Include author names, titles, publication details, years (recent: 2018-2024)
6. Write in ${langName} language where appropriate

Generate the complete references list:`;
    } else {
      throw new Error('Invalid generation type');
    }

    console.log(`Generating ${type} with model ${model}, startingCitation: ${startingCitationNumber}, isConclusion: ${isConclusion}`);

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
        max_tokens: type === 'titles' ? 1000 : 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GROQ API error:', response.status, errorText);
      throw new Error(`GROQ API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;

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
      // Extract citation count from content
      let citationsUsed = 0;
      const citationCountMatch = content.match(/CITATIONS_USED:\s*(\d+)/i);
      if (citationCountMatch) {
        citationsUsed = parseInt(citationCountMatch[1], 10);
        // Remove the citation count line from content
        content = content.replace(/CITATIONS_USED:\s*\d+/gi, '').trim();
      } else if (!isConclusion) {
        // Count citations manually if not provided
        const citations = content.match(/\[\d+\]/g) || [];
        citationsUsed = new Set(citations).size;
      }
      
      const summary = content.substring(0, 200) + '...';
      return new Response(JSON.stringify({ content, summary, citationsUsed }), {
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
