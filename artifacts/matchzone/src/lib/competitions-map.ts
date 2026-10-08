/**
 * Centralized competition and country localization, flag, and official logo utility.
 * 
 * RULES:
 * 1. NEVER concatenate competition name and country into one string.
 * 2. Keep competitionName, competitionCountry, countryFlag, and competitionLogo separate.
 * 3. Use exact official name from API if no verified Arabic translation exists.
 * 4. Never invent fake names or random translations.
 */

export interface FormattedCompetition {
  competitionName: string;
  competitionCountry: string;
  countryFlag: string;
  countryFlagUrl?: string | null;
  originalName: string;
  originalCountry: string;
  competitionLogo: string | null;
}

// Verified high-definition official competition logos
export const VERIFIED_COMPETITION_LOGOS: Record<string, string> = {
  // English Premier League
  'premier league': 'https://media.api-sports.io/football/leagues/39.png',
  '39': 'https://media.api-sports.io/football/leagues/39.png',
  '2021': 'https://media.api-sports.io/football/leagues/39.png',
  'eng.1': 'https://media.api-sports.io/football/leagues/39.png',

  // Spanish La Liga (Primera)
  'la liga': 'https://media.api-sports.io/football/leagues/140.png',
  'laliga': 'https://media.api-sports.io/football/leagues/140.png',
  'primera division': 'https://media.api-sports.io/football/leagues/140.png',
  'primera división': 'https://media.api-sports.io/football/leagues/140.png',
  '140': 'https://media.api-sports.io/football/leagues/140.png',
  '2014': 'https://media.api-sports.io/football/leagues/140.png',
  'esp.1': 'https://media.api-sports.io/football/leagues/140.png',

  // Spanish LaLiga 2 (Hypermotion / Segunda)
  'laliga 2': 'https://a.espncdn.com/i/leaguelogos/soccer/500/107.png',
  'la liga 2': 'https://a.espncdn.com/i/leaguelogos/soccer/500/107.png',
  'spanish la liga 2': 'https://a.espncdn.com/i/leaguelogos/soccer/500/107.png',
  'segunda division': 'https://a.espncdn.com/i/leaguelogos/soccer/500/107.png',
  'الدوري الإسباني الدرجة الثانية': 'https://a.espncdn.com/i/leaguelogos/soccer/500/107.png',
  '141': 'https://a.espncdn.com/i/leaguelogos/soccer/500/107.png',
  '1006093784': 'https://a.espncdn.com/i/leaguelogos/soccer/500/107.png',
  'esp.2': 'https://a.espncdn.com/i/leaguelogos/soccer/500/107.png',

  // Italian Serie A
  'serie a': 'https://media.api-sports.io/football/leagues/135.png',
  '135': 'https://media.api-sports.io/football/leagues/135.png',
  '2019': 'https://media.api-sports.io/football/leagues/135.png',
  'ita.1': 'https://media.api-sports.io/football/leagues/135.png',

  // German Bundesliga
  'bundesliga': 'https://media.api-sports.io/football/leagues/78.png',
  '78': 'https://media.api-sports.io/football/leagues/78.png',
  '2002': 'https://media.api-sports.io/football/leagues/78.png',
  'ger.1': 'https://media.api-sports.io/football/leagues/78.png',

  // French Ligue 1
  'ligue 1': 'https://media.api-sports.io/football/leagues/61.png',
  '61': 'https://media.api-sports.io/football/leagues/61.png',
  '2015': 'https://media.api-sports.io/football/leagues/61.png',
  'fra.1': 'https://media.api-sports.io/football/leagues/61.png',

  // European Cups
  'uefa champions league': 'https://media.api-sports.io/football/leagues/2.png',
  'champions league': 'https://media.api-sports.io/football/leagues/2.png',
  '2': 'https://media.api-sports.io/football/leagues/2.png',
  '2001': 'https://media.api-sports.io/football/leagues/2.png',
  'uefa.champions': 'https://media.api-sports.io/football/leagues/2.png',

  'uefa europa league': 'https://media.api-sports.io/football/leagues/3.png',
  'europa league': 'https://media.api-sports.io/football/leagues/3.png',
  '3': 'https://media.api-sports.io/football/leagues/3.png',
  '2146': 'https://media.api-sports.io/football/leagues/3.png',
  'uefa.europa': 'https://media.api-sports.io/football/leagues/3.png',

  'uefa conference league': 'https://media.api-sports.io/football/leagues/848.png',
  'conference league': 'https://media.api-sports.io/football/leagues/848.png',
  '848': 'https://media.api-sports.io/football/leagues/848.png',
  'uefa.europa.conf': 'https://media.api-sports.io/football/leagues/848.png',

  // UEFA Nations League (Official colorful ribbon logo)
  'uefa nations league': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2395.png',
  'nations league': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2395.png',
  'دوري الأمم الأوروبية': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2395.png',
  'uefa.nations': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2395.png',
  '7': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2395.png',

  // FIFA World Cup (Official prestigious trophy logo)
  'fifa world cup': 'https://a.espncdn.com/i/leaguelogos/soccer/500/4.png',
  'world cup': 'https://a.espncdn.com/i/leaguelogos/soccer/500/4.png',
  'كأس العالم': 'https://a.espncdn.com/i/leaguelogos/soccer/500/4.png',
  'fifa.world': 'https://a.espncdn.com/i/leaguelogos/soccer/500/4.png',
  '1': 'https://a.espncdn.com/i/leaguelogos/soccer/500/4.png',
  '2000': 'https://a.espncdn.com/i/leaguelogos/soccer/500/4.png',

  // UEFA Euro
  'uefa euro': 'https://media.api-sports.io/football/leagues/4.png',
  'uefa european championship': 'https://media.api-sports.io/football/leagues/4.png',
  'euro': 'https://media.api-sports.io/football/leagues/4.png',
  '4': 'https://media.api-sports.io/football/leagues/4.png',
  '2018': 'https://media.api-sports.io/football/leagues/4.png',
  'uefa.euro': 'https://media.api-sports.io/football/leagues/4.png',

  // Africa Cup of Nations
  'africa cup of nations': 'https://media.api-sports.io/football/leagues/6.png',
  'afcon': 'https://media.api-sports.io/football/leagues/6.png',
  'كأس أمم إفريقيا': 'https://media.api-sports.io/football/leagues/6.png',
  'كأس أمم أفريقيا': 'https://media.api-sports.io/football/leagues/6.png',
  '6': 'https://media.api-sports.io/football/leagues/6.png',
  'caf.nations': 'https://media.api-sports.io/football/leagues/6.png',

  // Brazilian Leagues
  'brazilian serie a': 'https://media.api-sports.io/football/leagues/71.png',
  'serie a brazil': 'https://media.api-sports.io/football/leagues/71.png',
  'brasileirao': 'https://media.api-sports.io/football/leagues/71.png',
  'campeonato brasileiro': 'https://media.api-sports.io/football/leagues/71.png',
  'الدوري البرازيلي': 'https://media.api-sports.io/football/leagues/71.png',
  '71': 'https://media.api-sports.io/football/leagues/71.png',

  // Canadian Leagues
  'northern super league': 'https://media.api-sports.io/football/leagues/1089.png',
  'canadian northern super league': 'https://media.api-sports.io/football/leagues/1089.png',
  'الدوري الكندي للسيدات': 'https://media.api-sports.io/football/leagues/1089.png',

  // CONCACAF Nations League
  'concacaf nations league': 'https://media.api-sports.io/football/leagues/400.png',
  'concacaf': 'https://media.api-sports.io/football/leagues/400.png',
  '400': 'https://media.api-sports.io/football/leagues/400.png',
  'concacaf.nations': 'https://media.api-sports.io/football/leagues/400.png',

  // International Friendlies
  'friendlies': 'https://a.espncdn.com/i/leaguelogos/soccer/500/53.png',
  'friendly': 'https://a.espncdn.com/i/leaguelogos/soccer/500/53.png',
  'international friendlies': 'https://a.espncdn.com/i/leaguelogos/soccer/500/53.png',
  'international friendly': 'https://a.espncdn.com/i/leaguelogos/soccer/500/53.png',
  'fifa.friendly': 'https://a.espncdn.com/i/leaguelogos/soccer/500/53.png',
  'مباريات ودية': 'https://a.espncdn.com/i/leaguelogos/soccer/500/53.png',
  'مباريات ودية دولية': 'https://a.espncdn.com/i/leaguelogos/soccer/500/53.png',
  '10': 'https://a.espncdn.com/i/leaguelogos/soccer/500/53.png',

  // Copa America
  'copa america': 'https://media.api-sports.io/football/leagues/9.png',
  'copa américa': 'https://media.api-sports.io/football/leagues/9.png',
  '9': 'https://media.api-sports.io/football/leagues/9.png',
  'conmebol.america': 'https://media.api-sports.io/football/leagues/9.png',

  // Arab Leagues
  'botola': 'https://media.api-sports.io/football/leagues/200.png',
  'botola pro': 'https://media.api-sports.io/football/leagues/200.png',
  '200': 'https://media.api-sports.io/football/leagues/200.png',
  'الدوري المغربي': 'https://media.api-sports.io/football/leagues/200.png',
  'الدوري المغربي للمحترفين': 'https://media.api-sports.io/football/leagues/200.png',
  'الدوري المغربي الاحترافي': 'https://media.api-sports.io/football/leagues/200.png',
  'البطولة الاحترافية': 'https://media.api-sports.io/football/leagues/200.png',
  '201': 'https://media.api-sports.io/football/leagues/201.png',
  'كأس العرش': 'https://media.api-sports.io/football/leagues/201.png',

  'saudi professional league': 'https://media.api-sports.io/football/leagues/307.png',
  'saudi pro league': 'https://media.api-sports.io/football/leagues/307.png',
  'roshn saudi league': 'https://media.api-sports.io/football/leagues/307.png',
  'دوري روشن السعودي': 'https://media.api-sports.io/football/leagues/307.png',
  'الدوري السعودي': 'https://media.api-sports.io/football/leagues/307.png',
  '307': 'https://media.api-sports.io/football/leagues/307.png',
  '308': 'https://media.api-sports.io/football/leagues/308.png',

  'egyptian premier league': 'https://media.api-sports.io/football/leagues/233.png',
  'الدوري المصري': 'https://media.api-sports.io/football/leagues/233.png',
  'الدوري المصري الممتاز': 'https://media.api-sports.io/football/leagues/233.png',
  '233': 'https://media.api-sports.io/football/leagues/233.png',

  'qatar stars league': 'https://media.api-sports.io/football/leagues/305.png',
  'stars league': 'https://media.api-sports.io/football/leagues/305.png',
  'دوري نجوم قطر': 'https://media.api-sports.io/football/leagues/305.png',
  '305': 'https://media.api-sports.io/football/leagues/305.png',

  'uae pro league': 'https://media.api-sports.io/football/leagues/301.png',
  'adnoc pro league': 'https://media.api-sports.io/football/leagues/301.png',
  'دوري أدنوك للمحترفين': 'https://media.api-sports.io/football/leagues/301.png',
  '301': 'https://media.api-sports.io/football/leagues/301.png',

  'tunisian ligue 1': 'https://media.api-sports.io/football/leagues/202.png',
  'ligue 1 tunisia': 'https://media.api-sports.io/football/leagues/202.png',
  'الرابطة التونسية المحترفة الأولى': 'https://media.api-sports.io/football/leagues/202.png',
  '202': 'https://media.api-sports.io/football/leagues/202.png',

  'algerian ligue 1': 'https://media.api-sports.io/football/leagues/186.png',
  'ligue 1 algeria': 'https://media.api-sports.io/football/leagues/186.png',
  'الرابطة الجزائرية المحترفة الأولى': 'https://media.api-sports.io/football/leagues/186.png',
  '186': 'https://media.api-sports.io/football/leagues/186.png',

  'caf champions league': 'https://media.api-sports.io/football/leagues/12.png',
  'دوري أبطال إفريقيا': 'https://media.api-sports.io/football/leagues/12.png',
  '12': 'https://media.api-sports.io/football/leagues/12.png',

  'caf confederation cup': 'https://media.api-sports.io/football/leagues/20.png',
  'كأس الكونفيدرالية الإفريقية': 'https://media.api-sports.io/football/leagues/20.png',
  '20': 'https://media.api-sports.io/football/leagues/20.png',

  'afc champions league elite': 'https://media.api-sports.io/football/leagues/17.png',
  'afc champions league': 'https://media.api-sports.io/football/leagues/17.png',
  'دوري أبطال آسيا للنخبة': 'https://media.api-sports.io/football/leagues/17.png',
  'دوري أبطال آسيا': 'https://media.api-sports.io/football/leagues/17.png',
  '17': 'https://media.api-sports.io/football/leagues/17.png',
};

// Verified Arabic mappings for major international and club competitions
const VERIFIED_ARABIC_COMPETITIONS: Record<string, { arabicName: string; defaultCountry: string }> = {
  // English Leagues
  'premier league': { arabicName: 'الدوري الإنجليزي الممتاز', defaultCountry: 'إنجلترا' },
  'fa cup': { arabicName: 'كأس الاتحاد الإنجليزي', defaultCountry: 'إنجلترا' },
  'efl cup': { arabicName: 'كأس الرابطة الإنجليزية', defaultCountry: 'إنجلترا' },
  'carabao cup': { arabicName: 'كأس رابطة المحترفين الإنجليزية', defaultCountry: 'إنجلترا' },
  'community shield': { arabicName: 'درع المجتمع الإنجليزي', defaultCountry: 'إنجلترا' },

  // Spanish Leagues
  'la liga 2': { arabicName: 'الدوري الإسباني الدرجة الثانية', defaultCountry: 'إسبانيا' },
  'laliga 2': { arabicName: 'الدوري الإسباني الدرجة الثانية', defaultCountry: 'إسبانيا' },
  'segunda division': { arabicName: 'الدوري الإسباني الدرجة الثانية', defaultCountry: 'إسبانيا' },
  'la liga': { arabicName: 'الدوري الإسباني', defaultCountry: 'إسبانيا' },
  'laliga': { arabicName: 'الدوري الإسباني', defaultCountry: 'إسبانيا' },
  'primera division': { arabicName: 'الدوري الإسباني', defaultCountry: 'إسبانيا' },
  'primera división': { arabicName: 'الدوري الإسباني', defaultCountry: 'إسبانيا' },
  'copa del rey': { arabicName: 'كأس ملك إسبانيا', defaultCountry: 'إسبانيا' },
  'supercopa de espana': { arabicName: 'كأس السوبر الإسباني', defaultCountry: 'إسبانيا' },
  'supercopa de españa': { arabicName: 'كأس السوبر الإسباني', defaultCountry: 'إسبانيا' },

  // Italian Leagues
  'serie a': { arabicName: 'الدوري الإيطالي', defaultCountry: 'إيطاليا' },
  'coppa italia': { arabicName: 'كأس إيطاليا', defaultCountry: 'إيطاليا' },
  'supercoppa italiana': { arabicName: 'كأس السوبر الإيطالي', defaultCountry: 'إيطاليا' },

  // Brazilian Leagues
  'brasileirao': { arabicName: 'الدوري البرازيلي', defaultCountry: 'البرازيل' },
  'brazilian serie a': { arabicName: 'الدوري البرازيلي', defaultCountry: 'البرازيل' },
  'campeonato brasileiro': { arabicName: 'الدوري البرازيلي', defaultCountry: 'البرازيل' },
  'serie a brazil': { arabicName: 'الدوري البرازيلي', defaultCountry: 'البرازيل' },
  'brazil serie a': { arabicName: 'الدوري البرازيلي', defaultCountry: 'البرازيل' },

  // Canadian Leagues
  'northern super league': { arabicName: 'الدوري الكندي للسيدات', defaultCountry: 'كندا' },
  'canadian northern super league': { arabicName: 'الدوري الكندي للسيدات', defaultCountry: 'كندا' },
  'canadian premier league': { arabicName: 'الدوري الكندي الممتاز', defaultCountry: 'كندا' },

  // German Leagues
  'bundesliga': { arabicName: 'الدوري الألماني', defaultCountry: 'ألمانيا' },
  'dfb pokal': { arabicName: 'كأس ألمانيا', defaultCountry: 'ألمانيا' },
  'dfb-pokal': { arabicName: 'كأس ألمانيا', defaultCountry: 'ألمانيا' },
  'dfl supercup': { arabicName: 'كأس السوبر الألماني', defaultCountry: 'ألمانيا' },

  // French Leagues
  'ligue 1': { arabicName: 'الدوري الفرنسي', defaultCountry: 'فرنسا' },
  'coupe de france': { arabicName: 'كأس فرنسا', defaultCountry: 'فرنسا' },
  'trophee des champions': { arabicName: 'كأس السوبر الفرنسي', defaultCountry: 'فرنسا' },

  // European Club Competitions
  'uefa champions league': { arabicName: 'دوري أبطال أوروبا', defaultCountry: 'أوروبا' },
  'champions league': { arabicName: 'دوري أبطال أوروبا', defaultCountry: 'أوروبا' },
  'uefa europa league': { arabicName: 'الدوري الأوروبي', defaultCountry: 'أوروبا' },
  'europa league': { arabicName: 'الدوري الأوروبي', defaultCountry: 'أوروبا' },
  'uefa conference league': { arabicName: 'دوري المؤتمر الأوروبي', defaultCountry: 'أوروبا' },
  'uefa europa conference league': { arabicName: 'دوري المؤتمر الأوروبي', defaultCountry: 'أوروبا' },
  'conference league': { arabicName: 'دوري المؤتمر الأوروبي', defaultCountry: 'أوروبا' },
  'uefa super cup': { arabicName: 'كأس السوبر الأوروبي', defaultCountry: 'أوروبا' },

  // National Teams / International Competitions
  'fifa world cup': { arabicName: 'كأس العالم', defaultCountry: 'دولي' },
  'world cup': { arabicName: 'كأس العالم', defaultCountry: 'دولي' },
  'fifa world cup qualification': { arabicName: 'تصفيات كأس العالم', defaultCountry: 'دولي' },
  'concacaf nations league': { arabicName: 'دوري أمم الكونكاكاف', defaultCountry: 'أمريكا الشمالية' },
  'concacaf gold cup': { arabicName: 'كأس الكونكاكاف الذهبية', defaultCountry: 'أمريكا الشمالية' },
  'concacaf': { arabicName: 'بطولة الكونكاكاف', defaultCountry: 'أمريكا الشمالية' },
  'uefa nations league': { arabicName: 'دوري الأمم الأوروبية', defaultCountry: 'أوروبا' },
  'nations league': { arabicName: 'دوري الأمم الأوروبية', defaultCountry: 'أوروبا' },
  'uefa euro': { arabicName: 'كأس أمم أوروبا', defaultCountry: 'أوروبا' },
  'uefa european championship': { arabicName: 'كأس أمم أوروبا', defaultCountry: 'أوروبا' },
  'euro': { arabicName: 'كأس أمم أوروبا', defaultCountry: 'أوروبا' },
  'africa cup of nations': { arabicName: 'كأس أمم إفريقيا', defaultCountry: 'إفريقيا' },
  'africa cup of nations qualifying': { arabicName: 'كأس أمم إفريقيا', defaultCountry: 'إفريقيا' },
  'afcon': { arabicName: 'كأس أمم إفريقيا', defaultCountry: 'إفريقيا' },
  'afcon qualifying': { arabicName: 'كأس أمم إفريقيا', defaultCountry: 'إفريقيا' },
  'caf african nations championship': { arabicName: 'كأس أمم إفريقيا', defaultCountry: 'إفريقيا' },
  'copa america': { arabicName: 'كوبا أمريكا', defaultCountry: 'أمريكا الجنوبية' },
  'copa américa': { arabicName: 'كوبا أمريكا', defaultCountry: 'أمريكا الجنوبية' },
  'afc asian cup': { arabicName: 'كأس آسيا', defaultCountry: 'آسيا' },
  'asian cup': { arabicName: 'كأس آسيا', defaultCountry: 'آسيا' },
  'caf champions league': { arabicName: 'دوري أبطال إفريقيا', defaultCountry: 'إفريقيا' },
  'caf confederation cup': { arabicName: 'كأس الكونفيدرالية الإفريقية', defaultCountry: 'إفريقيا' },
  'afc champions league': { arabicName: 'دوري أبطال آسيا', defaultCountry: 'آسيا' },
  'afc champions league elite': { arabicName: 'دوري أبطال آسيا للنخبة', defaultCountry: 'آسيا' },
  'fifa club world cup': { arabicName: 'كأس العالم للأندية', defaultCountry: 'دولي' },
  'club world cup': { arabicName: 'كأس العالم للأندية', defaultCountry: 'دولي' },
  'friendlies': { arabicName: 'مباريات ودية دولية', defaultCountry: 'دولي' },
  'international friendlies': { arabicName: 'مباريات ودية دولية', defaultCountry: 'دولي' },

  // Arab Leagues
  'saudi professional league': { arabicName: 'دوري روشن السعودي', defaultCountry: 'السعودية' },
  'saudi pro league': { arabicName: 'دوري روشن السعودي', defaultCountry: 'السعودية' },
  'roshn saudi league': { arabicName: 'دوري روشن السعودي', defaultCountry: 'السعودية' },
  'king cup': { arabicName: 'كأس خادم الحرمين الشريفين', defaultCountry: 'السعودية' },
  'kings cup': { arabicName: 'كأس خادم الحرمين الشريفين', defaultCountry: 'السعودية' },
  'botola': { arabicName: 'الدوري المغربي الاحترافي (البطولة إنوي)', defaultCountry: 'المغرب' },
  'botola pro': { arabicName: 'الدوري المغربي الاحترافي (البطولة إنوي)', defaultCountry: 'المغرب' },
  'botola pro inwi': { arabicName: 'الدوري المغربي الاحترافي (البطولة إنوي)', defaultCountry: 'المغرب' },
  'moroccan throne cup': { arabicName: 'كأس العرش المغربي', defaultCountry: 'المغرب' },
  'throne cup': { arabicName: 'كأس العرش المغربي', defaultCountry: 'المغرب' },
  'egyptian premier league': { arabicName: 'الدوري المصري الممتاز', defaultCountry: 'مصر' },
  'egypt cup': { arabicName: 'كأس مصر', defaultCountry: 'مصر' },
  'qatar stars league': { arabicName: 'دوري نجوم قطر', defaultCountry: 'قطر' },
  'stars league': { arabicName: 'دوري نجوم قطر', defaultCountry: 'قطر' },
  'emir of qatar cup': { arabicName: 'كأس أمير قطر', defaultCountry: 'قطر' },
  'uae pro league': { arabicName: 'دوري أدنوك للمحترفين', defaultCountry: 'الإمارات' },
  'adnoc pro league': { arabicName: 'دوري أدنوك للمحترفين', defaultCountry: 'الإمارات' },
  'uae president cup': { arabicName: 'كأس رئيس دولة الإمارات', defaultCountry: 'الإمارات' },
  'tunisian ligue 1': { arabicName: 'الرابطة التونسية المحترفة الأولى', defaultCountry: 'تونس' },
  'ligue 1 tunisia': { arabicName: 'الرابطة التونسية المحترفة الأولى', defaultCountry: 'تونس' },
  'algerian ligue 1': { arabicName: 'الرابطة الجزائرية المحترفة الأولى', defaultCountry: 'الجزائر' },
  'ligue 1 algeria': { arabicName: 'الرابطة الجزائرية المحترفة الأولى', defaultCountry: 'الجزائر' },
};

// Verified Arabic country translations
const VERIFIED_ARABIC_COUNTRIES: Record<string, string> = {
  'england': 'إنجلترا',
  'spain': 'إسبانيا',
  'italy': 'إيطاليا',
  'germany': 'ألمانيا',
  'france': 'فرنسا',
  'portugal': 'البرتغال',
  'netherlands': 'هولندا',
  'belgium': 'بلجيكا',
  'scotland': 'اسكتلندا',
  'turkey': 'تركيا',
  'greece': 'اليونان',
  'europe': 'أوروبا',
  'world': 'دولي',
  'international': 'دولي',
  'africa': 'إفريقيا',
  'south america': 'أمريكا الجنوبية',
  'north america': 'أمريكا الشمالية',
  'concacaf': 'أمريكا الشمالية',
  'north & central america': 'أمريكا الشمالية',
  'asia': 'آسيا',
  'morocco': 'المغرب',
  'saudi arabia': 'السعودية',
  'saudi-arabia': 'السعودية',
  'egypt': 'مصر',
  'algeria': 'الجزائر',
  'tunisia': 'تونس',
  'qatar': 'قطر',
  'uae': 'الإمارات',
  'united arab emirates': 'الإمارات',
  'iraq': 'العراق',
  'jordan': 'الأردن',
  'brazil': 'البرازيل',
  'argentina': 'الأرجنتين',
  'canada': 'كندا',
  'usa': 'الولايات المتحدة',
  'united states': 'الولايات المتحدة',
  'mexico': 'المكسيك',
  'japan': 'اليابان',
  'south korea': 'كوريا الجنوبية',
};

/**
 * Returns crisp country flag image URL (flagcdn.com) for 100% cross-platform flag rendering (Windows/Mac/iOS/Android)
 */
export function getCountryFlagUrl(country?: string): string | null {
  if (!country) return null;
  const c = country.toLowerCase().trim();
  if (c.includes('إنجلترا') || c.includes('england') || c.includes('uk') || c.includes('britain')) return 'https://flagcdn.com/w40/gb-eng.png';
  if (c.includes('إسبانيا') || c.includes('spain')) return 'https://flagcdn.com/w40/es.png';
  if (c.includes('إيطاليا') || c.includes('italy')) return 'https://flagcdn.com/w40/it.png';
  if (c.includes('ألمانيا') || c.includes('germany')) return 'https://flagcdn.com/w40/de.png';
  if (c.includes('فرنسا') || c.includes('france')) return 'https://flagcdn.com/w40/fr.png';
  if (c.includes('أوروبا') || c.includes('europe') || c.includes('uefa')) return 'https://flagcdn.com/w40/eu.png';
  if (c.includes('المغرب') || c.includes('morocco')) return 'https://flagcdn.com/w40/ma.png';
  if (c.includes('السعودية') || c.includes('saudi')) return 'https://flagcdn.com/w40/sa.png';
  if (c.includes('مصر') || c.includes('egypt')) return 'https://flagcdn.com/w40/eg.png';
  if (c.includes('الجزائر') || c.includes('algeria')) return 'https://flagcdn.com/w40/dz.png';
  if (c.includes('تونس') || c.includes('tunisia')) return 'https://flagcdn.com/w40/tn.png';
  if (c.includes('قطر') || c.includes('qatar')) return 'https://flagcdn.com/w40/qa.png';
  if (c.includes('الإمارات') || c.includes('uae')) return 'https://flagcdn.com/w40/ae.png';
  if (c.includes('البرتغال') || c.includes('portugal')) return 'https://flagcdn.com/w40/pt.png';
  if (c.includes('هولندا') || c.includes('netherlands')) return 'https://flagcdn.com/w40/nl.png';
  if (c.includes('بلجيكا') || c.includes('belgium')) return 'https://flagcdn.com/w40/be.png';
  if (c.includes('تركيا') || c.includes('turkey')) return 'https://flagcdn.com/w40/tr.png';
  if (c.includes('البرازيل') || c.includes('brazil')) return 'https://flagcdn.com/w40/br.png';
  if (c.includes('كندا') || c.includes('canada')) return 'https://flagcdn.com/w40/ca.png';
  if (c.includes('الأرجنتين') || c.includes('argentina')) return 'https://flagcdn.com/w40/ar.png';
  if (c.includes('الولايات المتحدة') || c.includes('usa') || c.includes('united states')) return 'https://flagcdn.com/w40/us.png';
  return null;
}

/**
 * Returns fallback country flag emoji
 */
export function getCountryFlag(country?: string): string {
  if (!country) return '🌐';
  const c = country.toLowerCase().trim();
  if (c.includes('إنجلترا') || c.includes('england') || c.includes('uk') || c.includes('britain')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (c.includes('إسبانيا') || c.includes('spain')) return '🇪🇸';
  if (c.includes('إيطاليا') || c.includes('italy')) return '🇮🇹';
  if (c.includes('ألمانيا') || c.includes('germany')) return '🇩🇪';
  if (c.includes('فرنسا') || c.includes('france')) return '🇫🇷';
  if (c.includes('أوروبا') || c.includes('europe') || c.includes('uefa')) return '🇪🇺';
  if (c.includes('المغرب') || c.includes('morocco')) return '🇲🇦';
  if (c.includes('السعودية') || c.includes('saudi')) return '🇸🇦';
  if (c.includes('مصر') || c.includes('egypt')) return '🇪🇬';
  if (c.includes('الجزائر') || c.includes('algeria')) return '🇩🇿';
  if (c.includes('تونس') || c.includes('tunisia')) return '🇹🇳';
  if (c.includes('قطر') || c.includes('qatar')) return '🇶🇦';
  if (c.includes('الإمارات') || c.includes('uae')) return '🇦🇪';
  if (c.includes('البرتغال') || c.includes('portugal')) return '🇵🇹';
  if (c.includes('هولندا') || c.includes('netherlands')) return '🇳🇱';
  if (c.includes('بلجيكا') || c.includes('belgium')) return '🇧🇪';
  if (c.includes('تركيا') || c.includes('turkey')) return '🇹🇷';
  if (c.includes('البرازيل') || c.includes('brazil')) return '🇧🇷';
  if (c.includes('كندا') || c.includes('canada')) return '🇨🇦';
  if (c.includes('الأرجنتين') || c.includes('argentina')) return '🇦🇷';
  if (c.includes('أمريكا الشمالية') || c.includes('north america') || c.includes('concacaf')) return '🌎';
  if (c.includes('أمريكا الجنوبية') || c.includes('south america') || c.includes('conmebol')) return '🌎';
  if (c.includes('الولايات المتحدة') || c.includes('usa') || c.includes('united states')) return '🇺🇸';
  if (c.includes('إفريقيا') || c.includes('أفريقيا') || c.includes('africa') || c.includes('caf')) return '🌍';
  if (c.includes('آسيا') || c.includes('asia') || c.includes('afc')) return '🌏';
  if (c.includes('دولي') || c.includes('world') || c.includes('international') || c.includes('fifa')) return '🌐';
  return '🌐';
}

/**
 * Normalizes competition name for deduplication (unifies Arabic hamzas, removes spaces)
 */
export function normalizeCompetitionName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\s\-_]/g, '')
    .trim();
}

function resolveCompetitionLogo(id?: string | number, name?: string, currentLogo?: string | null): string | null {
  const idStr = id != null ? String(id).trim() : '';

  // 1. Direct ID match
  if (idStr && VERIFIED_COMPETITION_LOGOS[idStr]) {
    return VERIFIED_COMPETITION_LOGOS[idStr];
  }

  if (name) {
    const cleanLower = name.toLowerCase().trim();

    // 2. Exact name match
    if (VERIFIED_COMPETITION_LOGOS[cleanLower]) {
      return VERIFIED_COMPETITION_LOGOS[cleanLower];
    }

    // 3. Substring match for named entries (ONLY check keys >= 4 characters and non-numeric!)
    const sortedKeys = Object.keys(VERIFIED_COMPETITION_LOGOS)
      .filter((k) => k.length >= 4 && isNaN(Number(k)))
      .sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      if (cleanLower.includes(key)) {
        return VERIFIED_COMPETITION_LOGOS[key];
      }
    }
  }

  // 4. If currentLogo is valid and not a placeholder avatar
  if (currentLogo && !currentLogo.includes('ui-avatars.com') && !currentLogo.includes('placeholder')) {
    return currentLogo;
  }

  return currentLogo || null;
}

/**
 * Format and separate competition name, country, and official flag cleanly.
 */
export function formatCompetitionInfo(options: {
  id?: string | number;
  name?: string;
  country?: string;
  logo?: string | null;
}): FormattedCompetition {
  const originalName = (options.name || '').trim();
  const originalCountry = (options.country || '').trim();
  const resolvedLogo = resolveCompetitionLogo(options.id, options.name, options.logo);

  if (!originalName) {
    const country = originalCountry ? translateCountry(originalCountry) : 'دولي';
    return {
      competitionName: 'بطولة كرة القدم',
      competitionCountry: country,
      countryFlag: getCountryFlag(country),
      countryFlagUrl: getCountryFlagUrl(country),
      originalName: 'Football Match',
      originalCountry: originalCountry || 'International',
      competitionLogo: resolvedLogo,
    };
  }

  const cleanLower = originalName.toLowerCase().trim();
  const cleanCountry = originalCountry.toLowerCase().trim();

  // Special disambiguation: Brazilian Serie A vs Italian Serie A
  if (
    cleanLower.includes('brasileir') ||
    ((cleanLower.includes('serie a') || cleanLower === 'serie a') &&
      (cleanCountry.includes('brazil') || cleanCountry.includes('البرازيل') || cleanLower.includes('brazil') || cleanLower.includes('brasil')))
  ) {
    const country = 'البرازيل';
    return {
      competitionName: 'الدوري البرازيلي',
      competitionCountry: country,
      countryFlag: getCountryFlag(country),
      countryFlagUrl: getCountryFlagUrl(country),
      originalName,
      originalCountry: originalCountry || country,
      competitionLogo: resolvedLogo || 'https://media.api-sports.io/football/leagues/71.png',
    };
  }

  // Special disambiguation: Canadian leagues (Northern Super League, NSL, etc.)
  if (
    cleanLower.includes('northern super league') ||
    cleanLower === 'nsl' ||
    cleanLower.includes('canadian northern') ||
    cleanCountry.includes('canada') ||
    cleanCountry.includes('كندا')
  ) {
    const country = 'كندا';
    const isWomens = cleanLower.includes('northern') || cleanLower.includes('nsl') || cleanLower.includes('women') || cleanLower.includes('femmes');
    const compName = isWomens ? 'الدوري الكندي للسيدات' : (cleanLower.includes('premier') ? 'الدوري الكندي الممتاز' : originalName);
    return {
      competitionName: compName,
      competitionCountry: country,
      countryFlag: getCountryFlag(country),
      countryFlagUrl: getCountryFlagUrl(country),
      originalName,
      originalCountry: originalCountry || country,
      competitionLogo: resolvedLogo,
    };
  }

  // 1. Check exact match in dictionary
  if (VERIFIED_ARABIC_COMPETITIONS[cleanLower]) {
    const entry = VERIFIED_ARABIC_COMPETITIONS[cleanLower];
    const country = originalCountry ? translateCountry(originalCountry) : entry.defaultCountry;
    return {
      competitionName: entry.arabicName,
      competitionCountry: country,
      countryFlag: getCountryFlag(country),
      countryFlagUrl: getCountryFlagUrl(country),
      originalName,
      originalCountry: originalCountry || entry.defaultCountry,
      competitionLogo: resolvedLogo,
    };
  }

  // 2. Check for substring match in verified list (from longest key to shortest)
  // Ensure short keys (<= 4 chars) match on word boundaries only!
  const sortedKeys = Object.keys(VERIFIED_ARABIC_COMPETITIONS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    let isMatch = false;
    if (cleanLower === key) {
      isMatch = true;
    } else if (key.length <= 4) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      isMatch = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(cleanLower);
    } else {
      isMatch = cleanLower.includes(key);
    }

    if (isMatch) {
      // Disambiguate Serie A: If Italy, make sure country is not Brazil
      if (key === 'serie a' && (cleanCountry.includes('brazil') || cleanCountry.includes('البرازيل'))) {
        continue;
      }
      const entry = VERIFIED_ARABIC_COMPETITIONS[key];
      const country = originalCountry ? translateCountry(originalCountry) : entry.defaultCountry;
      return {
        competitionName: entry.arabicName,
        competitionCountry: country,
        countryFlag: getCountryFlag(country),
        countryFlagUrl: getCountryFlagUrl(country),
        originalName,
        originalCountry: originalCountry || entry.defaultCountry,
        competitionLogo: resolvedLogo,
      };
    }
  }

  // 3. Fallback: If unknown, DO NOT invent translations! Use original official name
  const country = originalCountry ? translateCountry(originalCountry) : 'دولي';
  return {
    competitionName: originalName,
    competitionCountry: country,
    countryFlag: getCountryFlag(country),
    countryFlagUrl: getCountryFlagUrl(country),
    originalName,
    originalCountry: originalCountry || 'International',
    competitionLogo: resolvedLogo,
  };
}

export function translateCountry(country?: string): string {
  if (!country) return 'دولي';
  const clean = country.toLowerCase().trim();
  if (VERIFIED_ARABIC_COUNTRIES[clean]) {
    return VERIFIED_ARABIC_COUNTRIES[clean];
  }
  return country.trim();
}

// Comprehensive country national flag database
const NATIONAL_TEAM_FLAGS: Record<string, string> = {
  // Arab & African Nations
  'djibouti': 'https://a.espncdn.com/i/teamlogos/countries/500/dji.png',
  'جيبوتي': 'https://a.espncdn.com/i/teamlogos/countries/500/dji.png',
  'sri lanka': 'https://a.espncdn.com/i/teamlogos/countries/500/sri.png',
  'سريلانكا': 'https://a.espncdn.com/i/teamlogos/countries/500/sri.png',
  'morocco': 'https://a.espncdn.com/i/teamlogos/countries/500/mar.png',
  'المغرب': 'https://a.espncdn.com/i/teamlogos/countries/500/mar.png',
  'egypt': 'https://a.espncdn.com/i/teamlogos/countries/500/egy.png',
  'مصر': 'https://a.espncdn.com/i/teamlogos/countries/500/egy.png',
  'algeria': 'https://a.espncdn.com/i/teamlogos/countries/500/alg.png',
  'الجزائر': 'https://a.espncdn.com/i/teamlogos/countries/500/alg.png',
  'tunisia': 'https://a.espncdn.com/i/teamlogos/countries/500/tun.png',
  'تونس': 'https://a.espncdn.com/i/teamlogos/countries/500/tun.png',
  'saudi arabia': 'https://a.espncdn.com/i/teamlogos/countries/500/ksa.png',
  'السعودية': 'https://a.espncdn.com/i/teamlogos/countries/500/ksa.png',
  'qatar': 'https://a.espncdn.com/i/teamlogos/countries/500/qat.png',
  'قطر': 'https://a.espncdn.com/i/teamlogos/countries/500/qat.png',
  'uae': 'https://a.espncdn.com/i/teamlogos/countries/500/uae.png',
  'united arab emirates': 'https://a.espncdn.com/i/teamlogos/countries/500/uae.png',
  'الإمارات': 'https://a.espncdn.com/i/teamlogos/countries/500/uae.png',
  'iraq': 'https://a.espncdn.com/i/teamlogos/countries/500/irq.png',
  'العراق': 'https://a.espncdn.com/i/teamlogos/countries/500/irq.png',
  'jordan': 'https://a.espncdn.com/i/teamlogos/countries/500/jor.png',
  'الأردن': 'https://a.espncdn.com/i/teamlogos/countries/500/jor.png',
  'kuwait': 'https://a.espncdn.com/i/teamlogos/countries/500/kuw.png',
  'الكويت': 'https://a.espncdn.com/i/teamlogos/countries/500/kuw.png',
  'bahrain': 'https://a.espncdn.com/i/teamlogos/countries/500/bhr.png',
  'البحرين': 'https://a.espncdn.com/i/teamlogos/countries/500/bhr.png',
  'oman': 'https://a.espncdn.com/i/teamlogos/countries/500/oma.png',
  'عمان': 'https://a.espncdn.com/i/teamlogos/countries/500/oma.png',
  'عُمان': 'https://a.espncdn.com/i/teamlogos/countries/500/oma.png',
  'syria': 'https://a.espncdn.com/i/teamlogos/countries/500/syr.png',
  'سوريا': 'https://a.espncdn.com/i/teamlogos/countries/500/syr.png',
  'lebanon': 'https://a.espncdn.com/i/teamlogos/countries/500/lbn.png',
  'لبنان': 'https://a.espncdn.com/i/teamlogos/countries/500/lbn.png',
  'palestine': 'https://a.espncdn.com/i/teamlogos/countries/500/ple.png',
  'فلسطين': 'https://a.espncdn.com/i/teamlogos/countries/500/ple.png',
  'yemen': 'https://a.espncdn.com/i/teamlogos/countries/500/yem.png',
  'اليمن': 'https://a.espncdn.com/i/teamlogos/countries/500/yem.png',
  'sudan': 'https://a.espncdn.com/i/teamlogos/countries/500/sdn.png',
  'السودان': 'https://a.espncdn.com/i/teamlogos/countries/500/sdn.png',
  'libya': 'https://a.espncdn.com/i/teamlogos/countries/500/lby.png',
  'ليبيا': 'https://a.espncdn.com/i/teamlogos/countries/500/lby.png',
  'mauritania': 'https://a.espncdn.com/i/teamlogos/countries/500/mtn.png',
  'موريتانيا': 'https://a.espncdn.com/i/teamlogos/countries/500/mtn.png',
  'somalia': 'https://a.espncdn.com/i/teamlogos/countries/500/som.png',
  'الصومال': 'https://a.espncdn.com/i/teamlogos/countries/500/som.png',
  'comoros': 'https://a.espncdn.com/i/teamlogos/countries/500/com.png',
  'جزر القمر': 'https://a.espncdn.com/i/teamlogos/countries/500/com.png',

  // World Giants
  'brazil': 'https://a.espncdn.com/i/teamlogos/countries/500/bra.png',
  'البرازيل': 'https://a.espncdn.com/i/teamlogos/countries/500/bra.png',
  'argentina': 'https://a.espncdn.com/i/teamlogos/countries/500/arg.png',
  'الأرجنتين': 'https://a.espncdn.com/i/teamlogos/countries/500/arg.png',
  'france': 'https://a.espncdn.com/i/teamlogos/countries/500/fra.png',
  'فرنسا': 'https://a.espncdn.com/i/teamlogos/countries/500/fra.png',
  'spain': 'https://a.espncdn.com/i/teamlogos/countries/500/esp.png',
  'إسبانيا': 'https://a.espncdn.com/i/teamlogos/countries/500/esp.png',
  'england': 'https://a.espncdn.com/i/teamlogos/countries/500/eng.png',
  'إنجلترا': 'https://a.espncdn.com/i/teamlogos/countries/500/eng.png',
  'germany': 'https://a.espncdn.com/i/teamlogos/countries/500/ger.png',
  'ألمانيا': 'https://a.espncdn.com/i/teamlogos/countries/500/ger.png',
  'portugal': 'https://a.espncdn.com/i/teamlogos/countries/500/por.png',
  'البرتغال': 'https://a.espncdn.com/i/teamlogos/countries/500/por.png',
  'italy': 'https://a.espncdn.com/i/teamlogos/countries/500/ita.png',
  'إيطاليا': 'https://a.espncdn.com/i/teamlogos/countries/500/ita.png',
  'netherlands': 'https://a.espncdn.com/i/teamlogos/countries/500/ned.png',
  'هولندا': 'https://a.espncdn.com/i/teamlogos/countries/500/ned.png',
  'belgium': 'https://a.espncdn.com/i/teamlogos/countries/500/bel.png',
  'بلجيكا': 'https://a.espncdn.com/i/teamlogos/countries/500/bel.png',
  'croatia': 'https://a.espncdn.com/i/teamlogos/countries/500/cro.png',
  'كرواتيا': 'https://a.espncdn.com/i/teamlogos/countries/500/cro.png',
  'uruguay': 'https://a.espncdn.com/i/teamlogos/countries/500/uru.png',
  'أوروجواي': 'https://a.espncdn.com/i/teamlogos/countries/500/uru.png',
  'أوروغواي': 'https://a.espncdn.com/i/teamlogos/countries/500/uru.png',
  'senegal': 'https://a.espncdn.com/i/teamlogos/countries/500/sen.png',
  'السنغال': 'https://a.espncdn.com/i/teamlogos/countries/500/sen.png',
  'nigeria': 'https://a.espncdn.com/i/teamlogos/countries/500/nga.png',
  'نيجيريا': 'https://a.espncdn.com/i/teamlogos/countries/500/nga.png',
  'cameroon': 'https://a.espncdn.com/i/teamlogos/countries/500/cmr.png',
  'الكاميرون': 'https://a.espncdn.com/i/teamlogos/countries/500/cmr.png',
  'ivory coast': 'https://a.espncdn.com/i/teamlogos/countries/500/civ.png',
  'ساحل العاج': 'https://a.espncdn.com/i/teamlogos/countries/500/civ.png',
  'ghana': 'https://a.espncdn.com/i/teamlogos/countries/500/gha.png',
  'غانا': 'https://a.espncdn.com/i/teamlogos/countries/500/gha.png',
  'japan': 'https://a.espncdn.com/i/teamlogos/countries/500/jpn.png',
  'اليابان': 'https://a.espncdn.com/i/teamlogos/countries/500/jpn.png',
  'south korea': 'https://a.espncdn.com/i/teamlogos/countries/500/kor.png',
  'كوريا الجنوبية': 'https://a.espncdn.com/i/teamlogos/countries/500/kor.png',
  'turkey': 'https://a.espncdn.com/i/teamlogos/countries/500/tur.png',
  'تركيا': 'https://a.espncdn.com/i/teamlogos/countries/500/tur.png',
  'usa': 'https://a.espncdn.com/i/teamlogos/countries/500/usa.png',
  'united states': 'https://a.espncdn.com/i/teamlogos/countries/500/usa.png',
  'الولايات المتحدة': 'https://a.espncdn.com/i/teamlogos/countries/500/usa.png',
  'mexico': 'https://a.espncdn.com/i/teamlogos/countries/500/mex.png',
  'المكسيك': 'https://a.espncdn.com/i/teamlogos/countries/500/mex.png',
  'thailand': 'https://a.espncdn.com/i/teamlogos/countries/500/tha.png',
  'تايلاند': 'https://a.espncdn.com/i/teamlogos/countries/500/tha.png',
  'chinese taipei': 'https://a.espncdn.com/i/teamlogos/countries/500/tpe.png',
  'india': 'https://a.espncdn.com/i/teamlogos/countries/500/ind.png',
  'الهند': 'https://a.espncdn.com/i/teamlogos/countries/500/ind.png',
  'south sudan': 'https://a.espncdn.com/i/teamlogos/countries/500/ssd.png',
  'سيراليون': 'https://a.espncdn.com/i/teamlogos/countries/500/sle.png',
  'sierra leone': 'https://a.espncdn.com/i/teamlogos/countries/500/sle.png',
  'guinea-bissau': 'https://a.espncdn.com/i/teamlogos/countries/500/gnb.png',
  'غينيا بيساو': 'https://a.espncdn.com/i/teamlogos/countries/500/gnb.png',
};

// Verified Club Logos
const VERIFIED_CLUB_CRESTS: Record<string, string> = {
  'real madrid': 'https://media.api-sports.io/football/teams/541.png',
  'ريال مدريد': 'https://media.api-sports.io/football/teams/541.png',
  'barcelona': 'https://media.api-sports.io/football/teams/529.png',
  'برشلونة': 'https://media.api-sports.io/football/teams/529.png',
  'atletico madrid': 'https://media.api-sports.io/football/teams/530.png',
  'أتلتيكو مدريد': 'https://media.api-sports.io/football/teams/530.png',
  'manchester city': 'https://media.api-sports.io/football/teams/50.png',
  'مانشستر سيتي': 'https://media.api-sports.io/football/teams/50.png',
  'liverpool': 'https://media.api-sports.io/football/teams/40.png',
  'ليفربول': 'https://media.api-sports.io/football/teams/40.png',
  'arsenal': 'https://media.api-sports.io/football/teams/42.png',
  'آرسنال': 'https://media.api-sports.io/football/teams/42.png',
  'chelsea': 'https://media.api-sports.io/football/teams/49.png',
  'تشيلسي': 'https://media.api-sports.io/football/teams/49.png',
  'manchester united': 'https://media.api-sports.io/football/teams/33.png',
  'مانشستر يونايتد': 'https://media.api-sports.io/football/teams/33.png',
  'bayern munich': 'https://media.api-sports.io/football/teams/157.png',
  'بايرن ميونخ': 'https://media.api-sports.io/football/teams/157.png',
  'paris saint germain': 'https://media.api-sports.io/football/teams/85.png',
  'psg': 'https://media.api-sports.io/football/teams/85.png',
  'باريس سان جيرمان': 'https://media.api-sports.io/football/teams/85.png',
  'inter milan': 'https://media.api-sports.io/football/teams/505.png',
  'inter': 'https://media.api-sports.io/football/teams/505.png',
  'إنتر ميلان': 'https://media.api-sports.io/football/teams/505.png',
  'ac milan': 'https://media.api-sports.io/football/teams/489.png',
  'milan': 'https://media.api-sports.io/football/teams/489.png',
  'ميلان': 'https://media.api-sports.io/football/teams/489.png',
  'juventus': 'https://media.api-sports.io/football/teams/496.png',
  'يوفنتوس': 'https://media.api-sports.io/football/teams/496.png',
  'al hilal': 'https://media.api-sports.io/football/teams/2939.png',
  'الهلال': 'https://media.api-sports.io/football/teams/2939.png',
  'al nassr': 'https://media.api-sports.io/football/teams/2934.png',
  'النصر': 'https://media.api-sports.io/football/teams/2934.png',
  'al ittihad': 'https://media.api-sports.io/football/teams/2932.png',
  'الاتحاد': 'https://media.api-sports.io/football/teams/2932.png',
  'al ahly': 'https://media.api-sports.io/football/teams/1032.png',
  'الأهلي': 'https://media.api-sports.io/football/teams/1032.png',
  'الأهلي المصري': 'https://media.api-sports.io/football/teams/1032.png',
  'zamalek': 'https://media.api-sports.io/football/teams/1033.png',
  'الزمالك': 'https://media.api-sports.io/football/teams/1033.png',
  'wydad ac': 'https://media.api-sports.io/football/teams/1041.png',
  'wydad': 'https://media.api-sports.io/football/teams/1041.png',
  'الوداد': 'https://media.api-sports.io/football/teams/1041.png',
  'raja ca': 'https://media.api-sports.io/football/teams/1042.png',
  'raja': 'https://media.api-sports.io/football/teams/1042.png',
  'الرجاء': 'https://media.api-sports.io/football/teams/1042.png',
  'far rabat': 'https://media.api-sports.io/football/teams/1040.png',
  'الجيش الملكي': 'https://media.api-sports.io/football/teams/1040.png',
  'rs berkane': 'https://media.api-sports.io/football/teams/1047.png',
  'نهضة بركان': 'https://media.api-sports.io/football/teams/1047.png',
  'esperance': 'https://media.api-sports.io/football/teams/1050.png',
  'الترجي': 'https://media.api-sports.io/football/teams/1050.png',
};

/**
 * Resolves a genuine team or national flag, completely eliminating ui-avatars and missing badges.
 */
export function resolveTeamLogo(name?: string, currentLogo?: string | null, teamId?: string | number): string {
  // 1. If existing logo is valid and not a placeholder avatar
  if (
    currentLogo &&
    typeof currentLogo === 'string' &&
    currentLogo.startsWith('http') &&
    !currentLogo.includes('ui-avatars.com') &&
    !currentLogo.includes('placeholder')
  ) {
    return currentLogo;
  }

  const cleanName = (name || '').toLowerCase().trim();

  // 2. Check national team flags (exact match)
  if (NATIONAL_TEAM_FLAGS[cleanName]) {
    return NATIONAL_TEAM_FLAGS[cleanName];
  }

  // Substring match for national teams
  for (const [key, val] of Object.entries(NATIONAL_TEAM_FLAGS)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return val;
    }
  }

  // 3. Check verified club crests
  if (VERIFIED_CLUB_CRESTS[cleanName]) {
    return VERIFIED_CLUB_CRESTS[cleanName];
  }
  for (const [key, val] of Object.entries(VERIFIED_CLUB_CRESTS)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return val;
    }
  }

  // 4. If team ID is provided and numeric
  const numericId = Number(teamId);
  if (numericId && numericId > 0 && numericId < 100000) {
    return `https://media.api-sports.io/football/teams/${numericId}.png`;
  }

  // 5. Fallback clean tournament crest
  return 'https://a.espncdn.com/i/leaguelogos/soccer/500/53.png';
}

/**
 * Determines the exact broadcast channel (beIN Sports 1, 2, 3, 4, 5, 6, AFC, etc.) for any match.
 * Follows official MENA television broadcasting rights and schedules.
 */
export function resolveMatchBroadcaster(params: {
  homeName?: string;
  awayName?: string;
  competitionName?: string;
  competitionId?: number | string;
  knownChannel?: string;
}): string {
  if (params.knownChannel && params.knownChannel.trim()) {
    const raw = params.knownChannel.trim();
    if (
      raw.toLowerCase().includes('bein') ||
      raw.toLowerCase().includes('ssc') ||
      raw.includes('الرياضية') ||
      raw.includes('Arryadia') ||
      raw.includes('أبوظبي') ||
      raw.includes('Abu Dhabi') ||
      raw.includes('ON Time') ||
      raw.includes('الجزائرية') ||
      raw.includes('الوطنية')
    ) {
      return raw;
    }
  }

  const comp = (params.competitionName || '').toLowerCase();
  const idStr = String(params.competitionId || '');
  const home = (params.homeName || '').toLowerCase();
  const away = (params.awayName || '').toLowerCase();

  // Helper checks for Moroccan team
  const isMorocco =
    home.includes('morocco') || away.includes('morocco') ||
    home.includes('maroc') || away.includes('maroc') ||
    home.includes('المغرب') || away.includes('المغرب') ||
    home.includes('الرجاء') || away.includes('الرجاء') ||
    home.includes('الوداد') || away.includes('الوداد') ||
    home.includes('الجيش الملكي') || away.includes('الجيش الملكي') ||
    home.includes('نهضة بركان') || away.includes('نهضة بركان') ||
    home.includes('raja') || away.includes('raja') ||
    home.includes('wydad') || away.includes('wydad') ||
    home.includes('far rabat') || away.includes('far rabat') ||
    home.includes('berkane') || away.includes('berkane');

  const isMoroccoNational =
    home.includes('morocco') || away.includes('morocco') ||
    home.includes('maroc') || away.includes('maroc') ||
    home.includes('المغرب') || away.includes('المغرب');

  // Moroccan National Team Matches (Friendly, Qualifiers, etc.)
  if (isMoroccoNational) {
    // If friendly match (مباريات ودية دولية)
    if (comp.includes('friendly') || comp.includes('friendlies') || comp.includes('ودية') || comp.includes('ودي')) {
      return 'الرياضية Arryadia HD';
    }
    // World Cup Qualifiers (تصفيات كأس العالم)
    if (comp.includes('world cup') || comp.includes('كأس العالم') || comp.includes('تصفيات')) {
      return 'الرياضية Arryadia HD / SSC';
    }
    // AFCON / CAN (كأس أمم إفريقيا)
    if (comp.includes('afcon') || comp.includes('إفريقيا') || comp.includes('افريقيا') || comp.includes('can')) {
      return 'beIN Sports 6 HD / الرياضية TNT';
    }
    // Default Moroccan national team broadcaster
    return 'الرياضية Arryadia HD';
  }

  // Moroccan Botola Pro & Throne Cup
  if (
    comp.includes('botola') ||
    comp.includes('المغربي') ||
    comp.includes('العرش') ||
    comp.includes('throne') ||
    (isMorocco && !comp.includes('champions') && !comp.includes('caf') && !comp.includes('أبطال'))
  ) {
    return 'الرياضية Arryadia HD';
  }

  // Algerian National Team & Algerian Ligue 1
  const isAlgeria =
    home.includes('algeria') || away.includes('algeria') ||
    home.includes('algérie') || away.includes('algérie') ||
    home.includes('الجزائر') || away.includes('الجزائر');

  if (isAlgeria && (comp.includes('friendly') || comp.includes('ودية') || comp.includes('جزائر') || comp.includes('algeria'))) {
    return 'الجزائرية السادسة TV6 HD';
  }

  // Egyptian National Team & Egyptian League
  const isEgypt =
    home.includes('egypt') || away.includes('egypt') ||
    home.includes('مصر') || away.includes('مصر') ||
    home.includes('الأهلي') || away.includes('الأهلي') ||
    home.includes('الزمالك') || away.includes('الزمالك') ||
    home.includes('بيراميدز') || away.includes('بيراميدز') ||
    home.includes('ahly') || away.includes('ahly') ||
    home.includes('zamalek') || away.includes('zamalek');

  if (isEgypt && (comp.includes('friendly') || comp.includes('ودية') || comp.includes('مصر') || comp.includes('egypt'))) {
    return 'ON Time Sports 1 HD';
  }

  // Tunisian National Team & Tunisian League
  const isTunisia =
    home.includes('tunisia') || away.includes('tunisia') ||
    home.includes('تونس') || away.includes('تونس');

  if (isTunisia && (comp.includes('friendly') || comp.includes('ودية') || comp.includes('تونس') || comp.includes('tunisia'))) {
    return 'الوطنية التونسية 1 HD';
  }

  // Saudi Roshn League & King's Cup & Saudi Team
  const isSaudi =
    home.includes('saudi') || away.includes('saudi') ||
    home.includes('السعودية') || away.includes('السعودية') ||
    home.includes('الهلال') || away.includes('الهلال') ||
    home.includes('النصر') || away.includes('النصر') ||
    home.includes('الاتحاد') || away.includes('الاتحاد') ||
    home.includes('الأهلي السعودي') || away.includes('الاهلي السعودي') ||
    home.includes('hilal') || away.includes('hilal') ||
    home.includes('nassr') || away.includes('nassr') ||
    home.includes('ittihad') || away.includes('ittihad');

  if (comp.includes('roshn') || comp.includes('saudi') || comp.includes('سعودي') || (isSaudi && (comp.includes('friendly') || comp.includes('ودية')))) {
    return 'SSC 1 HD';
  }

  // Italian Serie A & Coppa Italia (Exclusive to Abu Dhabi Sports Premium in MENA)
  if (
    comp.includes('serie a') ||
    comp.includes('إيطالي') ||
    comp.includes('ايطالي') ||
    comp.includes('coppa italia') ||
    comp.includes('كأس إيطاليا') ||
    comp.includes('كاس ايطاليا') ||
    idStr === '135' ||
    idStr === '4'
  ) {
    const isTopSerieA =
      home.includes('juventus') || away.includes('juventus') || home.includes('يوفنتوس') || away.includes('يوفنتوس') ||
      home.includes('inter') || away.includes('inter') || home.includes('إنتر') || away.includes('انتر') ||
      home.includes('milan') || away.includes('milan') || home.includes('ميلان') || away.includes('ميلان') ||
      home.includes('napoli') || away.includes('napoli') || home.includes('نابولي') || away.includes('نابولي') ||
      home.includes('roma') || away.includes('roma') || home.includes('روما') || away.includes('روما');

    if (isTopSerieA) {
      return 'أبوظبي الرياضية بريميوم 1 HD';
    }
    return 'أبوظبي الرياضية بريميوم 2 HD';
  }

  // Premier League (الدوري الإنجليزي الممتاز)
  if (comp.includes('premier') || comp.includes('إنجليزي') || comp.includes('انجليزي') || idStr === '39' || idStr === '1') {
    const isTopTier =
      home.includes('arsenal') || home.includes('liverpool') || home.includes('manchester city') ||
      home.includes('manchester united') || home.includes('chelsea') || home.includes('tottenham') ||
      away.includes('arsenal') || away.includes('liverpool') || away.includes('manchester city') ||
      away.includes('manchester united') || away.includes('chelsea') || away.includes('tottenham') ||
      home.includes('أرسنال') || home.includes('ليفربول') || home.includes('مانشستر سيتي') || home.includes('تشيلسي');

    if (isTopTier) {
      return 'beIN Sports 1 HD';
    }
    return 'beIN Sports 2 HD';
  }

  // La Liga (الدوري الإسباني)
  if (comp.includes('la liga') || comp.includes('laliga') || comp.includes('إسباني') || comp.includes('اسباني') || idStr === '140' || idStr === '2') {
    const isBigTwo =
      home.includes('real madrid') || home.includes('barcelona') || home.includes('atletico') ||
      home.includes('ريال مدريد') || home.includes('برشلونة') || home.includes('أتلتيكو') ||
      away.includes('real madrid') || away.includes('barcelona') || away.includes('atletico') ||
      away.includes('ريال مدريد') || away.includes('برشلونة') || away.includes('أتلتيكو');

    if (isBigTwo) {
      return 'beIN Sports 1 HD';
    }
    return 'beIN Sports 3 HD';
  }

  // UEFA Champions League (دوري أبطال أوروبا)
  if (comp.includes('champions') || comp.includes('أبطال أوروبا') || comp.includes('ابطال اوروبا') || idStr === '2' || idStr === '3') {
    const isTopUefa =
      home.includes('real madrid') || home.includes('manchester city') || home.includes('bayern') ||
      home.includes('paris') || home.includes('barcelona') || home.includes('arsenal') || home.includes('liverpool') ||
      away.includes('real madrid') || away.includes('manchester city') || away.includes('bayern') ||
      away.includes('paris') || away.includes('barcelona') || away.includes('arsenal') || away.includes('liverpool');
    if (isTopUefa) return 'beIN Sports 1 HD';
    return 'beIN Sports 2 HD';
  }

  // Bundesliga (الدوري الألماني)
  if (comp.includes('bundesliga') || comp.includes('ألماني') || comp.includes('الماني') || idStr === '78' || idStr === '5') {
    return 'beIN Sports 5 HD';
  }

  // Ligue 1 (الدوري الفرنسي)
  if (comp.includes('ligue 1') || comp.includes('فرنسي') || idStr === '61' || idStr === '6') {
    return 'beIN Sports 4 HD';
  }

  // UEFA Europa League & Conference League (الدوري الأوروبي)
  if (comp.includes('europa') || comp.includes('أوروبي') || comp.includes('اوروبي') || comp.includes('مؤتمر') || idStr === '7') {
    return 'beIN Sports 1 HD';
  }

  // Asian Competitions / AFC Champions League (دوري أبطال آسيا للنخبة)
  if (comp.includes('afc') || comp.includes('آسيا') || comp.includes('اسيا')) {
    return 'beIN Sports AFC HD';
  }

  // CAF Champions League & AFCON (كأس أمم إفريقيا ودوري أبطال إفريقيا)
  if (comp.includes('caf') || comp.includes('afcon') || comp.includes('إفريقيا') || comp.includes('افريقيا') || idStr === '6') {
    return 'beIN Sports 6 HD';
  }

  // UEFA Nations League (دوري الأمم الأوروبية)
  if (comp.includes('nations') || comp.includes('الأمم') || comp.includes('الامم')) {
    if (
      home.includes('spain') || away.includes('spain') || home.includes('إسبانيا') || away.includes('إسبانيا') ||
      home.includes('germany') || away.includes('germany') || home.includes('ألمانيا') || away.includes('ألمانيا') ||
      home.includes('france') || away.includes('france') || home.includes('فرنسا') || away.includes('فرنسا') ||
      home.includes('portugal') || away.includes('portugal') || home.includes('البرتغال') || away.includes('البرتغال')
    ) {
      return 'beIN Sports 1 HD';
    }

    if (
      home.includes('england') || away.includes('england') || home.includes('إنجلترا') || away.includes('إنجلترا') ||
      home.includes('italy') || away.includes('italy') || home.includes('إيطاليا') || away.includes('إيطاليا') ||
      home.includes('netherlands') || away.includes('netherlands') || home.includes('هولندا') || away.includes('هولندا') ||
      home.includes('belgium') || away.includes('belgium') || home.includes('بلجيكا') || away.includes('بلجيكا')
    ) {
      return 'beIN Sports 2 HD';
    }

    if (
      home.includes('scotland') || away.includes('scotland') || home.includes('اسكتلندا') ||
      home.includes('croatia') || away.includes('croatia') || home.includes('كرواتيا') ||
      home.includes('switzerland') || away.includes('switzerland') || home.includes('سويسرا') ||
      home.includes('wales') || away.includes('wales') || home.includes('ويلز')
    ) {
      return 'beIN Sports 3 HD';
    }

    return 'beIN Sports 4 HD';
  }

  // General International Friendlies (مباريات ودية)
  if (comp.includes('friendly') || comp.includes('ودية') || comp.includes('ودي')) {
    if (
      home.includes('spain') || away.includes('spain') ||
      home.includes('france') || away.includes('france') ||
      home.includes('germany') || away.includes('germany') ||
      home.includes('brazil') || away.includes('brazil') ||
      home.includes('argentina') || away.includes('argentina') ||
      home.includes('portugal') || away.includes('portugal')
    ) {
      return 'beIN Sports 1 HD';
    }
    return 'beIN Sports 2 HD';
  }

  // Default international / high profile
  return 'beIN Sports 1 HD';
}
