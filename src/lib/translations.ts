export type Language = 'uz' | 'en' | 'ru';

export const translations = {
  uz: {
    // Common
    save: "Saqlash",
    cancel: "Bekor qilish",
    delete: "O'chirish",
    edit: "Tahrirlash",
    add: "Qo'shish",
    next: "Keyingi",
    back: "Orqaga",
    loading: "Yuklanmoqda...",
    
    // Sidebar
    project: "Loyiha",
    newProject: "Yangi loyiha",
    phases: "Bosqichlar",
    sections: "Bo'limlar",
    export: "Eksport",
    share: "Ulashish",
    history: "Tarix",
    
    // Phase names
    phaseConfig: "Konfiguratsiya",
    phaseSkeleton: "Struktura",
    phaseWrite: "Yozish",
    
    // Config phase
    configTitle: "Loyiha sozlamalari",
    configSubtitle: "Maqola parametrlarini belgilang va asosiy g'oyangizni kiriting",
    language: "Til",
    domain: "Soha",
    level: "Daraja",
    citationStyle: "Iqtibos uslubi",
    writingStyle: "Yozish uslubi",
    mainIdea: "Asosiy g'oya / Tadqiqot savoli",
    mainIdeaPlaceholder: "Maqolangizning asosiy g'oyasi yoki tadqiqot savolini kiriting...",
    generateTitles: "Sarlavhalar generatsiya qilish",
    generating: "Generatsiya...",
    suggestedTitles: "Taklif qilingan sarlavhalar",
    nextStep: "Keyingi bosqich",
    selectedTitle: "Tanlangan sarlavha",
    editTitlePlaceholder: "Sarlavhani tahrirlashingiz mumkin...",
    titlesGenerated: "Sarlavhalar muvaffaqiyatli generatsiya qilindi!",
    titlesError: "Sarlavhalarni generatsiya qilishda xatolik yuz berdi",
    
    // Domains
    domainLaw: "Huquq",
    domainEconomics: "Iqtisodiyot",
    domainCsAi: "IT va AI",
    domainSociology: "Sotsiologiya",
    domainBiology: "Biologiya",
    domainHistory: "Tarix",
    domainOther: "Boshqa",
    
    // Academic levels
    levelBachelor: "Bakalavr",
    levelMaster: "Magistr",
    levelPhd: "PhD",
    
    // Citation styles
    citationApa: "APA",
    citationApaDesc: "Ijtimoiy fanlar",
    citationMla: "MLA",
    citationMlaDesc: "Gumanitar fanlar",
    citationChicago: "Chicago",
    citationChicagoDesc: "Tarix, san'at",
    citationOscola: "OSCOLA",
    citationOscolaDesc: "Huquq",
    
    // Style modes
    styleFormal: "Rasmiy",
    styleFormalDesc: "Akademik va ilmiy",
    styleNatural: "Tabiiy",
    styleNaturalDesc: "O'qishga oson",
    stylePolished: "Sayqallangan",
    stylePolishedDesc: "Professional",
    
    // Skeleton phase
    skeletonTitle: "Maqola tuzilishi",
    skeletonSubtitle: "Bo'limlarni tartibga keltiring, nomlang va zarur bo'lsa yangilarini qo'shing",
    selectedTitleLabel: "Tanlangan sarlavha",
    sectionsLabel: "Bo'limlar",
    addSection: "Bo'lim qo'shish",
    newSectionPlaceholder: "Yangi bo'lim nomi...",
    startWriting: "Yozishni boshlash",
    noTitleSelected: "Sarlavha tanlanmagan",
    
    // Write phase
    writeTitle: "Maqola yozish",
    writeSubtitle: "Har bir bo'limni AI yordamida generatsiya qiling yoki qo'lda yozing",
    titleLabel: "Sarlavha",
    preview: "Oldindan ko'rish",
    progress: "Jarayon",
    sectionsCount: "bo'lim",
    content: "Kontent",
    notes: "Eslatmalar (ixtiyoriy)",
    notesPlaceholder: "Bu bo'lim uchun eslatmalar...",
    contentPlaceholder: "Bo'lim kontentini yozing yoki AI yordamida generatsiya qiling...",
    regenerate: "Qayta generatsiya",
    generate: "Generatsiya qilish",
    variants: "Boshqa variantlar",
    backToStructure: "Strukturaga qaytish",
    exportDoc: "Eksport qilish",
    
    // Status
    statusGenerated: "Generatsiya qilindi",
    statusEdited: "Tahrirlandi",
    statusDraft: "Qoralama",
    statusEmpty: "Bo'sh",
    
    // Progress steps
    progressContext: "Kontekst o'rganilmoqda...",
    progressGenerating: "Kontent generatsiya qilinmoqda...",
    progressPolishing: "Sayqallanmoqda...",
    
    // Toast messages
    sectionGenerated: "Bo'lim muvaffaqiyatli generatsiya qilindi!",
    generationError: "Generatsiyada xatolik yuz berdi",
    exportSuccess: "Maqola muvaffaqiyatli yuklab olindi!",
    exportError: "Eksport qilishda xatolik yuz berdi",
    
    // Default sections
    sectionIntro: "Kirish",
    sectionLitReview: "Adabiyotlar sharhi",
    sectionMethodology: "Metodologiya",
    sectionResults: "Natijalar",
    sectionDiscussion: "Muhokama",
    sectionConclusion: "Xulosa",
    sectionReferences: "Adabiyotlar",
  },
  
  en: {
    // Common
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    next: "Next",
    back: "Back",
    loading: "Loading...",
    
    // Sidebar
    project: "Project",
    newProject: "New project",
    phases: "Phases",
    sections: "Sections",
    export: "Export",
    share: "Share",
    history: "History",
    
    // Phase names
    phaseConfig: "Configuration",
    phaseSkeleton: "Structure",
    phaseWrite: "Write",
    
    // Config phase
    configTitle: "Project Settings",
    configSubtitle: "Set article parameters and enter your main idea",
    language: "Language",
    domain: "Domain",
    level: "Level",
    citationStyle: "Citation Style",
    writingStyle: "Writing Style",
    mainIdea: "Main Idea / Research Question",
    mainIdeaPlaceholder: "Enter your article's main idea or research question...",
    generateTitles: "Generate Titles",
    generating: "Generating...",
    suggestedTitles: "Suggested Titles",
    nextStep: "Next Step",
    selectedTitle: "Selected Title",
    editTitlePlaceholder: "You can edit the title...",
    titlesGenerated: "Titles generated successfully!",
    titlesError: "Error generating titles",
    
    // Domains
    domainLaw: "Law",
    domainEconomics: "Economics",
    domainCsAi: "IT and AI",
    domainSociology: "Sociology",
    domainBiology: "Biology",
    domainHistory: "History",
    domainOther: "Other",
    
    // Academic levels
    levelBachelor: "Bachelor",
    levelMaster: "Master",
    levelPhd: "PhD",
    
    // Citation styles
    citationApa: "APA",
    citationApaDesc: "Social Sciences",
    citationMla: "MLA",
    citationMlaDesc: "Humanities",
    citationChicago: "Chicago",
    citationChicagoDesc: "History, Art",
    citationOscola: "OSCOLA",
    citationOscolaDesc: "Law",
    
    // Style modes
    styleFormal: "Formal",
    styleFormalDesc: "Academic and scientific",
    styleNatural: "Natural",
    styleNaturalDesc: "Easy to read",
    stylePolished: "Polished",
    stylePolishedDesc: "Professional",
    
    // Skeleton phase
    skeletonTitle: "Article Structure",
    skeletonSubtitle: "Arrange sections, rename them, and add new ones if needed",
    selectedTitleLabel: "Selected Title",
    sectionsLabel: "Sections",
    addSection: "Add Section",
    newSectionPlaceholder: "New section name...",
    startWriting: "Start Writing",
    noTitleSelected: "No title selected",
    
    // Write phase
    writeTitle: "Write Article",
    writeSubtitle: "Generate each section with AI or write manually",
    titleLabel: "Title",
    preview: "Preview",
    progress: "Progress",
    sectionsCount: "sections",
    content: "Content",
    notes: "Notes (optional)",
    notesPlaceholder: "Notes for this section...",
    contentPlaceholder: "Write section content or generate with AI...",
    regenerate: "Regenerate",
    generate: "Generate",
    variants: "Other variants",
    backToStructure: "Back to structure",
    exportDoc: "Export",
    
    // Status
    statusGenerated: "Generated",
    statusEdited: "Edited",
    statusDraft: "Draft",
    statusEmpty: "Empty",
    
    // Progress steps
    progressContext: "Analyzing context...",
    progressGenerating: "Generating content...",
    progressPolishing: "Polishing...",
    
    // Toast messages
    sectionGenerated: "Section generated successfully!",
    generationError: "Generation error occurred",
    exportSuccess: "Article downloaded successfully!",
    exportError: "Export error occurred",
    
    // Default sections
    sectionIntro: "Introduction",
    sectionLitReview: "Literature Review",
    sectionMethodology: "Methodology",
    sectionResults: "Results",
    sectionDiscussion: "Discussion",
    sectionConclusion: "Conclusion",
    sectionReferences: "References",
  },
  
  ru: {
    // Common
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    edit: "Редактировать",
    add: "Добавить",
    next: "Далее",
    back: "Назад",
    loading: "Загрузка...",
    
    // Sidebar
    project: "Проект",
    newProject: "Новый проект",
    phases: "Этапы",
    sections: "Разделы",
    export: "Экспорт",
    share: "Поделиться",
    history: "История",
    
    // Phase names
    phaseConfig: "Конфигурация",
    phaseSkeleton: "Структура",
    phaseWrite: "Написание",
    
    // Config phase
    configTitle: "Настройки проекта",
    configSubtitle: "Укажите параметры статьи и введите основную идею",
    language: "Язык",
    domain: "Область",
    level: "Уровень",
    citationStyle: "Стиль цитирования",
    writingStyle: "Стиль написания",
    mainIdea: "Основная идея / Исследовательский вопрос",
    mainIdeaPlaceholder: "Введите основную идею или исследовательский вопрос вашей статьи...",
    generateTitles: "Сгенерировать заголовки",
    generating: "Генерация...",
    suggestedTitles: "Предложенные заголовки",
    nextStep: "Следующий этап",
    selectedTitle: "Выбранный заголовок",
    editTitlePlaceholder: "Вы можете отредактировать заголовок...",
    titlesGenerated: "Заголовки успешно сгенерированы!",
    titlesError: "Ошибка при генерации заголовков",
    
    // Domains
    domainLaw: "Право",
    domainEconomics: "Экономика",
    domainCsAi: "ИТ и ИИ",
    domainSociology: "Социология",
    domainBiology: "Биология",
    domainHistory: "История",
    domainOther: "Другое",
    
    // Academic levels
    levelBachelor: "Бакалавр",
    levelMaster: "Магистр",
    levelPhd: "PhD",
    
    // Citation styles
    citationApa: "APA",
    citationApaDesc: "Социальные науки",
    citationMla: "MLA",
    citationMlaDesc: "Гуманитарные науки",
    citationChicago: "Chicago",
    citationChicagoDesc: "История, искусство",
    citationOscola: "OSCOLA",
    citationOscolaDesc: "Право",
    
    // Style modes
    styleFormal: "Формальный",
    styleFormalDesc: "Академический и научный",
    styleNatural: "Естественный",
    styleNaturalDesc: "Легко читается",
    stylePolished: "Отточенный",
    stylePolishedDesc: "Профессиональный",
    
    // Skeleton phase
    skeletonTitle: "Структура статьи",
    skeletonSubtitle: "Упорядочьте разделы, переименуйте их и добавьте новые при необходимости",
    selectedTitleLabel: "Выбранный заголовок",
    sectionsLabel: "Разделы",
    addSection: "Добавить раздел",
    newSectionPlaceholder: "Название нового раздела...",
    startWriting: "Начать написание",
    noTitleSelected: "Заголовок не выбран",
    
    // Write phase
    writeTitle: "Написание статьи",
    writeSubtitle: "Генерируйте каждый раздел с помощью ИИ или пишите вручную",
    titleLabel: "Заголовок",
    preview: "Предпросмотр",
    progress: "Прогресс",
    sectionsCount: "разделов",
    content: "Контент",
    notes: "Заметки (необязательно)",
    notesPlaceholder: "Заметки для этого раздела...",
    contentPlaceholder: "Напишите контент раздела или сгенерируйте с помощью ИИ...",
    regenerate: "Перегенерировать",
    generate: "Сгенерировать",
    variants: "Другие варианты",
    backToStructure: "Вернуться к структуре",
    exportDoc: "Экспортировать",
    
    // Status
    statusGenerated: "Сгенерировано",
    statusEdited: "Отредактировано",
    statusDraft: "Черновик",
    statusEmpty: "Пусто",
    
    // Progress steps
    progressContext: "Анализ контекста...",
    progressGenerating: "Генерация контента...",
    progressPolishing: "Полировка...",
    
    // Toast messages
    sectionGenerated: "Раздел успешно сгенерирован!",
    generationError: "Ошибка генерации",
    exportSuccess: "Статья успешно скачана!",
    exportError: "Ошибка экспорта",
    
    // Default sections
    sectionIntro: "Введение",
    sectionLitReview: "Обзор литературы",
    sectionMethodology: "Методология",
    sectionResults: "Результаты",
    sectionDiscussion: "Обсуждение",
    sectionConclusion: "Заключение",
    sectionReferences: "Список литературы",
  }
};

export const getTranslation = (lang: Language) => translations[lang];

export const getDomainLabel = (domain: string, lang: Language) => {
  const t = translations[lang];
  const domainMap: Record<string, string> = {
    law: t.domainLaw,
    economics: t.domainEconomics,
    'cs-ai': t.domainCsAi,
    sociology: t.domainSociology,
    biology: t.domainBiology,
    history: t.domainHistory,
    other: t.domainOther,
  };
  return domainMap[domain] || domain;
};

export const getLevelLabel = (level: string, lang: Language) => {
  const t = translations[lang];
  const levelMap: Record<string, string> = {
    bachelor: t.levelBachelor,
    master: t.levelMaster,
    phd: t.levelPhd,
  };
  return levelMap[level] || level;
};

export const getStyleLabel = (style: string, lang: Language) => {
  const t = translations[lang];
  const styleMap: Record<string, { label: string; desc: string }> = {
    formal: { label: t.styleFormal, desc: t.styleFormalDesc },
    natural: { label: t.styleNatural, desc: t.styleNaturalDesc },
    polished: { label: t.stylePolished, desc: t.stylePolishedDesc },
  };
  return styleMap[style] || { label: style, desc: '' };
};
