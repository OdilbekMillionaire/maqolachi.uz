export const PAYMENT_CARD = '9860 0101 0240 8712';
export const PAYMENT_CARD_RAW = '9860010102408712';

export interface PricingFactors {
  academicLevel: string;
  domain: string;
  humanize: boolean;
  modelMode: string;
  styleMode: string;
  citationStyle: string;
  sectionCount: number;
  wordsPerSection: number;
}

export interface PriceBreakdown {
  base: number;
  levelAddon: number;
  domainAddon: number;
  humanizeAddon: number;
  qualityAddon: number;
  styleAddon: number;
  citationAddon: number;
  sectionsAddon: number;
  wordCountAddon: number;
  total: number;
}

export function calculatePrice(factors: PricingFactors): PriceBreakdown {
  const base = 25000;

  // Academic level
  const levelPrices: Record<string, number> = { bachelor: 0, master: 15000, phd: 30000 };
  const levelAddon = levelPrices[factors.academicLevel] || 0;

  // Domain complexity
  const domainPrices: Record<string, number> = {
    law: 10000, 'cs-ai': 10000,
    economics: 7000, sociology: 5000,
    biology: 7000, history: 5000, other: 3000,
  };
  const domainAddon = domainPrices[factors.domain] || 3000;

  // Humanization (significant because uses Gemini + post-processing)
  const humanizeAddon = factors.humanize ? 18000 : 0;

  // Quality mode (bigger LLM model)
  const qualityAddon = factors.modelMode === 'quality' ? 10000 : 0;

  // Writing style
  const stylePrices: Record<string, number> = { formal: 0, natural: 3000, polished: 8000 };
  const styleAddon = stylePrices[factors.styleMode] || 0;

  // Citation style complexity
  const citationPrices: Record<string, number> = { apa: 0, mla: 0, chicago: 3000, oscola: 5000 };
  const citationAddon = citationPrices[factors.citationStyle] || 0;

  // Section count (base includes 5 sections)
  const extraSections = Math.max(0, factors.sectionCount - 5);
  const sectionsAddon = extraSections * 3000;

  // Word count per section (base price assumes 300 words; each +100 words adds cost)
  const wordsPerSection = factors.wordsPerSection || 400;
  const extraWords = Math.max(0, wordsPerSection - 300);
  const wordCountAddon = Math.floor(extraWords / 100) * 5000;

  const total = base + levelAddon + domainAddon + humanizeAddon + qualityAddon + styleAddon + citationAddon + sectionsAddon + wordCountAddon;

  return {
    base, levelAddon, domainAddon, humanizeAddon,
    qualityAddon, styleAddon, citationAddon, sectionsAddon, wordCountAddon, total,
  };
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString('uz-UZ') + " so'm";
}
