
export type Language = 'uz' | 'en' | 'ru';

interface LinguisticIssue {
  type: 'spelling' | 'grammar' | 'style';
  message: string;
  offset: number;
  length: number;
}

const COMMON_ERRORS: Record<Language, Record<string, string>> = {
  uz: {
    'xam': 'ham',
    'bilan': 'bilan',
    'uchun': 'uchun',
    'kegin': 'keyin',
    'xozir': 'hozir',
    'bo\'sa': 'bo\'lsa',
    'bo\'midi': 'bo\'lmaydi',
  },
  en: {
    'their': 'there/they\'re',
    'its': 'it\'s',
    'effect': 'affect',
    'loose': 'lose',
    'than': 'then',
  },
  ru: {
    'каторый': 'который',
    'вообщем': 'в общем',
    'извени': 'извини',
    'сдесь': 'здесь',
    'лудше': 'лучше',
  }
};

export const checkLinguistics = (text: string, lang: Language): LinguisticIssue[] => {
  const issues: LinguisticIssue[] = [];
  const errors = COMMON_ERRORS[lang] || {};

  // Check for common spelling/grammar errors
  Object.entries(errors).forEach(([error, correction]) => {
    const regex = new RegExp(`\\b${error}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        type: 'spelling',
        message: `Possible error: "${error}". Did you mean "${correction}"?`,
        offset: match.index,
        length: error.length
      });
    }
  });

  // Check for academic style issues
  const informalWords = {
    en: ['very', 'really', 'good', 'bad', 'nice', 'stuff', 'things'],
    uz: ['juda', 'rosa', 'yaxshi', 'yomon', 'narsa'],
    ru: ['очень', 'хороший', 'плохой', 'вещь']
  };

  (informalWords[lang] || []).forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        type: 'style',
        message: `Informal word: "${word}". Consider using a more academic alternative.`,
        offset: match.index,
        length: word.length
      });
    }
  });

  return issues;
};
