export interface SupportedCompetition {
  id: number;
  name: string;
  arabicName: string;
  slug: string;
  country: string;
  type: 'league' | 'cup' | 'international';
  category?: 'arab' | 'europe' | 'continental';
  active: boolean;
}

/**
 * Centralized configuration for all supported competitions in MatchZone.
 * Includes Top European Leagues and Major Arab Leagues & Tournaments.
 */
export const SUPPORTED_COMPETITIONS: SupportedCompetition[] = [
  // ==========================================
  // Big 5 European Leagues (الدوريات الأوروبية الكبرى)
  // ==========================================
  {
    id: 39,
    name: 'Premier League',
    arabicName: 'الدوري الإنجليزي الممتاز',
    slug: 'premier-league',
    country: 'England',
    type: 'league',
    category: 'europe',
    active: true,
  },
  {
    id: 140,
    name: 'La Liga',
    arabicName: 'الدوري الإسباني',
    slug: 'la-liga',
    country: 'Spain',
    type: 'league',
    category: 'europe',
    active: true,
  },
  {
    id: 135,
    name: 'Serie A',
    arabicName: 'الدوري الإيطالي',
    slug: 'serie-a',
    country: 'Italy',
    type: 'league',
    category: 'europe',
    active: true,
  },
  {
    id: 78,
    name: 'Bundesliga',
    arabicName: 'الدوري الألماني',
    slug: 'bundesliga',
    country: 'Germany',
    type: 'league',
    category: 'europe',
    active: true,
  },
  {
    id: 61,
    name: 'Ligue 1',
    arabicName: 'الدوري الفرنسي',
    slug: 'ligue-1',
    country: 'France',
    type: 'league',
    category: 'europe',
    active: true,
  },

  // ==========================================
  // Major Arab Leagues & Tournaments (الدوريات العربية)
  // ==========================================
  {
    id: 200,
    name: 'Botola Pro',
    arabicName: 'الدوري المغربي الاحترافي (البطولة إنوي)',
    slug: 'botola-pro',
    country: 'المغرب',
    type: 'league',
    category: 'arab',
    active: true,
  },
  {
    id: 307,
    name: 'Saudi Pro League',
    arabicName: 'دوري روشن السعودي',
    slug: 'saudi-pro-league',
    country: 'السعودية',
    type: 'league',
    category: 'arab',
    active: true,
  },
  {
    id: 233,
    name: 'Egyptian Premier League',
    arabicName: 'الدوري المصري الممتاز',
    slug: 'egyptian-premier-league',
    country: 'مصر',
    type: 'league',
    category: 'arab',
    active: true,
  },
  {
    id: 305,
    name: 'Qatar Stars League',
    arabicName: 'دوري نجوم قطر',
    slug: 'qatar-stars-league',
    country: 'قطر',
    type: 'league',
    category: 'arab',
    active: true,
  },
  {
    id: 301,
    name: 'UAE Pro League',
    arabicName: 'دوري أدنوك للمحترفين',
    slug: 'uae-pro-league',
    country: 'الإمارات',
    type: 'league',
    category: 'arab',
    active: true,
  },
  {
    id: 202,
    name: 'Tunisian Ligue 1',
    arabicName: 'الرابطة التونسية المحترفة الأولى',
    slug: 'tunisian-ligue-1',
    country: 'تونس',
    type: 'league',
    category: 'arab',
    active: true,
  },
  {
    id: 186,
    name: 'Algerian Ligue 1',
    arabicName: 'الرابطة الجزائرية المحترفة الأولى',
    slug: 'algerian-ligue-1',
    country: 'الجزائر',
    type: 'league',
    category: 'arab',
    active: true,
  },
  {
    id: 201,
    name: 'Moroccan Throne Cup',
    arabicName: 'كأس العرش المغربي',
    slug: 'throne-cup',
    country: 'المغرب',
    type: 'cup',
    category: 'arab',
    active: true,
  },
  {
    id: 308,
    name: 'King Cup',
    arabicName: 'كأس خادم الحرمين الشريفين',
    slug: 'kings-cup',
    country: 'السعودية',
    type: 'cup',
    category: 'arab',
    active: true,
  },

  // ==========================================
  // Continental & International Cups (البطولات القارية والدولية)
  // ==========================================
  {
    id: 2,
    name: 'UEFA Champions League',
    arabicName: 'دوري أبطال أوروبا',
    slug: 'champions-league',
    country: 'Europe',
    type: 'cup',
    category: 'continental',
    active: true,
  },
  {
    id: 3,
    name: 'UEFA Europa League',
    arabicName: 'الدوري الأوروبي',
    slug: 'europa-league',
    country: 'Europe',
    type: 'cup',
    category: 'continental',
    active: true,
  },
  {
    id: 12,
    name: 'CAF Champions League',
    arabicName: 'دوري أبطال إفريقيا',
    slug: 'caf-champions-league',
    country: 'Africa',
    type: 'cup',
    category: 'continental',
    active: true,
  },
  {
    id: 20,
    name: 'CAF Confederation Cup',
    arabicName: 'كأس الكونفيدرالية الإفريقية',
    slug: 'caf-confederation-cup',
    country: 'Africa',
    type: 'cup',
    category: 'continental',
    active: true,
  },
  {
    id: 17,
    name: 'AFC Champions League Elite',
    arabicName: 'دوري أبطال آسيا للنخبة',
    slug: 'afc-champions-league-elite',
    country: 'Asia',
    type: 'cup',
    category: 'continental',
    active: true,
  },
  {
    id: 7,
    name: 'UEFA Nations League',
    arabicName: 'دوري الأمم الأوروبية',
    slug: 'uefa-nations-league',
    country: 'Europe',
    type: 'international',
    category: 'continental',
    active: true,
  },
  {
    id: 1,
    name: 'FIFA World Cup',
    arabicName: 'كأس العالم',
    slug: 'world-cup',
    country: 'World',
    type: 'international',
    category: 'continental',
    active: true,
  },
  {
    id: 6,
    name: 'Africa Cup of Nations',
    arabicName: 'كأس أمم إفريقيا',
    slug: 'africa-cup-of-nations',
    country: 'Africa',
    type: 'international',
    category: 'continental',
    active: true,
  },
  {
    id: 4,
    name: 'UEFA Euro',
    arabicName: 'كأس أمم أوروبا',
    slug: 'uefa-euro',
    country: 'Europe',
    type: 'international',
    category: 'continental',
    active: true,
  },
];

export const ACTIVE_COMPETITION_IDS = new Set(
  SUPPORTED_COMPETITIONS.filter((c) => c.active).map((c) => c.id)
);
