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
  total: number;
}

export function calculatePrice(factors: PricingFactors): PriceBreakdown {
  const base = 35000;

  // Academic level
  const levelPrices: Record<string, number> = { bachelor: 0, master: 20000, phd: 40000 };
  const levelAddon = levelPrices[factors.academicLevel] || 0;

  // Domain complexity
  const domainPrices: Record<string, number> = {
    law: 15000, 'cs-ai': 15000,
    economics: 10000, sociology: 8000,
    biology: 10000, history: 8000, other: 5000,
  };
  const domainAddon = domainPrices[factors.domain] || 5000;

  // Humanization (significant because uses Gemini + post-processing)
  const humanizeAddon = factors.humanize ? 25000 : 0;

  // Quality mode (bigger LLM model)
  const qualityAddon = factors.modelMode === 'quality' ? 15000 : 0;

  // Writing style
  const stylePrices: Record<string, number> = { formal: 0, natural: 5000, polished: 12000 };
  const styleAddon = stylePrices[factors.styleMode] || 0;

  // Citation style complexity
  const citationPrices: Record<string, number> = { apa: 0, mla: 0, chicago: 5000, oscola: 8000 };
  const citationAddon = citationPrices[factors.citationStyle] || 0;

  // Section count (base includes 5 sections)
  const extraSections = Math.max(0, factors.sectionCount - 5);
  const sectionsAddon = extraSections * 5000;

  const total = base + levelAddon + domainAddon + humanizeAddon + qualityAddon + styleAddon + citationAddon + sectionsAddon;

  return {
    base, levelAddon, domainAddon, humanizeAddon,
    qualityAddon, styleAddon, citationAddon, sectionsAddon, total,
  };
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString('uz-UZ') + " so'm";
}
