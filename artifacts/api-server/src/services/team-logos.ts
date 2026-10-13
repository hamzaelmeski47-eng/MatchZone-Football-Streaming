/**
 * Comprehensive Team & National Team Flag / Logo Resolver
 * Supports both English and Arabic team and country names.
 */

// Official ESPN and CDN country flag mappings (3-letter ESPN codes and ISO 2-letter codes)
const COUNTRY_CODES: Record<string, { espn: string; iso: string }> = {
  // Arab & African Nations
  morocco: { espn: 'mar', iso: 'ma' },
  المغرب: { espn: 'mar', iso: 'ma' },
  egypt: { espn: 'egy', iso: 'eg' },
  مصر: { espn: 'egy', iso: 'eg' },
  algeria: { espn: 'alg', iso: 'dz' },
  الجزائر: { espn: 'alg', iso: 'dz' },
  tunisia: { espn: 'tun', iso: 'tn' },
  تونس: { espn: 'tun', iso: 'tn' },
  'saudi arabia': { espn: 'ksa', iso: 'sa' },
  السعودية: { espn: 'ksa', iso: 'sa' },
  qatar: { espn: 'qat', iso: 'qa' },
  قطر: { espn: 'qat', iso: 'qa' },
  uae: { espn: 'uae', iso: 'ae' },
  'united arab emirates': { espn: 'uae', iso: 'ae' },
  الإمارات: { espn: 'uae', iso: 'ae' },
  iraq: { espn: 'irq', iso: 'iq' },
  العراق: { espn: 'irq', iso: 'iq' },
  jordan: { espn: 'jor', iso: 'jo' },
  الأردن: { espn: 'jor', iso: 'jo' },
  kuwait: { espn: 'kuw', iso: 'kw' },
  الكويت: { espn: 'kuw', iso: 'kw' },
  bahrain: { espn: 'bhr', iso: 'bh' },
  البحرين: { espn: 'bhr', iso: 'bh' },
  oman: { espn: 'oma', iso: 'om' },
  عمان: { espn: 'oma', iso: 'om' },
  'عُمان': { espn: 'oma', iso: 'om' },
  syria: { espn: 'syr', iso: 'sy' },
  سوريا: { espn: 'syr', iso: 'sy' },
  lebanon: { espn: 'lbn', iso: 'lb' },
  لبنان: { espn: 'lbn', iso: 'lb' },
  palestine: { espn: 'ple', iso: 'ps' },
  فلسطين: { espn: 'ple', iso: 'ps' },
  yemen: { espn: 'yem', iso: 'ye' },
  اليمن: { espn: 'yem', iso: 'ye' },
  sudan: { espn: 'sdn', iso: 'sd' },
  السودان: { espn: 'sdn', iso: 'sd' },
  libya: { espn: 'lby', iso: 'ly' },
  ليبيا: { espn: 'lby', iso: 'ly' },
  mauritania: { espn: 'mtn', iso: 'mr' },
  موريتانيا: { espn: 'mtn', iso: 'mr' },
  djibouti: { espn: 'dji', iso: 'dj' },
  جيبوتي: { espn: 'dji', iso: 'dj' },
  somalia: { espn: 'som', iso: 'so' },
  الصومال: { espn: 'som', iso: 'so' },
  comoros: { espn: 'com', iso: 'km' },
  'جزر القمر': { espn: 'com', iso: 'km' },
  'sri lanka': { espn: 'sri', iso: 'lk' },
  سريلانكا: { espn: 'sri', iso: 'lk' },

  // World Cup & Continental Giants
  brazil: { espn: 'bra', iso: 'br' },
  البرازيل: { espn: 'bra', iso: 'br' },
  argentina: { espn: 'arg', iso: 'ar' },
  الأرجنتين: { espn: 'arg', iso: 'ar' },
  france: { espn: 'fra', iso: 'fr' },
  فرنسا: { espn: 'fra', iso: 'fr' },
  spain: { espn: 'esp', iso: 'es' },
  إسبانيا: { espn: 'esp', iso: 'es' },
  england: { espn: 'eng', iso: 'gb-eng' },
  إنجلترا: { espn: 'eng', iso: 'gb-eng' },
  germany: { espn: 'ger', iso: 'de' },
  ألمانيا: { espn: 'ger', iso: 'de' },
  portugal: { espn: 'por', iso: 'pt' },
  البرتغال: { espn: 'por', iso: 'pt' },
  italy: { espn: 'ita', iso: 'it' },
  إيطاليا: { espn: 'ita', iso: 'it' },
  netherlands: { espn: 'ned', iso: 'nl' },
  holland: { espn: 'ned', iso: 'nl' },
  هولندا: { espn: 'ned', iso: 'nl' },
  belgium: { espn: 'bel', iso: 'be' },
  بلجيكا: { espn: 'bel', iso: 'be' },
  croatia: { espn: 'cro', iso: 'hr' },
  كرواتيا: { espn: 'cro', iso: 'hr' },
  uruguay: { espn: 'uru', iso: 'uy' },
  أوروجواي: { espn: 'uru', iso: 'uy' },
  'أوروغواي': { espn: 'uru', iso: 'uy' },
  colombia: { espn: 'col', iso: 'co' },
  كولومبيا: { espn: 'col', iso: 'co' },
  chile: { espn: 'chi', iso: 'cl' },
  تشيلي: { espn: 'chi', iso: 'cl' },
  senegal: { espn: 'sen', iso: 'sn' },
  السنغال: { espn: 'sen', iso: 'sn' },
  nigeria: { espn: 'nga', iso: 'ng' },
  نيجيريا: { espn: 'nga', iso: 'ng' },
  cameroon: { espn: 'cmr', iso: 'cm' },
  الكاميرون: { espn: 'cmr', iso: 'cm' },
  'ivory coast': { espn: 'civ', iso: 'ci' },
  'cote d\'ivoire': { espn: 'civ', iso: 'ci' },
  'ساحل العاج': { espn: 'civ', iso: 'ci' },
  ghana: { espn: 'gha', iso: 'gh' },
  غانا: { espn: 'gha', iso: 'gh' },
  mali: { espn: 'mli', iso: 'ml' },
  مالي: { espn: 'mli', iso: 'ml' },
  'burkina faso': { espn: 'bfa', iso: 'bf' },
  'بوركينا فاسو': { espn: 'bfa', iso: 'bf' },
  'south africa': { espn: 'rsa', iso: 'za' },
  'جنوب إفريقيا': { espn: 'rsa', iso: 'za' },
  'dr congo': { espn: 'cod', iso: 'cd' },
  'congo dr': { espn: 'cod', iso: 'cd' },
  'الكونغو الديمقراطية': { espn: 'cod', iso: 'cd' },
  guinea: { espn: 'gui', iso: 'gn' },
  غينيا: { espn: 'gui', iso: 'gn' },
  'guinea-bissau': { espn: 'gnb', iso: 'gw' },
  'غينيا بيساو': { espn: 'gnb', iso: 'gw' },
  'south sudan': { espn: 'ssd', iso: 'ss' },
  'جنوب السودان': { espn: 'ssd', iso: 'ss' },
  'sierra leone': { espn: 'sle', iso: 'sl' },
  'سيراليون': { espn: 'sle', iso: 'sl' },
  seychelles: { espn: 'sey', iso: 'sc' },
  سيشل: { espn: 'sey', iso: 'sc' },
  mauritius: { espn: 'mri', iso: 'mu' },
  موريشيوس: { espn: 'mri', iso: 'mu' },
  thailand: { espn: 'tha', iso: 'th' },
  تايلاند: { espn: 'tha', iso: 'th' },
  'chinese taipei': { espn: 'tpe', iso: 'tw' },
  taiwan: { espn: 'tpe', iso: 'tw' },
  'تايبيه الصينية': { espn: 'tpe', iso: 'tw' },
  india: { espn: 'ind', iso: 'in' },
  الهند: { espn: 'ind', iso: 'in' },
  japan: { espn: 'jpn', iso: 'jp' },
  اليابان: { espn: 'jpn', iso: 'jp' },
  'south korea': { espn: 'kor', iso: 'kr' },
  'korea republic': { espn: 'kor', iso: 'kr' },
  'كوريا الجنوبية': { espn: 'kor', iso: 'kr' },
  australia: { espn: 'aus', iso: 'au' },
  أستراليا: { espn: 'aus', iso: 'au' },
  usa: { espn: 'usa', iso: 'us' },
  'united states': { espn: 'usa', iso: 'us' },
  'الولايات المتحدة': { espn: 'usa', iso: 'us' },
  mexico: { espn: 'mex', iso: 'mx' },
  المكسيك: { espn: 'mex', iso: 'mx' },
  canada: { espn: 'can', iso: 'ca' },
  كندا: { espn: 'can', iso: 'ca' },
  turkey: { espn: 'tur', iso: 'tr' },
  türkiye: { espn: 'tur', iso: 'tr' },
  تركيا: { espn: 'tur', iso: 'tr' },
  switzerland: { espn: 'sui', iso: 'ch' },
  سويسرا: { espn: 'sui', iso: 'ch' },
  austria: { espn: 'aut', iso: 'at' },
  النمسا: { espn: 'aut', iso: 'at' },
  denmark: { espn: 'den', iso: 'dk' },
  الدانمارك: { espn: 'den', iso: 'dk' },
  sweden: { espn: 'swe', iso: 'se' },
  السويد: { espn: 'swe', iso: 'se' },
  norway: { espn: 'nor', iso: 'no' },
  النرويج: { espn: 'nor', iso: 'no' },
  poland: { espn: 'pol', iso: 'pl' },
  بولندا: { espn: 'pol', iso: 'pl' },
  ukraine: { espn: 'ukr', iso: 'ua' },
  أوكرانيا: { espn: 'ukr', iso: 'ua' },
  scotland: { espn: 'sco', iso: 'gb-sct' },
  اسكتلندا: { espn: 'sco', iso: 'gb-sct' },
  wales: { espn: 'wal', iso: 'gb-wls' },
  ويلز: { espn: 'wal', iso: 'gb-wls' },
  greece: { espn: 'gre', iso: 'gr' },
  اليونان: { espn: 'gre', iso: 'gr' },
  serbia: { espn: 'srb', iso: 'rs' },
  صربيا: { espn: 'srb', iso: 'rs' },
  albania: { espn: 'alb', iso: 'al' },
  ألبانيا: { espn: 'alb', iso: 'al' },
};

// Major verified clubs logos
const VERIFIED_CLUB_LOGOS: Record<string, string> = {
  'real madrid': 'https://media.api-sports.io/football/teams/541.png',
  'ريال مدريد': 'https://media.api-sports.io/football/teams/541.png',
  barcelona: 'https://media.api-sports.io/football/teams/529.png',
  'برشلونة': 'https://media.api-sports.io/football/teams/529.png',
  'atletico madrid': 'https://media.api-sports.io/football/teams/530.png',
  'أتلتيكو مدريد': 'https://media.api-sports.io/football/teams/530.png',
  girona: 'https://media.api-sports.io/football/teams/547.png',
  'جيرونا': 'https://media.api-sports.io/football/teams/547.png',
  'athletic bilbao': 'https://media.api-sports.io/football/teams/531.png',
  'أتلتيك بلباو': 'https://media.api-sports.io/football/teams/531.png',
  sevilla: 'https://media.api-sports.io/football/teams/536.png',
  'إشبيلية': 'https://media.api-sports.io/football/teams/536.png',
  'real betis': 'https://media.api-sports.io/football/teams/543.png',
  'ريال بيتيس': 'https://media.api-sports.io/football/teams/543.png',
  villarreal: 'https://media.api-sports.io/football/teams/533.png',
  'فياريال': 'https://media.api-sports.io/football/teams/533.png',
  'manchester city': 'https://media.api-sports.io/football/teams/50.png',
  'مانشستر سيتي': 'https://media.api-sports.io/football/teams/50.png',
  liverpool: 'https://media.api-sports.io/football/teams/40.png',
  'ليفربول': 'https://media.api-sports.io/football/teams/40.png',
  arsenal: 'https://media.api-sports.io/football/teams/42.png',
  'آرسنال': 'https://media.api-sports.io/football/teams/42.png',
  'ارسنال': 'https://media.api-sports.io/football/teams/42.png',
  chelsea: 'https://media.api-sports.io/football/teams/49.png',
  'تشيلسي': 'https://media.api-sports.io/football/teams/49.png',
  'manchester united': 'https://media.api-sports.io/football/teams/33.png',
  'مانشستر يونايتد': 'https://media.api-sports.io/football/teams/33.png',
  tottenham: 'https://media.api-sports.io/football/teams/47.png',
  'توتنهام': 'https://media.api-sports.io/football/teams/47.png',
  'aston villa': 'https://media.api-sports.io/football/teams/66.png',
  'أستون فيلا': 'https://media.api-sports.io/football/teams/66.png',
  newcastle: 'https://media.api-sports.io/football/teams/34.png',
  'نيوكاسل': 'https://media.api-sports.io/football/teams/34.png',
  'bayern munich': 'https://media.api-sports.io/football/teams/157.png',
  'بايرن ميونخ': 'https://media.api-sports.io/football/teams/157.png',
  'borussia dortmund': 'https://media.api-sports.io/football/teams/165.png',
  'بوروسيا دورتموند': 'https://media.api-sports.io/football/teams/165.png',
  'bayer leverkusen': 'https://media.api-sports.io/football/teams/168.png',
  'باير ليفركوزن': 'https://media.api-sports.io/football/teams/168.png',
  'paris saint germain': 'https://media.api-sports.io/football/teams/85.png',
  psg: 'https://media.api-sports.io/football/teams/85.png',
  'باريس سان جيرمان': 'https://media.api-sports.io/football/teams/85.png',
  marseille: 'https://media.api-sports.io/football/teams/81.png',
  'مارسيليا': 'https://media.api-sports.io/football/teams/81.png',
  monaco: 'https://media.api-sports.io/football/teams/91.png',
  'موناكو': 'https://media.api-sports.io/football/teams/91.png',
  'inter milan': 'https://media.api-sports.io/football/teams/505.png',
  inter: 'https://media.api-sports.io/football/teams/505.png',
  'إنتر ميلان': 'https://media.api-sports.io/football/teams/505.png',
  milan: 'https://media.api-sports.io/football/teams/489.png',
  'ac milan': 'https://media.api-sports.io/football/teams/489.png',
  'ميلان': 'https://media.api-sports.io/football/teams/489.png',
  juventus: 'https://media.api-sports.io/football/teams/496.png',
  'يوفنتوس': 'https://media.api-sports.io/football/teams/496.png',
  napoli: 'https://media.api-sports.io/football/teams/492.png',
  'نابولي': 'https://media.api-sports.io/football/teams/492.png',
  roma: 'https://media.api-sports.io/football/teams/497.png',
  'روما': 'https://media.api-sports.io/football/teams/497.png',
  // Saudi Pro League (دوري روشن السعودي)
  'al hilal': 'https://media.api-sports.io/football/teams/2939.png',
  'الهلال': 'https://media.api-sports.io/football/teams/2939.png',
  'al nassr': 'https://media.api-sports.io/football/teams/2934.png',
  'النصر': 'https://media.api-sports.io/football/teams/2934.png',
  'al ittihad': 'https://media.api-sports.io/football/teams/2932.png',
  'الاتحاد': 'https://media.api-sports.io/football/teams/2932.png',
  'al ahli': 'https://media.api-sports.io/football/teams/2931.png',
  'al-ahli': 'https://media.api-sports.io/football/teams/2931.png',
  'al ahli saudi': 'https://media.api-sports.io/football/teams/2931.png',
  'الأهلي السعودي': 'https://media.api-sports.io/football/teams/2931.png',
  'al qadsiah': 'https://media.api-sports.io/football/teams/2938.png',
  'al-qadsiah': 'https://media.api-sports.io/football/teams/2938.png',
  'al quadisiya': 'https://media.api-sports.io/football/teams/2938.png',
  'al-quadisiya': 'https://media.api-sports.io/football/teams/2938.png',
  'al qadisiya': 'https://media.api-sports.io/football/teams/2938.png',
  'القادسية': 'https://media.api-sports.io/football/teams/2938.png',
  'al kholood': 'https://media.api-sports.io/football/teams/10291.png',
  'al-kholood': 'https://media.api-sports.io/football/teams/10291.png',
  'الخلود': 'https://media.api-sports.io/football/teams/10291.png',
  'al fateh': 'https://media.api-sports.io/football/teams/2935.png',
  'al-fateh': 'https://media.api-sports.io/football/teams/2935.png',
  'الفتح': 'https://media.api-sports.io/football/teams/2935.png',
  'al shabab': 'https://media.api-sports.io/football/teams/2930.png',
  'al-shabab': 'https://media.api-sports.io/football/teams/2930.png',
  'الشباب': 'https://media.api-sports.io/football/teams/2930.png',
  'al ettifaq': 'https://media.api-sports.io/football/teams/2937.png',
  'al-ettifaq': 'https://media.api-sports.io/football/teams/2937.png',
  'الاتفاق': 'https://media.api-sports.io/football/teams/2937.png',
  'al taawoun': 'https://media.api-sports.io/football/teams/2933.png',
  'al-taawoun': 'https://media.api-sports.io/football/teams/2933.png',
  'al taawon': 'https://media.api-sports.io/football/teams/2933.png',
  'التعاون': 'https://media.api-sports.io/football/teams/2933.png',
  'al khaleej': 'https://media.api-sports.io/football/teams/2945.png',
  'al-khaleej': 'https://media.api-sports.io/football/teams/2945.png',
  'الخليج': 'https://media.api-sports.io/football/teams/2945.png',
  'al okhdood': 'https://media.api-sports.io/football/teams/10286.png',
  'al-okhdood': 'https://media.api-sports.io/football/teams/10286.png',
  'al akhdoud': 'https://media.api-sports.io/football/teams/10286.png',
  'الأخدود': 'https://media.api-sports.io/football/teams/10286.png',
  'al wehda': 'https://media.api-sports.io/football/teams/2942.png',
  'al-wehda': 'https://media.api-sports.io/football/teams/2942.png',
  'الوحدة': 'https://media.api-sports.io/football/teams/2942.png',
  'al riyadh': 'https://media.api-sports.io/football/teams/10289.png',
  'al-riyadh': 'https://media.api-sports.io/football/teams/10289.png',
  'الرياض': 'https://media.api-sports.io/football/teams/10289.png',
  'al fayha': 'https://media.api-sports.io/football/teams/2941.png',
  'al-fayha': 'https://media.api-sports.io/football/teams/2941.png',
  'الفيحاء': 'https://media.api-sports.io/football/teams/2941.png',
  'al raed': 'https://media.api-sports.io/football/teams/2936.png',
  'al-raed': 'https://media.api-sports.io/football/teams/2936.png',
  'الرائد': 'https://media.api-sports.io/football/teams/2936.png',
  'damac': 'https://media.api-sports.io/football/teams/7760.png',
  'ضمك': 'https://media.api-sports.io/football/teams/7760.png',
  'al orubah': 'https://media.api-sports.io/football/teams/7766.png',
  'al-orubah': 'https://media.api-sports.io/football/teams/7766.png',
  'al orobah': 'https://media.api-sports.io/football/teams/7766.png',
  'العروبة': 'https://media.api-sports.io/football/teams/7766.png',
  'al diriyah': 'https://media.api-sports.io/football/teams/10287.png',
  'al-diriyah': 'https://media.api-sports.io/football/teams/10287.png',
  'الدرعية': 'https://media.api-sports.io/football/teams/10287.png',
  'al hazem': 'https://media.api-sports.io/football/teams/2944.png',
  'al-hazem': 'https://media.api-sports.io/football/teams/2944.png',
  'الحزم': 'https://media.api-sports.io/football/teams/2944.png',
  'al batin': 'https://media.api-sports.io/football/teams/2943.png',
  'الباطن': 'https://media.api-sports.io/football/teams/2943.png',
  'al tai': 'https://media.api-sports.io/football/teams/2946.png',
  'الطائي': 'https://media.api-sports.io/football/teams/2946.png',
  'abha': 'https://media.api-sports.io/football/teams/7762.png',
  'أبها': 'https://media.api-sports.io/football/teams/7762.png',

  // Moroccan Botola Pro (البطولة الوطنية الاحترافية)
  'wydad ac': 'https://media.api-sports.io/football/teams/1041.png',
  'wydad': 'https://media.api-sports.io/football/teams/1041.png',
  'الوداد': 'https://media.api-sports.io/football/teams/1041.png',
  'الوداد الرياضي': 'https://media.api-sports.io/football/teams/1041.png',
  'raja ca': 'https://media.api-sports.io/football/teams/1042.png',
  'raja': 'https://media.api-sports.io/football/teams/1042.png',
  'الرجاء': 'https://media.api-sports.io/football/teams/1042.png',
  'الرجاء الرياضي': 'https://media.api-sports.io/football/teams/1042.png',
  'far rabat': 'https://media.api-sports.io/football/teams/1040.png',
  'as far': 'https://media.api-sports.io/football/teams/1040.png',
  'الجيش الملكي': 'https://media.api-sports.io/football/teams/1040.png',
  'rs berkane': 'https://media.api-sports.io/football/teams/1047.png',
  'نهضة بركان': 'https://media.api-sports.io/football/teams/1047.png',
  'fus rabat': 'https://media.api-sports.io/football/teams/1045.png',
  'الفتح الرباطي': 'https://media.api-sports.io/football/teams/1045.png',
  'الفتح الرياضي': 'https://media.api-sports.io/football/teams/1045.png',
  'mas fes': 'https://media.api-sports.io/football/teams/1044.png',
  'المغرب الفاسي': 'https://media.api-sports.io/football/teams/1044.png',
  'irt tangier': 'https://media.api-sports.io/football/teams/1046.png',
  'ittihad tanger': 'https://media.api-sports.io/football/teams/1046.png',
  'اتحاد طنجة': 'https://media.api-sports.io/football/teams/1046.png',
  'husa agadir': 'https://media.api-sports.io/football/teams/1043.png',
  'hassania agadir': 'https://media.api-sports.io/football/teams/1043.png',
  'حسنية أكادير': 'https://media.api-sports.io/football/teams/1043.png',
  'ocs safi': 'https://media.api-sports.io/football/teams/1048.png',
  'olympic safi': 'https://media.api-sports.io/football/teams/1048.png',
  'أولمبيك آسفي': 'https://media.api-sports.io/football/teams/1048.png',
  'uts touarga': 'https://media.api-sports.io/football/teams/19875.png',
  'union touarga': 'https://media.api-sports.io/football/teams/19875.png',
  'اتحاد تواركة': 'https://media.api-sports.io/football/teams/19875.png',
  'dhj el jadida': 'https://media.api-sports.io/football/teams/1051.png',
  'difaa el jadidi': 'https://media.api-sports.io/football/teams/1051.png',
  'الدفاع الحسني الجديدي': 'https://media.api-sports.io/football/teams/1051.png',
  'mat tetouan': 'https://media.api-sports.io/football/teams/1049.png',
  'moghreb tetouan': 'https://media.api-sports.io/football/teams/1049.png',
  'المغرب التطواني': 'https://media.api-sports.io/football/teams/1049.png',
  'codm meknes': 'https://media.api-sports.io/football/teams/1053.png',
  'النادي المكناسي': 'https://media.api-sports.io/football/teams/1053.png',
  'jss soualem': 'https://media.api-sports.io/football/teams/17700.png',
  'js soualem': 'https://media.api-sports.io/football/teams/17700.png',
  'شباب السوالم': 'https://media.api-sports.io/football/teams/17700.png',
  'sccm mohammedia': 'https://media.api-sports.io/football/teams/1052.png',
  'chabab mohammedia': 'https://media.api-sports.io/football/teams/1052.png',
  'شباب المحمدية': 'https://media.api-sports.io/football/teams/1052.png',
  'rcaz zemamra': 'https://media.api-sports.io/football/teams/1054.png',
  'نهضة الزمامرة': 'https://media.api-sports.io/football/teams/1054.png',

  // Egyptian Premier League (الدوري المصري الممتاز)
  'al ahly': 'https://media.api-sports.io/football/teams/1032.png',
  'الأهلي': 'https://media.api-sports.io/football/teams/1032.png',
  'الأهلي المصري': 'https://media.api-sports.io/football/teams/1032.png',
  'zamalek': 'https://media.api-sports.io/football/teams/1033.png',
  'الزمالك': 'https://media.api-sports.io/football/teams/1033.png',
  'pyramids': 'https://media.api-sports.io/football/teams/1037.png',
  'بيراميدز': 'https://media.api-sports.io/football/teams/1037.png',
  'future fc': 'https://media.api-sports.io/football/teams/17926.png',
  'مودرن سبورت': 'https://media.api-sports.io/football/teams/17926.png',
  'al masry': 'https://media.api-sports.io/football/teams/1035.png',
  'المصري': 'https://media.api-sports.io/football/teams/1035.png',
  'ismaily': 'https://media.api-sports.io/football/teams/1034.png',
  'الإسماعيلي': 'https://media.api-sports.io/football/teams/1034.png',
  'smouha': 'https://media.api-sports.io/football/teams/1036.png',
  'سموحة': 'https://media.api-sports.io/football/teams/1036.png',
  'enppi': 'https://media.api-sports.io/football/teams/1038.png',
  'إنبي': 'https://media.api-sports.io/football/teams/1038.png',
  'zed fc': 'https://media.api-sports.io/football/teams/1039.png',
  'زد': 'https://media.api-sports.io/football/teams/1039.png',

  // Other Top Arab Clubs
  'esperance': 'https://media.api-sports.io/football/teams/1050.png',
  'الترجي': 'https://media.api-sports.io/football/teams/1050.png',
  'الترجي التونسي': 'https://media.api-sports.io/football/teams/1050.png',
  'club africain': 'https://media.api-sports.io/football/teams/1055.png',
  'النادي الإفريقي': 'https://media.api-sports.io/football/teams/1055.png',
  'etoile du sahel': 'https://media.api-sports.io/football/teams/1056.png',
  'النجم الساحلي': 'https://media.api-sports.io/football/teams/1056.png',
  'al sadd': 'https://media.api-sports.io/football/teams/2947.png',
  'السد': 'https://media.api-sports.io/football/teams/2947.png',
  'al duhail': 'https://media.api-sports.io/football/teams/2948.png',
  'الدحيل': 'https://media.api-sports.io/football/teams/2948.png',
  'al ain': 'https://media.api-sports.io/football/teams/2949.png',
  'العين': 'https://media.api-sports.io/football/teams/2949.png',
  'shabab al ahli': 'https://media.api-sports.io/football/teams/2950.png',
  'شباب الأهلي': 'https://media.api-sports.io/football/teams/2950.png',
  'al jazira': 'https://media.api-sports.io/football/teams/2951.png',
  'الجزيرة': 'https://media.api-sports.io/football/teams/2951.png',
};

/**
 * Resolves the cleanest, high-res badge or country flag for a team.
 * Never returns empty or ui-avatars fallback when real data is inferable.
 */
export function resolveTeamBadge(teamObj: any, teamName: string, country?: string): string {
  // 1. Direct ESPN Logos array check
  if (teamObj?.logos && Array.isArray(teamObj.logos) && teamObj.logos.length > 0) {
    const defaultLogo =
      teamObj.logos.find((l: any) => l?.rel?.includes('default')) ||
      teamObj.logos.find((l: any) => l?.rel?.includes('full')) ||
      teamObj.logos[0];
    if (defaultLogo?.href && typeof defaultLogo.href === 'string' && defaultLogo.href.startsWith('http')) {
      return defaultLogo.href;
    }
  }

  // 2. Direct string logo (filter out ui-avatars)
  if (
    teamObj?.logo &&
    typeof teamObj.logo === 'string' &&
    teamObj.logo.startsWith('http') &&
    !teamObj.logo.includes('ui-avatars.com') &&
    !teamObj.logo.includes('placeholder')
  ) {
    return teamObj.logo;
  }

  // 3. ESPN Country Slug / Abbreviation check
  const slug = (teamObj?.slug || '').toLowerCase().trim();
  const abbr = (teamObj?.abbreviation || '').toLowerCase().trim();
  if (slug && slug.length === 3 && /^[a-z]{3}$/.test(slug)) {
    return `https://a.espncdn.com/i/teamlogos/countries/500/${slug}.png`;
  }
  if (abbr && abbr.length === 3 && /^[a-z]{3}$/.test(abbr)) {
    return `https://a.espncdn.com/i/teamlogos/countries/500/${abbr}.png`;
  }

  // 4. Exact or substring match in national country flags
  const cleanName = (teamName || '').toLowerCase().trim();
  if (COUNTRY_CODES[cleanName]) {
    const c = COUNTRY_CODES[cleanName];
    return `https://a.espncdn.com/i/teamlogos/countries/500/${c.espn}.png`;
  }

  for (const [key, val] of Object.entries(COUNTRY_CODES)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return `https://a.espncdn.com/i/teamlogos/countries/500/${val.espn}.png`;
    }
  }

  // 5. Exact or substring match in verified clubs
  if (VERIFIED_CLUB_LOGOS[cleanName]) {
    return VERIFIED_CLUB_LOGOS[cleanName];
  }
  for (const [key, val] of Object.entries(VERIFIED_CLUB_LOGOS)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return val;
    }
  }

  // 6. Numeric ESPN club id
  const numericId = Number(teamObj?.id);
  if (numericId && numericId > 0 && numericId < 100000) {
    return `https://a.espncdn.com/i/teamlogos/soccer/500/${numericId}.png`;
  }

  // 7. If country is provided and matches a nation flag
  if (country) {
    const cleanCountry = country.toLowerCase().trim();
    if (COUNTRY_CODES[cleanCountry]) {
      return `https://a.espncdn.com/i/teamlogos/countries/500/${COUNTRY_CODES[cleanCountry].espn}.png`;
    }
  }

  // Fallback to high-quality soccer icon (not text avatars)
  return 'https://a.espncdn.com/i/leaguelogos/soccer/500/53.png';
}
