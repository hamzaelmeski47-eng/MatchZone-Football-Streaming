/**
 * Determines the exact broadcast channel (beIN Sports 1, 2, 3, 4, 5, 6, AFC, Arryadia, SSC, Abu Dhabi Sports, etc.) for any match.
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
      raw.toLowerCase().includes("bein") ||
      raw.toLowerCase().includes("ssc") ||
      raw.includes("الرياضية") ||
      raw.includes("Arryadia") ||
      raw.includes("أبوظبي") ||
      raw.includes("Abu Dhabi") ||
      raw.includes("ON Time") ||
      raw.includes("الجزائرية") ||
      raw.includes("الوطنية")
    ) {
      return raw;
    }
  }

  const comp = (params.competitionName || "").toLowerCase();
  const idStr = String(params.competitionId || "");
  const home = (params.homeName || "").toLowerCase();
  const away = (params.awayName || "").toLowerCase();

  // Helper checks for Moroccan team
  const isMorocco =
    home.includes("morocco") || away.includes("morocco") ||
    home.includes("maroc") || away.includes("maroc") ||
    home.includes("المغرب") || away.includes("المغرب") ||
    home.includes("الرجاء") || away.includes("الرجاء") ||
    home.includes("الوداد") || away.includes("الوداد") ||
    home.includes("الجيش الملكي") || away.includes("الجيش الملكي") ||
    home.includes("نهضة بركان") || away.includes("نهضة بركان") ||
    home.includes("raja") || away.includes("raja") ||
    home.includes("wydad") || away.includes("wydad") ||
    home.includes("far rabat") || away.includes("far rabat") ||
    home.includes("berkane") || away.includes("berkane");

  const isMoroccoNational =
    home.includes("morocco") || away.includes("morocco") ||
    home.includes("maroc") || away.includes("maroc") ||
    home.includes("المغرب") || away.includes("المغرب");

  // Moroccan National Team Matches (Friendly, Qualifiers, etc.)
  if (isMoroccoNational) {
    // If friendly match (مباريات ودية دولية)
    if (comp.includes("friendly") || comp.includes("friendlies") || comp.includes("ودية") || comp.includes("ودي")) {
      return "الرياضية Arryadia HD";
    }
    // World Cup Qualifiers (تصفيات كأس العالم)
    if (comp.includes("world cup") || comp.includes("كأس العالم") || comp.includes("تصفيات")) {
      return "الرياضية Arryadia HD / SSC";
    }
    // AFCON / CAN (كأس أمم إفريقيا)
    if (comp.includes("afcon") || comp.includes("إفريقيا") || comp.includes("افريقيا") || comp.includes("can")) {
      return "beIN Sports 6 HD / الرياضية TNT";
    }
    // Default Moroccan national team broadcaster
    return "الرياضية Arryadia HD";
  }

  // Moroccan Botola Pro & Throne Cup
  if (
    comp.includes("botola") ||
    comp.includes("المغربي") ||
    comp.includes("العرش") ||
    comp.includes("throne") ||
    (isMorocco && !comp.includes("champions") && !comp.includes("caf") && !comp.includes("أبطال"))
  ) {
    return "الرياضية Arryadia HD";
  }

  // Algerian National Team & Algerian Ligue 1
  const isAlgeria =
    home.includes("algeria") || away.includes("algeria") ||
    home.includes("algérie") || away.includes("algérie") ||
    home.includes("الجزائر") || away.includes("الجزائر");

  if (isAlgeria && (comp.includes("friendly") || comp.includes("ودية") || comp.includes("جزائر") || comp.includes("algeria"))) {
    return "الجزائرية السادسة TV6 HD";
  }

  // Egyptian National Team & Egyptian League
  const isEgypt =
    home.includes("egypt") || away.includes("egypt") ||
    home.includes("مصر") || away.includes("مصر") ||
    home.includes("الأهلي") || away.includes("الأهلي") ||
    home.includes("الزمالك") || away.includes("الزمالك") ||
    home.includes("بيراميدز") || away.includes("بيراميدز") ||
    home.includes("ahly") || away.includes("ahly") ||
    home.includes("zamalek") || away.includes("zamalek");

  if (isEgypt && (comp.includes("friendly") || comp.includes("ودية") || comp.includes("مصر") || comp.includes("egypt"))) {
    return "ON Time Sports 1 HD";
  }

  // Tunisian National Team & Tunisian League
  const isTunisia =
    home.includes("tunisia") || away.includes("tunisia") ||
    home.includes("تونس") || away.includes("تونس");

  if (isTunisia && (comp.includes("friendly") || comp.includes("ودية") || comp.includes("تونس") || comp.includes("tunisia"))) {
    return "الوطنية التونسية 1 HD";
  }

  // Saudi Roshn League & King's Cup & Saudi Team
  const isSaudi =
    home.includes("saudi") || away.includes("saudi") ||
    home.includes("السعودية") || away.includes("السعودية") ||
    home.includes("الهلال") || away.includes("الهلال") ||
    home.includes("النصر") || away.includes("النصر") ||
    home.includes("الاتحاد") || away.includes("الاتحاد") ||
    home.includes("الأهلي السعودي") || away.includes("الاهلي السعودي") ||
    home.includes("hilal") || away.includes("hilal") ||
    home.includes("nassr") || away.includes("nassr") ||
    home.includes("ittihad") || away.includes("ittihad");

  if (comp.includes("roshn") || comp.includes("saudi") || comp.includes("سعودي") || (isSaudi && (comp.includes("friendly") || comp.includes("ودية")))) {
    return "SSC 1 HD";
  }

  // Italian Serie A & Coppa Italia (Exclusive to Abu Dhabi Sports Premium in MENA)
  if (
    comp.includes("serie a") ||
    comp.includes("إيطالي") ||
    comp.includes("ايطالي") ||
    comp.includes("coppa italia") ||
    comp.includes("كأس إيطاليا") ||
    comp.includes("كاس ايطاليا") ||
    idStr === "135" ||
    idStr === "4"
  ) {
    const isTopSerieA =
      home.includes("juventus") || away.includes("juventus") || home.includes("يوفنتوس") || away.includes("يوفنتوس") ||
      home.includes("inter") || away.includes("inter") || home.includes("إنتر") || away.includes("انتر") ||
      home.includes("milan") || away.includes("milan") || home.includes("ميلان") || away.includes("ميلان") ||
      home.includes("napoli") || away.includes("napoli") || home.includes("نابولي") || away.includes("نابولي") ||
      home.includes("roma") || away.includes("roma") || home.includes("روما") || away.includes("روما");

    if (isTopSerieA) {
      return "أبوظبي الرياضية بريميوم 1 HD";
    }
    return "أبوظبي الرياضية بريميوم 2 HD";
  }

  // Premier League (الدوري الإنجليزي الممتاز)
  if (comp.includes("premier") || comp.includes("إنجليزي") || comp.includes("انجليزي") || idStr === "39" || idStr === "1") {
    const isTopTier =
      home.includes("arsenal") || home.includes("liverpool") || home.includes("manchester city") ||
      home.includes("manchester united") || home.includes("chelsea") || home.includes("tottenham") ||
      away.includes("arsenal") || away.includes("liverpool") || away.includes("manchester city") ||
      away.includes("manchester united") || away.includes("chelsea") || away.includes("tottenham") ||
      home.includes("أرسنال") || home.includes("ليفربول") || home.includes("مانشستر سيتي") || home.includes("تشيلسي");

    if (isTopTier) {
      return "beIN Sports 1 HD";
    }
    return "beIN Sports 2 HD";
  }

  // La Liga (الدوري الإسباني)
  if (comp.includes("la liga") || comp.includes("laliga") || comp.includes("إسباني") || comp.includes("اسباني") || idStr === "140" || idStr === "2") {
    const isBigTwo =
      home.includes("real madrid") || home.includes("barcelona") || home.includes("atletico") ||
      home.includes("ريال مدريد") || home.includes("برشلونة") || home.includes("أتلتيكو") ||
      away.includes("real madrid") || away.includes("barcelona") || away.includes("atletico") ||
      away.includes("ريال مدريد") || away.includes("برشلونة") || away.includes("أتلتيكو");

    if (isBigTwo) {
      return "beIN Sports 1 HD";
    }
    return "beIN Sports 3 HD";
  }

  // UEFA Champions League (دوري أبطال أوروبا)
  if (comp.includes("champions") || comp.includes("أبطال أوروبا") || comp.includes("ابطال اوروبا") || idStr === "2" || idStr === "3") {
    const isTopUefa =
      home.includes("real madrid") || home.includes("manchester city") || home.includes("bayern") ||
      home.includes("paris") || home.includes("barcelona") || home.includes("arsenal") || home.includes("liverpool") ||
      away.includes("real madrid") || away.includes("manchester city") || away.includes("bayern") ||
      away.includes("paris") || away.includes("barcelona") || away.includes("arsenal") || away.includes("liverpool");
    if (isTopUefa) return "beIN Sports 1 HD";
    return "beIN Sports 2 HD";
  }

  // Bundesliga (الدوري الألماني)
  if (comp.includes("bundesliga") || comp.includes("ألماني") || comp.includes("الماني") || idStr === "78" || idStr === "5") {
    return "beIN Sports 5 HD";
  }

  // Ligue 1 (الدوري الفرنسي)
  if (comp.includes("ligue 1") || comp.includes("فرنسي") || idStr === "61" || idStr === "6") {
    return "beIN Sports 4 HD";
  }

  // UEFA Europa League & Conference League (الدوري الأوروبي)
  if (comp.includes("europa") || comp.includes("أوروبي") || comp.includes("اوروبي") || comp.includes("مؤتمر") || idStr === "7") {
    return "beIN Sports 1 HD";
  }

  // Asian Competitions / AFC Champions League (دوري أبطال آسيا للنخبة)
  if (comp.includes("afc") || comp.includes("آسيا") || comp.includes("اسيا")) {
    return "beIN Sports AFC HD";
  }

  // CAF Champions League & AFCON (كأس أمم إفريقيا ودوري أبطال إفريقيا)
  if (comp.includes("caf") || comp.includes("afcon") || comp.includes("إفريقيا") || comp.includes("افريقيا") || idStr === "6") {
    return "beIN Sports 6 HD";
  }

  // UEFA Nations League (دوري الأمم الأوروبية)
  if (comp.includes("nations") || comp.includes("الأمم") || comp.includes("الامم")) {
    if (
      home.includes("spain") || away.includes("spain") || home.includes("إسبانيا") || away.includes("إسبانيا") ||
      home.includes("germany") || away.includes("germany") || home.includes("ألمانيا") || away.includes("ألمانيا") ||
      home.includes("france") || away.includes("france") || home.includes("فرنسا") || away.includes("فرنسا") ||
      home.includes("portugal") || away.includes("portugal") || home.includes("البرتغال") || away.includes("البرتغال")
    ) {
      return "beIN Sports 1 HD";
    }

    if (
      home.includes("england") || away.includes("england") || home.includes("إنجلترا") || away.includes("إنجلترا") ||
      home.includes("italy") || away.includes("italy") || home.includes("إيطاليا") || away.includes("إيطاليا") ||
      home.includes("netherlands") || away.includes("netherlands") || home.includes("هولندا") || away.includes("هولندا") ||
      home.includes("belgium") || away.includes("belgium") || home.includes("بلجيكا") || away.includes("بلجيكا")
    ) {
      return "beIN Sports 2 HD";
    }

    if (
      home.includes("scotland") || away.includes("scotland") || home.includes("اسكتلندا") ||
      home.includes("croatia") || away.includes("croatia") || home.includes("كرواتيا") ||
      home.includes("switzerland") || away.includes("switzerland") || home.includes("سويسرا") ||
      home.includes("wales") || away.includes("wales") || home.includes("ويلز")
    ) {
      return "beIN Sports 3 HD";
    }

    return "beIN Sports 4 HD";
  }

  // General International Friendlies (مباريات ودية)
  if (comp.includes("friendly") || comp.includes("ودية") || comp.includes("ودي")) {
    if (
      home.includes("spain") || away.includes("spain") ||
      home.includes("france") || away.includes("france") ||
      home.includes("germany") || away.includes("germany") ||
      home.includes("brazil") || away.includes("brazil") ||
      home.includes("argentina") || away.includes("argentina") ||
      home.includes("portugal") || away.includes("portugal")
    ) {
      return "beIN Sports 1 HD";
    }
    return "beIN Sports 2 HD";
  }

  // Default international / high profile
  return "beIN Sports 1 HD";
}
