// Comprehensive Arabic localization helpers for football leagues, teams, rounds, and countries

const ARABIC_TEAM_NAMES: Record<string, string> = {
  // UEFA Nations
  'andorra': 'أندورا',
  'malta': 'مالطا',
  'kosovo': 'كوسوفو',
  'israel': 'إسرائيل',
  'rep. of ireland': 'أيرلندا',
  'republic of ireland': 'أيرلندا',
  'ireland': 'أيرلندا',
  'northern ireland': 'أيرلندا الشمالية',
  'germany': 'ألمانيا',
  'netherlands': 'هولندا',
  'holland': 'هولندا',
  'serbia': 'صربيا',
  'portugal': 'البرتغال',
  'norway': 'النرويج',
  'austria': 'النمسا',
  'greece': 'اليونان',
  'wales': 'ويلز',
  'denmark': 'الدانمارك',
  'france': 'فرنسا',
  'spain': 'إسبانيا',
  'italy': 'إيطاليا',
  'england': 'إنجلترا',
  'belgium': 'بلجيكا',
  'croatia': 'كرواتيا',
  'switzerland': 'سويسرا',
  'turkey': 'تركيا',
  'türkiye': 'تركيا',
  'turkiye': 'تركيا',
  'scotland': 'اسكتلندا',
  'sweden': 'السويد',
  'poland': 'بولندا',
  'ukraine': 'أوكرانيا',
  'czech republic': 'التشيك',
  'czechia': 'التشيك',
  'slovakia': 'سلوفاكيا',
  'slovenia': 'سلوفينيا',
  'hungary': 'المجر',
  'romania': 'رومانيا',
  'bulgaria': 'بلغاريا',
  'finland': 'فنلندا',
  'iceland': 'آيسلندا',
  'albania': 'ألبانيا',
  'north macedonia': 'مقدونيا الشمالية',
  'macedonia': 'مقدونيا الشمالية',
  'bosnia and herzegovina': 'البوسنة والهرسك',
  'bosnia & herzegovina': 'البوسنة والهرسك',
  'bosnia': 'البوسنة والهرسك',
  'montenegro': 'الجبل الأسود',
  'cyprus': 'قبرص',
  'luxembourg': 'لوكسمبورغ',
  'armenia': 'أرمينيا',
  'azerbaijan': 'أذربيجان',
  'georgia': 'جورجيا',
  'kazakhstan': 'كازاخستان',
  'moldova': 'مولدوفا',
  'belarus': 'بيلاروسيا',
  'latvia': 'لاتفيا',
  'lithuania': 'ليتوانيا',
  'estonia': 'إستونيا',
  'faroe islands': 'جزر فارو',
  'gibraltar': 'جبل طارق',
  'liechtenstein': 'ليختنشتاين',
  'san marino': 'سان مارينو',
  'russia': 'روسيا',

  // Arab & Middle East Nations
  'morocco': 'المغرب',
  'palestine': 'فلسطين',
  'saudi arabia': 'السعودية',
  'egypt': 'مصر',
  'algeria': 'الجزائر',
  'tunisia': 'تونس',
  'qatar': 'قطر',
  'iraq': 'العراق',
  'jordan': 'الأردن',
  'uae': 'الإمارات',
  'united arab emirates': 'الإمارات',
  'oman': 'عُمان',
  'syria': 'سوريا',
  'lebanon': 'لبنان',
  'kuwait': 'الكويت',
  'bahrain': 'البحرين',
  'yemen': 'اليمن',
  'sudan': 'السودان',
  'libya': 'ليبيا',
  'mauritania': 'موريتانيا',
  'comoros': 'جزر القمر',
  'djibouti': 'جيبوتي',
  'somalia': 'الصومال',
  'sri lanka': 'سريلانكا',

  // Rest of Asia & Oceania
  'japan': 'اليابان',
  'south korea': 'كوريا الجنوبية',
  'korea republic': 'كوريا الجنوبية',
  'korea south': 'كوريا الجنوبية',
  'north korea': 'كوريا الشمالية',
  'china': 'الصين',
  'china pr': 'الصين',
  'australia': 'أستراليا',
  'new zealand': 'نيوزيلندا',
  'iran': 'إيران',
  'uzbekistan': 'أوزبكستان',
  'maldives': 'جزر المالديف',
  'thailand': 'تايلاند',
  'vietnam': 'فيتنام',
  'indonesia': 'إندونيسيا',
  'malaysia': 'ماليزيا',
  'singapore': 'سنغافورة',
  'philippines': 'الفلبين',
  'india': 'الهند',
  'pakistan': 'باكستان',
  'tajikistan': 'طاجيكستان',
  'kyrgyzstan': 'قيرغيزستان',
  'turkmenistan': 'تركمانستان',
  'hong kong': 'هونغ كونغ',

  // South America (CONMEBOL)
  'brazil': 'البرازيل',
  'argentina': 'الأرجنتين',
  'uruguay': 'أوروجواي',
  'colombia': 'كولومبيا',
  'ecuador': 'الإكوادور',
  'chile': 'تشيلي',
  'paraguay': 'باراغواي',
  'peru': 'بيرو',
  'venezuela': 'فنزويلا',
  'bolivia': 'بوليفيا',

  // Africa (CAF)
  'senegal': 'السنغال',
  'nigeria': 'نيجيريا',
  'cameroon': 'الكاميرون',
  'ivory coast': 'ساحل العاج',
  'ghana': 'غانا',
  'mali': 'مالي',
  'burkina faso': 'بوركينا فاسو',
  'guinea': 'غينيا',
  'dr congo': 'الكونغو الديمقراطية',
  'congo dr': 'الكونغو الديمقراطية',
  'gabon': 'الغابون',
  'south africa': 'جنوب إفريقيا',
  'angola': 'أنغولا',
  'zambia': 'زامبيا',
  'cape verde': 'الرأس الأخضر',
  'equatorial guinea': 'غينيا الاستوائية',
  'uganda': 'أوغندا',
  'kenya': 'كينيا',
  'tanzania': 'تنزانيا',
  'mozambique': 'موزمبيق',
  'benin': 'بنين',
  'togo': 'توغو',
  'gambia': 'غامبيا',

  // North & Central America (CONCACAF)
  'usa': 'الولايات المتحدة',
  'united states': 'الولايات المتحدة',
  'mexico': 'المكسيك',
  'canada': 'كندا',
  'costa rica': 'كوستاريكا',
  'panama': 'بنما',
  'jamaica': 'جامايكا',
  'honduras': 'هندوراس',
  'el salvador': 'السلفادور',
  'guatemala': 'غواتيمالا',
  'haiti': 'هايتي',
  'trinidad and tobago': 'ترينيداد وتوباغو',

  // Major European Clubs
  'real madrid': 'ريال مدريد',
  'barcelona': 'برشلونة',
  'atletico madrid': 'أتلتيكو مدريد',
  'athletic club': 'أتلتيك بلباو',
  'athletic bilbao': 'أتلتيك بلباو',
  'sevilla': 'إشبيلية',
  'real betis': 'ريال بيتيس',
  'real sociedad': 'ريال سوسيداد',
  'villarreal': 'فياريال',
  'valencia': 'فالنسيا',
  'girona': 'جيرونا',
  'arsenal': 'آرسنال',
  'manchester city': 'مانشستر سيتي',
  'liverpool': 'ليفربول',
  'chelsea': 'تشيلسي',
  'manchester united': 'مانشستر يونايتد',
  'tottenham': 'توتنهام',
  'tottenham hotspur': 'توتنهام',
  'newcastle': 'نيوكاسل',
  'newcastle united': 'نيوكاسل',
  'aston villa': 'أستون فيلا',
  'brighton': 'برايتون',
  'west ham': 'وست هام',
  'everton': 'إيفرتون',
  'bayern munich': 'بايرن ميونخ',
  'bayern munchen': 'بايرن ميونخ',
  'borussia dortmund': 'بوروسيا دورتموند',
  'bayer leverkusen': 'باير ليفركوزن',
  'rb leipzig': 'لايبزيغ',
  'leipzig': 'لايبزيغ',
  'eintracht frankfurt': 'آينتراخت فرانكفورت',
  'paris saint germain': 'باريس سان جيرمان',
  'psg': 'باريس سان جيرمان',
  'marseille': 'مارسيليا',
  'monaco': 'موناكو',
  'lyon': 'ليون',
  'lille': 'ليل',
  'juventus': 'يوفنتوس',
  'inter': 'إنتر ميلان',
  'inter milan': 'إنتر ميلان',
  'milan': 'ميلان',
  'ac milan': 'ميلان',
  'napoli': 'نابولي',
  'roma': 'روما',
  'as roma': 'روما',
  'lazio': 'لاتسيو',
  'atalanta': 'أتالانتا',
  'fiorentina': 'فيورنتينا',
  'benfica': 'بنفيكا',
  'porto': 'بورتو',
  'sporting cp': 'سبورتينغ لشبونة',
  'ajax': 'أياكس',
  'feyenoord': 'فينورد',
  'psv': 'بي إس في آيندهوفن',

  // Arab Clubs
  'al hilal': 'الهلال',
  'al nassr': 'النصر',
  'al ittihad': 'الاتحاد',
  'al ahli': 'الأهلي السعودي',
  'al ettifaq': 'الاتفاق',
  'al shabab': 'الشباب',
  'raja casablanca': 'الرجاء الرياضي',
  'raja ca': 'الرجاء الرياضي',
  'wydad ac': 'الوداد الرياضي',
  'wydad casablanca': 'الوداد الرياضي',
  'as far rabat': 'الجيش الملكي',
  'far rabat': 'الجيش الملكي',
  'rs berkane': 'نهضة بركان',
  'fus rabat': 'الفتح الرباطي',
  'al ahly': 'الأهلي المصري',
  'zamalek': 'الزمالك',
  'pyramids': 'بيراميدز',
  'esperance tunis': 'الترجي التونسي',
  'etoile du sahel': 'النجم الساحلي',
  'club africain': 'النادي الإفريقي',
  'cr belouizdad': 'شباب بلوزداد',
  'usm alger': 'اتحاد العاصمة',
  'mc alger': 'مولودية الجزائر',
  'al sadd': 'السد القطري',
  'al duhail': 'الدحيل',
  'al ain': 'العين الإماراتي',
  'internacional': 'إنترناسيونال',
  'sc internacional': 'إنترناسيونال',
  'corinthians': 'كورينثيانز',
  'sc corinthians': 'كورينثيانز',
  'flamengo': 'فلامنغو',
  'palmeiras': 'بالميراس',
  'sao paulo': 'ساو باولو',
  'são paulo': 'ساو باولو',
  'santos': 'سانتوس',
  'fluminense': 'فلومينينسي',
  'botafogo': 'بوتافوغو',
  'gremio': 'غريميو',
  'grêmio': 'غريميو',
  'cruzeiro': 'كروزيرو',
  'atletico mineiro': 'أتلتيكو مينيرو',
  'atlético mineiro': 'أتلتيكو مينيرو',
  'vasco da gama': 'فاسكو دا غاما',
  'bragantino': 'براغانتينو',
  'red bull bragantino': 'براغانتينو',
  'mirassol': 'ميراسول',
  'remo': 'ريمو',
};

export function getArabicTeamName(name?: string): string {
  if (!name) return 'فريق';
  const clean = name.toLowerCase().trim();
  if (ARABIC_TEAM_NAMES[clean]) return ARABIC_TEAM_NAMES[clean];
  
  // Try normalized without punctuation
  const normalized = clean.replace(/[.\-_']/g, ' ').replace(/\s+/g, ' ').trim();
  if (ARABIC_TEAM_NAMES[normalized]) return ARABIC_TEAM_NAMES[normalized];

  // Check exact keys
  for (const [key, val] of Object.entries(ARABIC_TEAM_NAMES)) {
    if (clean === key || normalized === key) return val;
  }

  // Check substring matches (longest key first to prevent "inter" matching "internacional")
  const sortedEntries = Object.entries(ARABIC_TEAM_NAMES).sort((a, b) => b[0].length - a[0].length);
  for (const [key, val] of sortedEntries) {
    if (key.length >= 4 && (clean.includes(key) || normalized.includes(key))) return val;
  }
  return name;
}

export function getArabicCompetitionName(name?: string): string {
  if (!name) return 'المباريات الودية';
  const lower = name.toLowerCase().trim();
  if (lower.includes('friendly') || lower.includes('friendlies')) return 'المباريات الودية';
  if (lower.includes('concacaf nations league') || lower.includes('concacaf nation')) return 'دوري أمم الكونكاكاف';
  if (lower.includes('concacaf gold cup')) return 'كأس الكونكاكاف الذهبية';
  if (lower.includes('concacaf')) return 'بطولة الكونكاكاف';
  if (lower.includes('uefa nations league')) return 'دوري الأمم الأوروبية';
  if (lower.includes('nations league')) return 'دوري الأمم الأوروبية';
  if (lower.includes('premier league')) return 'الدوري الإنجليزي الممتاز';
  if (lower.includes('la liga') || lower.includes('primera')) return 'الدوري الإسباني';
  if (lower.includes('brasileir') || lower.includes('brazilian') || (lower.includes('serie a') && (lower.includes('brazil') || lower.includes('brasil')))) return 'الدوري البرازيلي';
  if (lower.includes('copa do brasil') || lower.includes('copa do brazil')) return 'كأس البرازيل';
  if (lower.includes('serie a')) return 'الدوري الإيطالي';
  if (lower.includes('bundesliga')) return 'الدوري الألماني';
  if (lower.includes('ligue 1')) return 'الدوري الفرنسي';
  if (lower.includes('champions league')) return 'دوري أبطال أوروبا';
  if (lower.includes('europa league')) return 'الدوري الأوروبي';
  if (lower.includes('conference league')) return 'دوري المؤتمر الأوروبي';
  if (lower.includes('super cup')) return 'كأس السوبر الأوروبي';
  if (lower.includes('world cup')) return 'كأس العالم';
  if (lower.includes('copa america') || lower.includes('copa américa')) return 'كوبا أمريكا';
  if (lower.includes('asian cup')) return 'كأس آسيا';
  if (lower.includes('africa cup') || lower.includes('afcon') || lower.includes('can ')) return 'كأس أمم إفريقيا';
  if (lower.includes('botola')) return 'الدوري المغربي للمحترفين';
  if (lower.includes('saudi') || lower.includes('roshn')) return 'دوري روشن السعودي';
  return name;
}

export function getArabicCountryName(country?: string): string {
  if (!country) return 'دولي';
  const c = country.toLowerCase().trim();
  if (c === 'world' || c === 'international' || c === '') return 'دولي';
  if (c === 'europe') return 'أوروبا';
  if (c === 'asia') return 'آسيا';
  if (c === 'africa') return 'إفريقيا';
  if (c === 'south america') return 'أمريكا الجنوبية';
  if (c === 'north america' || c === 'concacaf' || c.includes('central america')) return 'أمريكا الشمالية';
  if (c === 'england') return 'إنجلترا';
  if (c === 'spain') return 'إسبانيا';
  if (c === 'italy') return 'إيطاليا';
  if (c === 'germany') return 'ألمانيا';
  if (c === 'france') return 'فرنسا';
  if (c === 'morocco') return 'المغرب';
  if (c === 'saudi arabia' || c === 'saudi-arabia') return 'السعودية';
  if (c === 'egypt') return 'مصر';
  if (c === 'algeria') return 'الجزائر';
  if (c === 'tunisia') return 'تونس';
  if (c === 'netherlands' || c === 'holland') return 'هولندا';
  if (c === 'portugal') return 'البرتغال';
  if (c === 'brazil') return 'البرازيل';
  if (c === 'argentina') return 'الأرجنتين';
  return country;
}

export function getArabicRound(round?: string): string {
  if (!round) return 'الجولة 1';
  const numMatch = round.match(/\d+/);
  if (numMatch) {
    return `الجولة ${numMatch[0]}`;
  }
  const lower = round.toLowerCase();
  if (lower.includes('quarter')) return 'ربع النهائي';
  if (lower.includes('semi')) return 'نصف النهائي';
  if (lower.includes('final')) return 'المباراة النهائية';
  if (lower.includes('group')) return 'دور المجموعات';
  return round;
}
