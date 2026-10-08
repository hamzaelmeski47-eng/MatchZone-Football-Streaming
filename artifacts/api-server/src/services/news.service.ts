import crypto from "node:crypto";
import { logger } from "../lib/logger";

export interface LiveNewsArticle {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  excerpt: string;
  content: string[];
  imageUrl: string;
  source: string;
  sourceUrl: string;
  pubDate: string;
  timeAgo: string;
  readTime: string;
  tags: string[];
  isFeatured?: boolean;
}

interface CacheEntry {
  timestamp: number;
  data: LiveNewsArticle[];
}

const newsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cleanHtmlTags(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8217;/g, "’")
    .replace(/&apos;/g, "'")
    .replace(/The post.*appeared first.*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatArabicTimeAgo(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 5) return "الآن";
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return "منذ ساعة";
    if (diffHours === 2) return "منذ ساعتين";
    if (diffHours < 11) return `منذ ${diffHours} ساعات`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "أمس";
    if (diffDays === 2) return "منذ يومين";
    return `منذ ${diffDays} أيام`;
  } catch {
    return "اليوم";
  }
}

/**
 * Fetch Hespress Sport items with real news photos
 */
async function fetchHespressSport(): Promise<LiveNewsArticle[]> {
  try {
    const res = await fetch("https://www.hespress.com/sport/feed", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const items = xml.split("<item>").slice(1);
    const articles: LiveNewsArticle[] = [];

    for (const item of items) {
      const title =
        item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
        item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ||
        "";
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
      const img =
        item.match(/<media:content[^>]+url="([^">]+)"/i)?.[1] ||
        item.match(/<enclosure[^>]+url="([^">]+)"/i)?.[1] ||
        item.match(/<media:thumbnail[^>]+url="([^">]+)"/i)?.[1] ||
        "";

      if (!title || !link) continue;

      const desc =
        item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
        item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ||
        "";
      const cleanDesc = cleanHtmlTags(desc);

      const contentMatch = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1] || "";
      const paragraphs = contentMatch
        ? contentMatch
            .split("</p>")
            .map((p) => cleanHtmlTags(p))
            .filter((p) => p.length > 25)
        : cleanDesc
        ? [cleanDesc]
        : [];

      const tagMatches = [...item.matchAll(/<category><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g)].map((m) => m[1]);
      const hash = crypto.createHash("md5").update(link || title).digest("hex").slice(0, 16);
      const id = `hespress-${hash}`;

      articles.push({
        id,
        title: cleanHtmlTags(title),
        category: "رياضة ومستجدات",
        categorySlug: "all",
        excerpt: cleanDesc ? cleanDesc.slice(0, 180) + "..." : cleanHtmlTags(title),
        content: paragraphs.length > 0 ? paragraphs : [cleanDesc || cleanHtmlTags(title)],
        imageUrl: img.trim() || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
        source: "هسبريس الرياضية",
        sourceUrl: link.trim(),
        pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        timeAgo: formatArabicTimeAgo(pubDate),
        readTime: "3 دقائق قراءة",
        tags: tagMatches.length > 0 ? tagMatches.slice(0, 5) : ["كرة القدم", "رياضة المغرب والعالم"],
      });
    }
    return articles;
  } catch (err: any) {
    logger.debug({ error: err.message }, "Hespress feed fetch timed out or failed");
    return [];
  }
}

/**
 * Categorization rules mapping keywords to categories
 */
const CATEGORY_KEYWORDS: Record<string, { label: string; keywords: string[] }> = {
  champions: {
    label: "دوري أبطال أوروبا",
    keywords: [
      "أبطال أوروبا",
      "دوري الأبطال",
      "تشامبيونز",
      "تشامبيونزليغ",
      "ريال مدريد",
      "برشلونة",
      "بايرن",
      "باريس سان جيرمان",
      "مانشستر سيتي",
      "إنتر",
      "ميلان",
      "أرسنال",
      "يوفنتوس",
      "أتلتيكو",
      "أوروبا",
    ],
  },
  premier: {
    label: "الدوري الإنجليزي",
    keywords: [
      "الدوري الإنجليزي",
      "البريميرليغ",
      "ليفربول",
      "مانشستر يونايتد",
      "مانشستر سيتي",
      "أرسنال",
      "تشيلسي",
      "توتنهام",
      "نيوكاسل",
      "أستون فيلا",
      "صلاح",
      "غوارديولا",
    ],
  },
  laliga: {
    label: "الدوري الإسباني",
    keywords: [
      "الدوري الإسباني",
      "الليغا",
      "ريال مدريد",
      "برشلونة",
      "أتلتيكو مدريد",
      "مبابي",
      "فينيسيوس",
      "بيلينغهام",
      "لامين يامال",
      "كلاسيكو",
    ],
  },
  transfers: {
    label: "سوق الانتقالات",
    keywords: [
      "انتقال",
      "انتقالات",
      "ميركاتو",
      "صفقة",
      "صفقات",
      "تعاقد",
      "ضم",
      "عقد",
      "رحيل",
      "يوقع",
      "تجديد",
      "مفاوضات",
    ],
  },
  international: {
    label: "المنتخبات والكرة العربية",
    keywords: [
      "المغرب",
      "المنتخب",
      "أسود الأطلس",
      "الركراكي",
      "حكيمي",
      "بونو",
      "دياز",
      "كأس أمم",
      "كأس العالم",
      "مونديال",
      "أفريقيا",
      "تصفيات",
      "الجزائر",
      "مصر",
      "تونس",
      "السعودية",
    ],
  },
};

/**
 * Fetch genuine raw items from live feeds only (no demo/mock articles)
 */
async function fetchAllRawArticles(): Promise<LiveNewsArticle[]> {
  const feedResults = await Promise.allSettled([fetchHespressSport()]);
  const liveItems: LiveNewsArticle[] = [];

  for (const r of feedResults) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      liveItems.push(...r.value);
    }
  }

  // Deduplicate by title similarity
  const seen = new Set<string>();
  const unique: LiveNewsArticle[] = [];

  for (const art of liveItems) {
    const key = art.title.replace(/[\s\-_،.]+/g, "").slice(0, 24);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(art);
    }
  }

  unique.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return unique;
}

/**
 * Main public entrypoint for live news (pure real articles, no demo data)
 */
export async function getLiveFootballNews(category = "all"): Promise<LiveNewsArticle[]> {
  const catSlug = category.toLowerCase().trim() || "all";
  const cacheKey = `genuine_news_${catSlug}`;

  const cached = newsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.data.length > 0) {
    return cached.data;
  }

  const allArticles = await fetchAllRawArticles();

  let filtered: LiveNewsArticle[] = [];

  if (catSlug === "all") {
    filtered = allArticles;
  } else {
    const rule = CATEGORY_KEYWORDS[catSlug];
    if (rule) {
      filtered = allArticles.filter((art) => {
        if (art.categorySlug === catSlug) return true;
        const text = (art.title + " " + art.excerpt + " " + art.tags.join(" ")).toLowerCase();
        return rule.keywords.some((kw) => text.includes(kw.toLowerCase()));
      });

      filtered = filtered.map((a) => ({
        ...a,
        category: rule.label,
        categorySlug: catSlug,
      }));
    } else {
      filtered = allArticles;
    }
  }

  // Mark first article as featured
  if (filtered.length > 0) {
    filtered[0].isFeatured = true;
  }

  if (filtered.length > 0) {
    newsCache.set(cacheKey, {
      timestamp: Date.now(),
      data: filtered,
    });
  }

  return filtered;
}

/**
 * Retrieve a specific news article by ID
 */
export async function getNewsArticleById(id: string): Promise<LiveNewsArticle | null> {
  const articles = await getLiveFootballNews("all");
  return articles.find((art) => art.id === id) || null;
}
