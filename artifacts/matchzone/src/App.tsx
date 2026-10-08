import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock,
  Heart,
  Info,
  KeyRound,
  LockKeyhole,
  Mail,
  Radio,
  RefreshCw,
  Shield,
  Target,
  Trophy,
  UserRound,
  Users,
  Zap,
  Star,
  Newspaper,
  Flame,
  BookOpen,
  Share2,
  Eye,
  EyeOff,
  Search,
  X as CloseIcon,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Tv,
  MapPin,
  Mic,
} from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Match, Competition } from '@/lib/mock-data';
import { useAuth, useMatchZoneData } from '@/lib/app-state';
import {
  AppShell,
  Button,
  CompetitionCard,
  EmptyState,
  LiveMatchCard,
  LoadingSkeleton,
  MatchCard,
  TeamCard,
  Toast,
  useFavorites,
} from '@/components/matchzone-components';
import { HlsPlayer } from '@/components/HlsPlayer';
import { IframePlayer } from '@/components/IframePlayer';
import { LiveSources } from '@/components/LiveSources';
import { AuthRequiredModal } from '@/components/AuthRequiredModal';
import { ArticleReader, cacheArticleForNavigation, getCachedArticle } from '@/components/ArticleReader';
import { formatCompetitionInfo, normalizeCompetitionName, resolveTeamLogo, resolveMatchBroadcaster } from '@/lib/competitions-map';
import {
  resolveMatchStadium,
  resolveMatchCommentator,
  isBrazilianMatch,
  parseMatchGoalScorers,
  getTeamRecentForm,
  getPreMatchH2H,
} from '@/lib/match-details-helpers';
import { AdminStreamsPage } from '@/pages/AdminStreamsPage';
import { SplashScreen } from '@/components/SplashScreen';
import { SUPPORTED_COMPETITIONS } from '@/lib/competitions.config';
import {
  loadCompetitionStandings,
  loadRealMatchEvents,
  loadRealMatchLineups,
  loadRealMatchStatistics,
  loadAuthorizedStream,
  loadLiveSources,
  loadRealMatchDetails,
  loadFixturesByDate,
  normalizeApiFootballFixture,
  formatMatchMinute,
  loadLiveFootballNews,
  loadSingleNewsArticle,
  type LiveNewsArticle,
  type ApiMatchEvent,
  type ApiMatchLineup,
  type ApiMatchStatistic,
  type AuthorizedStream,
  type StandingEntry,
  type StreamServer,
  getMoroccoDateOnly,
  getMoroccoDaysList,
  isMatchToday,
} from '@/lib/api';
import {
  getArabicCompetitionName,
  getArabicCountryName,
  getArabicRound,
  getArabicTeamName,
} from '@/lib/arabic-helpers';

function PageHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="content-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <CircleAlert size={22} style={{ color: '#DC2626', flexShrink: 0 }} />
        <div>
          <b style={{ color: '#991B1B', fontSize: 14, display: 'block' }}>تعذر تحميل بيانات المباريات</b>
          <p style={{ color: '#B91C1C', fontSize: 13, margin: '2px 0 0' }}>{message}</p>
        </div>
      </div>
      <button onClick={onRetry} className="btn btn-secondary" style={{ flexShrink: 0 }}>
        <RefreshCw size={14} /> إعادة المحاولة
      </button>
    </div>
  );
}

// ============================================================
// NEWS DATA & REUSABLE COMPONENTS
// ============================================================

interface FootballNewsItem {
  id: string;
  title: string;
  category: string;
  categorySlug: 'champions' | 'premier' | 'laliga' | 'transfers' | 'international';
  excerpt: string;
  content: string[];
  imageUrl: string;
  timeAgo: string;
  readTime: string;
  isBreaking?: boolean;
  isFeatured?: boolean;
  tags: string[];
}

const FOOTBALL_NEWS_DATA: FootballNewsItem[] = [];

function NewsCardItem({
  article,
  onClick,
}: {
  article: LiveNewsArticle;
  onClick: () => void;
}) {
  return (
    <article
      key={article.id}
      className="news-card"
      onClick={onClick}
      data-testid={`card-news-${article.id}`}
    >
      <div className="news-card-img-wrap">
        <img src={article.imageUrl} alt={article.title} className="news-card-img" />
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, display: 'flex', gap: 6 }}>
          <span
            className="news-badge"
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.15)',
            }}
          >
            {article.category}
          </span>
        </div>
      </div>
      <div className="news-card-body">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            fontSize: 12,
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          <span style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>{article.source}</span>
          <span>{article.timeAgo}</span>
        </div>
        <h3 className="news-card-title">{article.title}</h3>
        <p className="news-card-excerpt">{article.excerpt}</p>
        <div className="news-card-footer">
          <span>{article.readTime}</span>
          <span className="news-read-btn">
            <BookOpen size={14} /> قراءة المزيد
          </span>
        </div>
      </div>
    </article>
  );
}


function NewsArticlePage() {
  const { id = '' } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const decodedId = decodeURIComponent(id || '');
  const [article, setArticle] = useState<LiveNewsArticle | null>(() => getCachedArticle(decodedId));
  const [loading, setLoading] = useState(() => !getCachedArticle(decodedId));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    let isMounted = true;

    const cached = getCachedArticle(decodedId);
    if (cached) {
      setArticle(cached);
      setLoading(false);
      return;
    }

    setLoading(true);

    loadSingleNewsArticle(decodedId)
      .then((item) => {
        if (!isMounted) return;
        if (item) {
          setArticle(item);
          return;
        }
        return loadLiveFootballNews('all').then((items) => {
          if (!isMounted) return;
          const found = items.find((a) => String(a.id) === decodedId);
          setArticle(found || null);
        });
      })
      .catch(() => {
        if (isMounted) {
          setArticle(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [decodedId]);

  if (loading) {
    return (
      <div className="page-frame" style={{ maxWidth: 1060, margin: '0 auto', paddingTop: 20 }}>
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="page-frame">
        <EmptyState
          icon={<Newspaper size={24} />}
          title="المقال غير متوفر"
          copy="المقال المطلوب غير موجود أو تم نقله."
          action={<Link href="/news" className="btn btn-primary">تصفح الأخبار</Link>}
        />
      </div>
    );
  }

  return (
    <div className="page-frame" style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 16px 60px' }}>
      <ArticleReader article={article} onBack={() => setLocation('/news')} />
    </div>
  );
}

function normalizeMatchTeamName(name: string): string {
  const arabic = getArabicTeamName(name || '');
  let s = (arabic || name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\u0600-\u06FF]/g, '')
    .replace(/^(fc|cf|sc|ac|fk|sk|cd|ca|as)/g, '')
    .replace(/(fc|cf|sc|ac|fk|sk|cd|ca|as)$/g, '')
    .trim();

  if (
    s === 'usa' ||
    s === 'unitedstates' ||
    s === 'usmnt' ||
    s === 'الولاياتالمتحدة' ||
    s === 'الولاياتالمتحدةالامريكية' ||
    s === 'امريكا'
  ) {
    return 'usa';
  }
  if (s.includes('papuanewguinea') || s.includes('بابوا')) return 'papuanewguinea';
  if (s.includes('solomonislands') || s.includes('جزرسليمان')) return 'solomonislands';
  if (s.includes('southkorea') || s.includes('korearepublic') || s.includes('كوريالجنوبية')) return 'southkorea';
  if (s.includes('northkorea') || s.includes('koreadpr') || s.includes('كوريالشمالية')) return 'northkorea';
  if (s.includes('ivorycoast') || s.includes('cotedivoire') || s.includes('ساحلالعاج')) return 'ivorycoast';
  if (s.includes('drcongo') || s.includes('congodr') || s.includes('جمهوريةالكونغو')) return 'drcongo';
  if (s.includes('capeverde') || s.includes('caboverde') || s.includes('الراسالاخضر')) return 'capeverde';
  if (s.includes('czech') || s.includes('التشيك')) return 'czechia';
  if (s.includes('uae') || s.includes('unitedarabemirates') || s.includes('الامارات')) return 'uae';
  if (s.includes('saudi') || s.includes('السعودية')) return 'saudiarabia';
  if (s.includes('chile') || s.includes('تشيلي')) return 'chile';
  if (s.includes('mexico') || s.includes('المكسيك')) return 'mexico';
  if (s.includes('peru') || s.includes('بيرو')) return 'peru';
  if (s.includes('argentina') || s.includes('الارجنتين')) return 'argentina';
  if (s.includes('brazil') || s.includes('البرازيل')) return 'brazil';
  if (s.includes('colombia') || s.includes('كولومبيا')) return 'colombia';
  if (s.includes('uruguay') || s.includes('اوروغواي')) return 'uruguay';
  if (s.includes('paraguay') || s.includes('باراغواي')) return 'paraguay';
  if (s.includes('bolivia') || s.includes('بوليفيا')) return 'bolivia';
  if (s.includes('venezuela') || s.includes('فنزويلا')) return 'venezuela';
  if (s.includes('ecuador') || s.includes('الاكوادور')) return 'ecuador';
  if (s.includes('morocco') || s.includes('المغرب')) return 'morocco';
  if (s.includes('egypt') || s.includes('مصر')) return 'egypt';
  if (s.includes('algeria') || s.includes('الجزائر')) return 'algeria';
  if (s.includes('tunisia') || s.includes('تونس')) return 'tunisia';
  if (s.includes('spain') || s.includes('اسبانيا')) return 'spain';
  if (s.includes('france') || s.includes('فرنسا')) return 'france';
  if (s.includes('germany') || s.includes('المانيا')) return 'germany';
  if (s.includes('italy') || s.includes('ايطاليا')) return 'italy';
  if (s.includes('england') || s.includes('انجلترا')) return 'england';
  if (s.includes('portugal') || s.includes('البرتغال')) return 'portugal';
  if (s.includes('netherlands') || s.includes('holland') || s.includes('هولندا')) return 'netherlands';
  if (s.includes('belgium') || s.includes('بلجيكا')) return 'belgium';
  if (s.includes('croatia') || s.includes('كرواتيا')) return 'croatia';
  if (s.includes('turkey') || s.includes('turkiye') || s.includes('türkiye') || s.includes('تركيا')) return 'turkey';
  if (s.includes('bosnia') || s.includes('البوسنة')) return 'bosnia';
  if (s.includes('ireland') || s.includes('ايرلندا') || s.includes('أيرلندا')) {
    if (s.includes('northern') || s.includes('الشمالية')) return 'northernireland';
    return 'ireland';
  }
  if (s.includes('slovakia') || s.includes('سلوفاكيا')) return 'slovakia';
  if (s.includes('slovenia') || s.includes('سلوفينيا')) return 'slovenia';
  if (s.includes('sweden') || s.includes('السويد')) return 'sweden';
  if (s.includes('poland') || s.includes('بولندا')) return 'poland';
  if (s.includes('ukraine') || s.includes('اوكرانيا') || s.includes('أوكرانيا')) return 'ukraine';
  if (s.includes('romania') || s.includes('رومانيا')) return 'romania';
  if (s.includes('moldova') || s.includes('مولدوفا')) return 'moldova';
  if (s.includes('kazakhstan') || s.includes('كازاخستان')) return 'kazakhstan';
  if (s.includes('cyprus') || s.includes('قبرص')) return 'cyprus';
  if (s.includes('armenia') || s.includes('ارمينيا') || s.includes('أرمينيا')) return 'armenia';
  if (s.includes('latvia') || s.includes('لاتفيا')) return 'latvia';
  if (s.includes('montenegro') || s.includes('الجبلالاسود') || s.includes('الجبلالأسود')) return 'montenegro';
  if (s.includes('faroe') || s.includes('فارو')) return 'faroe';
  if (s.includes('georgia') || s.includes('جورجيا')) return 'georgia';
  if (s.includes('azerbaijan') || s.includes('اذربيجان') || s.includes('أذربيجان')) return 'azerbaijan';
  if (s.includes('hungary') || s.includes('المجر')) return 'hungary';
  if (s.includes('bulgaria') || s.includes('بلغاريا')) return 'bulgaria';
  if (s.includes('finland') || s.includes('فنلندا')) return 'finland';
  if (s.includes('iceland') || s.includes('ايسلندا') || s.includes('آيسلندا')) return 'iceland';
  if (s.includes('albania') || s.includes('البانيا') || s.includes('ألبانيا')) return 'albania';
  if (s.includes('macedonia') || s.includes('مقدونيا')) return 'northmacedonia';
  if (s.includes('greece') || s.includes('اليونان')) return 'greece';
  if (s.includes('norway') || s.includes('النرويج')) return 'norway';
  if (s.includes('austria') || s.includes('النمسا')) return 'austria';
  if (s.includes('denmark') || s.includes('الدانمارك') || s.includes('الدنمارك')) return 'denmark';
  if (s.includes('scotland') || s.includes('اسكتلندا') || s.includes('إسكتلندا')) return 'scotland';
  if (s.includes('wales') || s.includes('ويلز')) return 'wales';
  if (s.includes('serbia') || s.includes('صربيا')) return 'serbia';
  if (s.includes('luxembourg') || s.includes('لوكسمبورغ') || s.includes('لوكسمبورج')) return 'luxembourg';
  if (s.includes('belarus') || s.includes('بيلاروسيا')) return 'belarus';
  if (s.includes('lithuania') || s.includes('ليتوانيا')) return 'lithuania';
  if (s.includes('estonia') || s.includes('استونيا') || s.includes('إستونيا')) return 'estonia';
  if (s.includes('kosovo') || s.includes('كوسوفو')) return 'kosovo';
  if (s.includes('malta') || s.includes('مالطا')) return 'malta';
  if (s.includes('andorra') || s.includes('اندورا') || s.includes('أندورا')) return 'andorra';
  if (s.includes('sanmarino') || s.includes('سانمارينو')) return 'sanmarino';
  if (s.includes('gibraltar') || s.includes('جبلطارق')) return 'gibraltar';
  return s;
}

function areMatchesSameFrontend(homeA?: string, awayA?: string, homeB?: string, awayB?: string): boolean {
  const hA = normalizeMatchTeamName(homeA || '');
  const aA = normalizeMatchTeamName(awayA || '');
  const hB = normalizeMatchTeamName(homeB || '');
  const aB = normalizeMatchTeamName(awayB || '');

  if (!hA || !aA || !hB || !aB) return false;

  const direct =
    (hA === hB || hA.includes(hB) || hB.includes(hA)) &&
    (aA === aB || aA.includes(aB) || aB.includes(aA));
  const reversed =
    (hA === aB || hA.includes(aB) || aB.includes(hA)) &&
    (aA === hB || aA.includes(hB) || hB.includes(aA));

  return direct || reversed;
}

function deduplicateMatchesList(list: Match[]): Match[] {
  const result: Match[] = [];

  for (const m of list) {
    const existingIdx = result.findIndex((r) => {
      if (r.id === m.id) return true;
      return areMatchesSameFrontend(m.homeName, m.awayName, r.homeName, r.awayName);
    });

    if (existingIdx === -1) {
      result.push(m);
    } else {
      const ex = result[existingIdx];
      if (m.status === 'live' && ex.status !== 'live') {
        result[existingIdx] = {
          ...m,
          homeLogo: m.homeLogo || ex.homeLogo,
          awayLogo: m.awayLogo || ex.awayLogo,
        };
      } else if (m.status !== 'live' && ex.status === 'live') {
        if (!ex.homeLogo && m.homeLogo) ex.homeLogo = m.homeLogo;
        if (!ex.awayLogo && m.awayLogo) ex.awayLogo = m.awayLogo;
      } else {
        const isMStream = Number(m.id) < 10000000;
        const isExStream = Number(ex.id) < 10000000;
        if (isMStream && !isExStream) {
          result[existingIdx] = {
            ...m,
            homeLogo: m.homeLogo || ex.homeLogo,
            awayLogo: m.awayLogo || ex.awayLogo,
          };
        }
      }
    }
  }
  return result;
}

function Home() {
  const { matches, competitions, loading, error, refresh } = useMatchZoneData();
  const { favorites, toggleFavorite } = useFavorites();
  const [, setLocation] = useLocation();
  const [newsArticles, setNewsArticles] = useState<LiveNewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);

  useEffect(() => {
    let isMounted = true;
    loadLiveFootballNews('all')
      .then((data) => {
        if (isMounted) {
          setNewsArticles(data && data.length > 0 ? data : []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setNewsArticles([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingNews(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const live = deduplicateMatchesList(matches.filter((match) => match.status === 'live'));
  const today = deduplicateMatchesList(
    matches.filter((match) => {
      if (match.status !== 'upcoming') return false;
      const isToday = match.rawDate ? isMatchToday(match.rawDate) : (match.date === 'اليوم' || match.date === 'Today');
      if (!isToday) return false;
      return !live.some((l) => areMatchesSameFrontend(l.homeName, l.awayName, match.homeName, match.awayName));
    })
  );
  const upcoming = deduplicateMatchesList(
    matches.filter((match) => {
      if (match.status !== 'upcoming') return false;
      const isToday = match.rawDate ? isMatchToday(match.rawDate) : (match.date === 'اليوم' || match.date === 'Today');
      if (isToday) return false;
      return !live.some((l) => areMatchesSameFrontend(l.homeName, l.awayName, match.homeName, match.awayName));
    })
  );
  const breakingHeadline = newsArticles[0]?.title;

  return (
    <div className="page-frame">
      <section className="hero">
        <div className="hero-orbit" />
        <div className="hero-content">
          <h1>
            شاهد كرة القدم <span>مباشرة.</span>
          </h1>
          <p>
            بث حي للمباريات، نتائج لحظية، تشكيلات الفرق الرسمية وجداول المواعيد الحية لأقوى البطولات العالمية.
          </p>
          <div className="hero-actions">
            <Link href="/live" className="btn btn-primary" data-testid="link-hero-watch-live">
              <Radio size={15} /> شاهد الآن
            </Link>
            <Link href="/matches" className="btn btn-secondary" data-testid="link-hero-explore">
              <CalendarDays size={15} /> جدول المباريات
            </Link>
          </div>
        </div>
      </section>

      {/* Breaking News Ticker on Home */}
      {breakingHeadline && (
        <div
          className="breaking-news-ticker"
          style={{ cursor: 'pointer', margin: '20px 0 10px' }}
          onClick={() => {
            if (newsArticles[0]) {
              cacheArticleForNavigation(newsArticles[0]);
              setLocation(`/news/${encodeURIComponent(newsArticles[0].id)}`);
            }
          }}
          data-testid="ticker-breaking-news-home"
        >
          <span className="breaking-pill">
            <Flame size={13} />
            عاجل
          </span>
          <div className="breaking-text">
            🔴 {breakingHeadline}
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {loading && matches.length === 0 ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          {/* Live Section */}
          <section className="home-section">
            <div className="section-row">
              <div className="section-header-block">
                <span className="eyebrow">01 / تجري الآن</span>
                <h2 className="section-title">المباريات المباشرة</h2>
                <p className="section-desc">متابعة حية للنتائج، التشكيلات، وإحصائيات اللقاءات الجارية الآن.</p>
              </div>
              <Link href="/live" className="section-link" data-testid="link-home-live-more">
                عرض جميع المباشر ({live.length}) <ChevronRight size={13} style={{ verticalAlign: 'middle' }} />
              </Link>
            </div>
            {live.length > 0 ? (
              <div className="live-grid">
                {live.slice(0, 3).map((match) => (
                  <LiveMatchCard
                    key={match.id}
                    match={match}
                    favorite={favorites.includes(match.id)}
                    onFavorite={toggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="compact-empty-state">
                <Radio size={22} style={{ margin: '0 auto 6px', display: 'block', color: '#16A34A' }} />
                <b style={{ color: '#111827', fontSize: 14, display: 'block', marginBottom: 2 }}>
                  لا توجد مباريات جارية في هذه اللحظة
                </b>
                <p style={{ color: '#6B7280', fontSize: 12, margin: 0 }}>
                  ستظهر المباريات تلقائياً فور انطلاق صافرة البداية والتحديثات المباشرة.
                </p>
              </div>
            )}
          </section>

          {/* Today's Fixtures */}
          <section className="home-section">
            <div className="section-row">
              <div className="section-header-block">
                <span className="eyebrow">02 / مركز المباريات</span>
                <h2 className="section-title">مباريات اليوم</h2>
                <p className="section-desc">مواعيد وجدول لقاءات اليوم في مختلف المسابقات والبطولات الكبرى.</p>
              </div>
              <Link href="/matches" className="section-link" data-testid="link-home-matches-more">
                جميع المباريات <ChevronRight size={13} style={{ verticalAlign: 'middle' }} />
              </Link>
            </div>
            {today.length > 0 ? (
              <div className="match-grid">
                {today.slice(0, 3).map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    favorite={favorites.includes(match.id)}
                    onFavorite={toggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="compact-empty-state">
                <p style={{ color: '#4B5563', fontSize: 13, fontWeight: 500, margin: 0 }}>
                  لا توجد مباريات قادمة متبقية لليوم. يمكنك الاطلاع على مواعيد الأيام القادمة.
                </p>
              </div>
            )}
          </section>

          {/* Upcoming Matches */}
          {upcoming.length > 0 && (
            <section className="home-section">
              <div className="section-row">
                <div className="section-header-block">
                  <span className="eyebrow">03 / المواعيد القادمة</span>
                  <h2 className="section-title">المباريات القادمة</h2>
                  <p className="section-desc">جدول مواعيد مباريات الأيام القادمة والقنوات الناقلة للمواجهات المرتقبة.</p>
                </div>
                <Link href="/matches" className="section-link" data-testid="link-home-upcoming-more">
                  جدول المباريات <ChevronRight size={13} style={{ verticalAlign: 'middle' }} />
                </Link>
              </div>
              <div className="match-grid">
                {upcoming.slice(0, 3).map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    favorite={favorites.includes(match.id)}
                    onFavorite={toggleFavorite}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Competitions */}
          {competitions.length > 0 && (
            <section className="home-section">
              <div className="section-row">
                <div className="section-header-block">
                  <span className="eyebrow">04 / البطولات والدوريات</span>
                  <h2 className="section-title">أبرز البطولات</h2>
                  <p className="section-desc">تصفح أقوى الدوريات والمسابقات العالمية ومواعيد الجولات وتفاصيلها.</p>
                </div>
                <Link href="/competitions" className="section-link" data-testid="link-home-competitions-more">
                  تصفح الكل <ChevronRight size={13} style={{ verticalAlign: 'middle' }} />
                </Link>
              </div>
              <div className="competition-grid">
                {competitions.slice(0, 4).map((competition) => (
                  <CompetitionCard key={competition.id} competition={competition} />
                ))}
              </div>
            </section>
          )}

          {/* Latest Football News Section */}
          <section className="home-section" data-testid="section-home-news">
            <div className="section-row">
              <div className="section-header-block">
                <span className="eyebrow">05 / أحدث المستجدات</span>
                <h2 className="section-title">آخر الأخبار والتقارير الرياضية</h2>
                <p className="section-desc">متابعة حية وشاملة لأبرز أخبار كرة القدم العالمية، سوق الانتقالات، وكواليس الدوريات الكبرى.</p>
              </div>
              <Link href="/news" className="section-link" data-testid="link-home-news-more">
                جميع الأخبار ({newsArticles.length}) <ChevronRight size={13} style={{ verticalAlign: 'middle' }} />
              </Link>
            </div>

            {loadingNews ? (
              <div className="news-grid">
                <LoadingSkeleton rows={3} />
                <LoadingSkeleton rows={3} />
                <LoadingSkeleton rows={3} />
              </div>
            ) : newsArticles.length > 0 ? (
              <div className="news-grid">
                {newsArticles.slice(0, 3).map((article) => (
                  <NewsCardItem
                    key={article.id}
                    article={article}
                    onClick={() => {
                      cacheArticleForNavigation(article);
                      setLocation(`/news/${encodeURIComponent(article.id)}`);
                    }}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

/**
 * TASK 3: Real currently live matches from API-Football
 */
function LivePage() {
  const { matches, loading, error, refresh } = useMatchZoneData();
  const { favorites, toggleFavorite } = useFavorites();

  // Strict live filter: only fixtures currently in play
  const live = deduplicateMatchesList(matches.filter((match) => match.status === 'live'));

  return (
    <div className="page-frame">
      <PageHeading
        eyebrow="غرفة البث المباشر"
        title="المباريات الجارية حالياً"
        subtitle="نتائج حية، الدقائق الجارية، وبث مباشر للمباريات المقامة الآن."
      />

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      <div className="filter-row">
        <button className="filter-chip active" data-testid="button-filter-live">
          جميع المباريات المباشرة · {live.length}
        </button>
      </div>

      {loading && live.length === 0 ? (
        <LoadingSkeleton rows={3} />
      ) : live.length > 0 ? (
        <div className="live-grid">
          {live.map((match) => (
            <LiveMatchCard
              key={match.id}
              match={match}
              favorite={favorites.includes(match.id)}
              onFavorite={toggleFavorite}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Radio size={22} />}
          title="لا توجد مباريات جارية الآن"
          copy="المباريات القادمة ستظهر هنا بمجرد انطلاق صافرة البداية وفقاً للبيانات المباشرة."
          action={
            <Link href="/matches" className="btn btn-secondary" data-testid="link-live-empty-matches">
              تصفح جدول المباريات القادمة
            </Link>
          }
        />
      )}
    </div>
  );
}

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function MatchesPage() {
  const { matches, teams, loading, error, refresh } = useMatchZoneData();
  const { favorites, toggleFavorite } = useFavorites();
  const [, setLocation] = useLocation();
  const [activeStatus, setActiveStatus] = useState('All');
  const [selectedDate, setSelectedDate] = useState<string>(() => getMoroccoDateOnly(new Date()));
  const [searchQuery, setSearchQuery] = useState(
    () => new URLSearchParams(window.location.search).get('search') ?? ''
  );
  const [dateMatchesMap, setDateMatchesMap] = useState<Record<string, Match[]>>({});
  const [loadingDate, setLoadingDate] = useState(false);

  // Fetch fixtures when yesterday or tomorrow is selected
  useEffect(() => {
    if (selectedDate && !dateMatchesMap[selectedDate]) {
      setLoadingDate(true);
      loadFixturesByDate(selectedDate)
        .then((fetched) => {
          setDateMatchesMap((prev) => ({ ...prev, [selectedDate]: fetched }));
        })
        .finally(() => setLoadingDate(false));
    }
  }, [selectedDate, dateMatchesMap]);

  // Candidate matches for the selected date (strictly calibrated to Morocco Time GMT+0)
  const candidateMatches = useMemo(() => {
    const todayStr = getMoroccoDateOnly(new Date());
    const dateSpecific = dateMatchesMap[selectedDate] || [];

    const map = new Map<string, Match>();

    // 1. Matches loaded specifically for the selected date - strictly ensure match date matches selectedDate!
    dateSpecific.forEach((m) => {
      const matchMoroccoDate = m.rawDate ? getMoroccoDateOnly(m.rawDate) : '';
      if (matchMoroccoDate === selectedDate || (!matchMoroccoDate && selectedDate === todayStr)) {
        map.set(String(m.id), m);
      }
    });

    // 2. Global matches pool - strictly verify date
    matches.forEach((m) => {
      const matchMoroccoDate = m.rawDate ? getMoroccoDateOnly(m.rawDate) : '';
      if (matchMoroccoDate === selectedDate) {
        if (!map.has(String(m.id))) {
          map.set(String(m.id), m);
        }
      } else if (selectedDate === todayStr && m.status === 'live') {
        if (!map.has(String(m.id))) {
          map.set(String(m.id), m);
        }
      }
    });

    return deduplicateMatchesList(Array.from(map.values()));
  }, [selectedDate, dateMatchesMap, matches]);

  // 3-day rolling window: Yesterday (-1), Today (0), Tomorrow (+1) strictly in Moroccan Time
  const daysList = useMemo(() => {
    return getMoroccoDaysList();
  }, []);

  const filtered = useMemo(() => {
    return candidateMatches
      .filter((match) => {
        const homeTeam = teams.find((t) => t.id === match.home);
        const awayTeam = teams.find((t) => t.id === match.away);
        const home = (match.homeName || homeTeam?.name || '').toLowerCase();
        const away = (match.awayName || awayTeam?.name || '').toLowerCase();
        const comp = (match.competitionName || '').toLowerCase();

        const statusMatch =
          activeStatus === 'All' ||
          (activeStatus === 'Live' && match.status === 'live') ||
          (activeStatus === 'Upcoming' && match.status === 'upcoming') ||
          (activeStatus === 'Finished' && match.status === 'finished');

        const q = searchQuery.trim().toLowerCase();
        const textMatch = !q || home.includes(q) || away.includes(q) || comp.includes(q);

        return statusMatch && textMatch;
      })
      .sort((a, b) => {
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (b.status === 'live' && a.status !== 'live') return 1;
        if (a.rawDate && b.rawDate) {
          return new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
        }
        return 0;
      });
  }, [activeStatus, candidateMatches, searchQuery, teams]);

  // Group filtered matches by competition (league / tournament)
  const groupedCompetitions = useMemo(() => {
    const map = new Map<
      string,
      {
        competitionId: string;
        competitionName: string;
        competitionLogo?: string | null;
        competitionCountry?: string;
        round?: string;
        matches: Match[];
      }
    >();

    for (const match of filtered) {
      let compId = match.competitionId || 'other';
      let compName = match.competitionName || 'المباريات الودية';
      let compLogo = match.competitionLogo;
      let compCountry = match.competitionCountry;

      // Disambiguate if Brazilian teams were placed under Italian Serie A
      const isBr = isBrazilianMatch(match.homeName, match.awayName);
      if (
        isBr &&
        (compName.toLowerCase().includes('serie a') ||
          compId === '135' ||
          compId === '4' ||
          (compCountry || '').toLowerCase().includes('italy') ||
          (compCountry || '').includes('إيطاليا'))
      ) {
        compId = '71';
        compName = 'الدوري البرازيلي';
        compCountry = 'البرازيل';
        compLogo = 'https://media.api-sports.io/football/leagues/71.png';
      }

      const key = compId || compName || 'other';
      if (!map.has(key)) {
        map.set(key, {
          competitionId: compId,
          competitionName: compName,
          competitionLogo: compLogo,
          competitionCountry: compCountry,
          round: match.round,
          matches: [],
        });
      }
      map.get(key)!.matches.push(match);
    }

    return Array.from(map.values());
  }, [filtered]);

  return (
    <div className="page-frame">
      <PageHeading
        eyebrow="مركز المباريات / الجداول"
        title="جدول المباريات"
        subtitle={searchQuery ? `نتائج البحث عن "${searchQuery}"` : 'المواعيد الرسمية للمباريات والنتائج الحية مع توقيت الانطلاق الدقيق.'}
      />

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {/* Date Strip: Yesterday, Today, Tomorrow */}
      <div className="dimalive-schedule-container" data-testid="dimalive-schedule-container">
        {/* Horizontal Day Cards Strip */}
        <div className="dimalive-days-strip" data-testid="dimalive-days-strip">
          {daysList.map((day) => {
            const isSelected = selectedDate === day.dateStr;
            return (
              <div
                key={day.dateStr}
                className={`dimalive-day-card ${isSelected ? 'active' : ''} ${day.isToday ? 'is-today' : ''}`}
                onClick={() => setSelectedDate(day.dateStr)}
                data-testid={`day-card-${day.dateStr}`}
              >
                <span className="dimalive-day-name">{day.dayName}</span>
                <span className="dimalive-day-number">{day.dayNumber}</span>
                <span className="dimalive-day-month">{day.monthName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {(loading && matches.length === 0) || (loadingDate && candidateMatches.length === 0) ? (
        <LoadingSkeleton rows={4} />
      ) : filtered.length > 0 ? (
        <div className="dimalive-competitions-wrapper" data-testid="dimalive-competitions-wrapper">
          {groupedCompetitions.map((group) => {
            const compInfo = formatCompetitionInfo({
              id: group.competitionId,
              name: group.competitionName,
              country: group.competitionCountry,
              logo: group.competitionLogo,
            });
            const roundText = getArabicRound(group.round || group.matches[0]?.round);

            return (
              <div
                key={group.competitionId}
                className="dimalive-comp-card"
                data-testid={`comp-card-${group.competitionId}`}
              >
                {/* Competition Header */}
                <div className="dimalive-comp-header">
                  <div className="dimalive-comp-identity">
                    {compInfo.competitionLogo ? (
                      <img
                        src={compInfo.competitionLogo}
                        alt={compInfo.competitionName}
                        className="dimalive-comp-logo"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="dimalive-comp-logo-placeholder">🏆</div>
                    )}
                    <div className="dimalive-comp-text">
                      <h2 className="dimalive-comp-name">{compInfo.competitionName}</h2>
                      <span className="dimalive-comp-country">{compInfo.competitionCountry}</span>
                    </div>
                  </div>
                </div>

                {/* Round Sub-bar */}
                <div className="dimalive-comp-round-bar">
                  <span className="dimalive-comp-round-label">{roundText}</span>
                </div>

                {/* Matches List */}
                <div className="dimalive-matches-list">
                  {group.matches.map((match) => {
                    const homeName = getArabicTeamName(match.homeName);
                    const awayName = getArabicTeamName(match.awayName);
                    const isFinished = match.status === 'finished';
                    const isLive = match.status === 'live';

                    return (
                      <Link
                        key={match.id}
                        href={`/match/${match.id}`}
                        className="dimalive-match-row"
                        data-testid={`match-row-${match.id}`}
                      >
                        {/* 1. Status Column (Desktop only: Rightmost in RTL) */}
                        <div className="dimalive-row-status">
                          {isFinished ? (
                            <span className="dimalive-status-finished">انتهت</span>
                          ) : isLive ? (
                            match.minute === 'إستراحة' || match.minute === 'HT' ? (
                              <span className="dimalive-status-halftime">
                                <span className="dimalive-halftime-dot" />
                                <span>إستراحة</span>
                              </span>
                            ) : (
                              <span className="dimalive-status-live">
                                <span className="dimalive-live-dot" />
                                <span dir="ltr">{formatMatchMinute(match.minute)}</span>
                              </span>
                            )
                          ) : (
                            <span className="dimalive-status-upcoming">
                              ستبدأ قريباً
                            </span>
                          )}
                        </div>

                        {/* 2. Fixture (Home - Score Box - Away) */}
                        <div className="dimalive-row-fixture">
                          {/* Home team (Next to status / on the right in RTL) */}
                          <div className="dimalive-team-side home-side">
                            <span className="dimalive-team-name" title={homeName}>
                              {homeName}
                            </span>
                            <div className="dimalive-team-logo-wrap">
                              {match.homeLogo ? (
                                <img
                                  src={match.homeLogo}
                                  alt={homeName}
                                  className="dimalive-team-logo"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="dimalive-team-logo-fallback">⚽</span>
                              )}
                            </div>
                          </div>

                          {/* Center: Score Box + Mobile Status Underneath */}
                          <div className="dimalive-center-wrap">
                            <div className="dimalive-score-box">
                              {match.status === 'upcoming' ? (
                                <span className="dimalive-score-time">
                                  {match.kickoffTime || match.time}
                                </span>
                              ) : (
                                <>
                                  <span className="dimalive-score-num home">
                                    {match.homeScore ?? 0}
                                  </span>
                                  <span className="dimalive-score-divider" />
                                  <span className="dimalive-score-num away">
                                    {match.awayScore ?? 0}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Mobile-only status right under the score */}
                            <div className="dimalive-mobile-status">
                              {isLive ? (
                                match.minute === 'إستراحة' || match.minute === 'HT' ? (
                                  <span className="dimalive-status-halftime">
                                    <span className="dimalive-halftime-dot" />
                                    <span>إستراحة</span>
                                  </span>
                                ) : (
                                  <span className="dimalive-status-live">
                                    <span className="dimalive-live-dot" />
                                    <span dir="ltr">{formatMatchMinute(match.minute)}</span>
                                  </span>
                                )
                              ) : isFinished ? (
                                <span className="dimalive-status-finished">انتهت</span>
                              ) : (
                                <span className="dimalive-status-upcoming">ستبدأ قريباً</span>
                              )}
                            </div>
                          </div>

                          {/* Away team (On the left in RTL) */}
                          <div className="dimalive-team-side away-side">
                            <div className="dimalive-team-logo-wrap">
                              {match.awayLogo ? (
                                <img
                                  src={match.awayLogo}
                                  alt={awayName}
                                  className="dimalive-team-logo"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="dimalive-team-logo-fallback">⚽</span>
                              )}
                            </div>
                            <span className="dimalive-team-name" title={awayName}>
                              {awayName}
                            </span>
                          </div>
                        </div>

                        {/* 3. Left Spacer for perfect center alignment */}
                        <div className="dimalive-row-status-spacer" aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays size={19} />}
          title="لم يتم العثور على أي مباريات"
          copy="لا توجد مباريات مطابقة للتاريخ أو الحالة المحددة. جرب اختيار تاريخ آخر أو إعادة ضبط الفلتر."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedDate('all');
                setActiveStatus('All');
                setSearchQuery('');
                setLocation('/matches');
              }}
            >
              إعادة الضبط
            </Button>
          }
        />
      )}
    </div>
  );
}

function StandingsTable({
  competitionId,
  competitionName,
}: {
  competitionId: string;
  competitionName?: string;
}) {
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  // Default to compact view on mobile (< 768px), full on desktop
  const [viewMode, setViewMode] = useState<'compact' | 'full'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'compact' : 'full'
  );

  useEffect(() => {
    setLoading(true);
    loadCompetitionStandings(competitionId, competitionName).then((data) => {
      setStandings(data);
      if (data.length > 0 && data[0].groupName) {
        setSelectedGroup(data[0].groupName);
      } else {
        setSelectedGroup(null);
      }
      setLoading(false);
    });
  }, [competitionId, competitionName]);

  const groups = useMemo(() => {
    const map = new Map<string, StandingEntry[]>();
    for (const s of standings) {
      if (s.groupName) {
        if (!map.has(s.groupName)) map.set(s.groupName, []);
        map.get(s.groupName)!.push(s);
      }
    }
    return Array.from(map.entries());
  }, [standings]);

  if (loading) {
    return (
      <div className="standings-loading-wrap" style={{ padding: '24px 0' }}>
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  const isFriendly = competitionName?.includes('ودية') || competitionId === '10';

  if (!standings.length) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>
          {isFriendly
            ? 'المباريات الودية لا تتضمن جدول ترتيب أو نقاط.'
            : 'جدول الترتيب غير متاح لهذه البطولة حالياً.'}
        </p>
      </div>
    );
  }

  const displayEntries =
    groups.length > 0 && selectedGroup
      ? groups.find(([g]) => g === selectedGroup)?.[1] || standings
      : standings;

  const hasRelegation = displayEntries.length >= 14;

  const cleanCompName = (competitionName || '').toLowerCase().trim();
  const isTop5League =
    ['39', '140', '135', '78', '61'].includes(competitionId) ||
    cleanCompName.includes('premier league') ||
    cleanCompName.includes('الدوري الإنجليزي') ||
    ((cleanCompName.includes('la liga') || cleanCompName.includes('laliga') || cleanCompName.includes('الدوري الإسباني')) &&
      !cleanCompName.includes('segunda') && !cleanCompName.includes('2') && !cleanCompName.includes('الثانية')) ||
    ((cleanCompName.includes('serie a') || cleanCompName.includes('الدوري الإيطالي')) &&
      !cleanCompName.includes('brazil') && !cleanCompName.includes('b')) ||
    cleanCompName.includes('bundesliga') ||
    cleanCompName.includes('الدوري الألماني') ||
    cleanCompName.includes('ligue 1') ||
    cleanCompName.includes('الدوري الفرنسي');

  const isGroupTournament =
    groups.length > 0 ||
    ['1', '6', '4', '9', '2', '3', '848'].includes(competitionId) ||
    cleanCompName.includes('كأس أمم') ||
    cleanCompName.includes('afcon') ||
    cleanCompName.includes('world cup') ||
    cleanCompName.includes('كأس العالم') ||
    cleanCompName.includes('euro') ||
    cleanCompName.includes('copa america') ||
    cleanCompName.includes('كوبا أمريكا') ||
    cleanCompName.includes('أمم إفريقيا') ||
    cleanCompName.includes('أمم أوروبا') ||
    cleanCompName.includes('دوري أبطال أوروبا') ||
    cleanCompName.includes('الدوري الأوروبي');

  const isAfricanArab =
    ['200', '233', '202', '186'].includes(competitionId) ||
    cleanCompName.includes('botola') ||
    cleanCompName.includes('المغربي') ||
    cleanCompName.includes('المصري') ||
    cleanCompName.includes('التونسي') ||
    cleanCompName.includes('الجزائري');

  const isAsianArab =
    ['307', '305', '301'].includes(competitionId) ||
    cleanCompName.includes('roshn') ||
    cleanCompName.includes('saudi') ||
    cleanCompName.includes('روشن') ||
    cleanCompName.includes('السعودي') ||
    cleanCompName.includes('نجوم قطر') ||
    cleanCompName.includes('أدنوك') ||
    cleanCompName.includes('adnoc');

  const isSecondDivision =
    competitionId === '141' ||
    cleanCompName.includes('laliga 2') ||
    cleanCompName.includes('segunda') ||
    cleanCompName.includes('الدرجة الثانية');

  return (
    <div className="standings-container">
      {/* Top Toolbar: Group pills & Compact/Full view switch */}
      <div className="standings-top-toolbar">
        {groups.length > 1 ? (
          <div className="standings-groups-bar">
            {groups.map(([grpName]) => (
              <button
                key={grpName}
                type="button"
                className={`standings-group-pill ${selectedGroup === grpName ? 'active' : ''}`}
                onClick={() => setSelectedGroup(grpName)}
              >
                {grpName}
              </button>
            ))}
          </div>
        ) : <div />}

        <div className="standings-view-switch" role="tablist" aria-label="طريقة عرض الترتيب">
          <button
            type="button"
            className={`standings-switch-btn ${viewMode === 'compact' ? 'active' : ''}`}
            onClick={() => setViewMode('compact')}
            title="عرض موجز للموبايل: الترتيب، الفريق، المباريات، الفارق، النقاط"
          >
            موجز
          </button>
          <button
            type="button"
            className={`standings-switch-btn ${viewMode === 'full' ? 'active' : ''}`}
            onClick={() => setViewMode('full')}
            title="عرض كامل: جميع الإحصائيات مع سحب أفقي"
          >
            تفصيلي
          </button>
        </div>
      </div>

      {viewMode === 'full' && (
        <div className="standings-scroll-hint mobile-only">
          <span>⟵ اسحب أفقياً لعرض باقي الأرقام</span>
        </div>
      )}

      <div className={`standings-table-wrap ${viewMode === 'full' ? 'is-full-view' : 'is-compact-view'}`}>
        <table className="standings-table">
          <thead>
            <tr>
              <th className="col-sticky-pos" style={{ width: 34, textAlign: 'center' }}>#</th>
              <th className="col-sticky-team">الفريق</th>
              <th className="col-stat" title="المباريات الملعوبة">لعب</th>
              {viewMode === 'full' && (
                <>
                  <th className="col-stat" title="فوز">فاز</th>
                  <th className="col-stat" title="تعادل">تعادل</th>
                  <th className="col-stat" title="خسارة">خسر</th>
                  <th className="col-stat col-desktop-only" title="له (الأهداف المسجلة)">له</th>
                  <th className="col-stat col-desktop-only" title="عليه (الأهداف المستقبلة)">عليه</th>
                </>
              )}
              <th className="col-stat" title="فارق الأهداف">الفارق</th>
              <th className="col-stat col-pts-header" title="مجموع النقاط">النقاط</th>
            </tr>
          </thead>
          <tbody>
            {displayEntries.map((entry, idx) => {
              const pos = entry.position || idx + 1;
              let isQualifiedPrimary = false;
              let isQualifiedSecondary = false;
              let isRelegation = false;

              if (isTop5League) {
                isQualifiedPrimary = pos <= 4;
                isQualifiedSecondary = pos === 5;
                isRelegation = hasRelegation && pos > displayEntries.length - 3;
              } else if (isGroupTournament) {
                isQualifiedPrimary = pos <= 2;
                isQualifiedSecondary = false;
                isRelegation = false;
              } else if (isAfricanArab) {
                isQualifiedPrimary = pos <= 2;
                isQualifiedSecondary = pos === 3;
                isRelegation = hasRelegation && pos > displayEntries.length - 2;
              } else if (isAsianArab) {
                isQualifiedPrimary = pos <= 3;
                isQualifiedSecondary = false;
                isRelegation = hasRelegation && pos > displayEntries.length - 3;
              } else if (isSecondDivision) {
                isQualifiedPrimary = pos <= 2;
                isQualifiedSecondary = pos >= 3 && pos <= 6;
                isRelegation = hasRelegation && pos > displayEntries.length - 4;
              } else {
                isQualifiedPrimary = pos <= 2;
                isQualifiedSecondary = false;
                isRelegation = hasRelegation && pos > displayEntries.length - 3;
              }

              return (
                <tr key={`${entry.teamId}-${idx}`} className="standings-row">
                  <td className="standings-pos col-sticky-pos" style={{ textAlign: 'center' }}>
                    <span
                      className={`standings-rank-badge ${
                        isQualifiedPrimary
                          ? 'rank-ucl'
                          : isQualifiedSecondary
                          ? 'rank-uel'
                          : isRelegation
                          ? 'rank-relegation'
                          : ''
                      }`}
                    >
                      {pos}
                    </span>
                  </td>
                  <td className="standings-team col-sticky-team">
                    <div className="standings-team-inner">
                      {entry.teamLogo && (
                        <img
                          src={entry.teamLogo}
                          alt={entry.teamName}
                          className="standings-team-logo"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span className="standings-team-name" title={entry.teamName}>
                        {entry.teamName}
                      </span>
                    </div>
                  </td>
                  <td className="col-stat col-played">{entry.played}</td>
                  {viewMode === 'full' && (
                    <>
                      <td className="col-stat col-wins">{entry.wins}</td>
                      <td className="col-stat col-draws">{entry.draws}</td>
                      <td className="col-stat col-losses">{entry.losses}</td>
                      <td className="col-stat col-desktop-only">{entry.goalsFor}</td>
                      <td className="col-stat col-desktop-only">{entry.goalsAgainst}</td>
                    </>
                  )}
                  <td
                    className="col-stat col-diff"
                    style={{
                      color:
                        entry.goalDifference > 0
                          ? '#10b981'
                          : entry.goalDifference < 0
                          ? '#ef4444'
                          : 'inherit',
                      fontWeight: 600,
                    }}
                  >
                    {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                  </td>
                  <td className="col-stat col-pts">
                    <span className="standings-pts-badge">{entry.points}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="standings-legend">
        {isTop5League ? (
          <>
            <span className="legend-item"><span className="legend-dot dot-ucl" /> دوري أبطال أوروبا</span>
            <span className="legend-item"><span className="legend-dot dot-uel" /> الدوري الأوروبي</span>
            {hasRelegation && (
              <span className="legend-item"><span className="legend-dot dot-relegation" /> الهبوط</span>
            )}
          </>
        ) : isGroupTournament ? (
          <span className="legend-item"><span className="legend-dot dot-ucl" /> التأهل للدور القادم</span>
        ) : isAfricanArab ? (
          <>
            <span className="legend-item"><span className="legend-dot dot-ucl" /> دوري أبطال إفريقيا</span>
            <span className="legend-item"><span className="legend-dot dot-uel" /> كأس الكونفيدرالية الإفريقية</span>
            {hasRelegation && (
              <span className="legend-item"><span className="legend-dot dot-relegation" /> الهبوط</span>
            )}
          </>
        ) : isAsianArab ? (
          <>
            <span className="legend-item"><span className="legend-dot dot-ucl" /> دوري أبطال آسيا للنخبة</span>
            {hasRelegation && (
              <span className="legend-item"><span className="legend-dot dot-relegation" /> الهبوط</span>
            )}
          </>
        ) : isSecondDivision ? (
          <>
            <span className="legend-item"><span className="legend-dot dot-ucl" /> الصعود المباشر</span>
            <span className="legend-item"><span className="legend-dot dot-uel" /> تصفيات الصعود</span>
            {hasRelegation && (
              <span className="legend-item"><span className="legend-dot dot-relegation" /> الهبوط</span>
            )}
          </>
        ) : (
          <>
            <span className="legend-item"><span className="legend-dot dot-ucl" /> التأهل القاري</span>
            {hasRelegation && (
              <span className="legend-item"><span className="legend-dot dot-relegation" /> الهبوط</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CompetitionsPage() {
  const { competitions } = useMatchZoneData();
  const [selectedComp, setSelectedComp] = useState<string | null>(
    new URLSearchParams(window.location.search).get('focus')
  );
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'arab' | 'europe' | 'continental'>('all');

  // Seed with all supported competitions from config so Arab and major leagues are always present
  const allAvailableCompetitions = useMemo(() => {
    const seededList: Competition[] = SUPPORTED_COMPETITIONS.map((sc) => ({
      id: String(sc.id),
      name: sc.arabicName || sc.name,
      short: sc.slug.slice(0, 3).toUpperCase(),
      country: sc.country,
      matches: 0,
      accent: '#10b981',
      logoUrl: `https://media.api-sports.io/football/leagues/${sc.id}.png`,
    }));

    const compsMap = new Map<string, Competition>();
    for (const sc of seededList) {
      compsMap.set(String(sc.id), sc);
    }
    for (const comp of competitions) {
      compsMap.set(String(comp.id), {
        ...comp,
        logoUrl: comp.logoUrl || compsMap.get(String(comp.id))?.logoUrl,
      });
    }

    const priorityMap = new Map<number, number>();
    SUPPORTED_COMPETITIONS.forEach((sc, idx) => {
      priorityMap.set(sc.id, idx);
    });

    const seen = new Set<string>();
    const list: Competition[] = [];
    for (const comp of compsMap.values()) {
      const compInfo = formatCompetitionInfo({
        id: comp.id,
        name: comp.name,
        country: comp.country,
        logo: comp.logoUrl,
      });
      const norm = normalizeCompetitionName(compInfo.competitionName);
      if (!seen.has(norm)) {
        seen.add(norm);
        list.push(comp);
      }
    }

    // Explicit priority sorting to guarantee Big 5 European leagues are always first
    list.sort((a, b) => {
      const pA = priorityMap.has(Number(a.id)) ? priorityMap.get(Number(a.id))! : 999;
      const pB = priorityMap.has(Number(b.id)) ? priorityMap.get(Number(b.id))! : 999;
      return pA - pB;
    });

    return list;
  }, [competitions]);

  const filteredCompetitions = useMemo(() => {
    if (categoryFilter === 'all') return allAvailableCompetitions;
    return allAvailableCompetitions.filter((comp) => {
      const idNum = Number(comp.id);
      const sc = SUPPORTED_COMPETITIONS.find((c) => c.id === idNum);
      const cName = (comp.name || '').toLowerCase();
      const cCountry = (comp.country || '').toLowerCase();

      const isArab =
        sc?.category === 'arab' ||
        [200, 201, 307, 308, 233, 305, 301, 202, 186].includes(idNum) ||
        cCountry.includes('المغرب') || cCountry.includes('morocco') ||
        cCountry.includes('السعودية') || cCountry.includes('saudi') ||
        cCountry.includes('مصر') || cCountry.includes('egypt') ||
        cCountry.includes('قطر') || cCountry.includes('qatar') ||
        cCountry.includes('الإمارات') || cCountry.includes('uae') ||
        cCountry.includes('تونس') || cCountry.includes('tunisia') ||
        cCountry.includes('الجزائر') || cCountry.includes('algeria') ||
        cName.includes('botola') || cName.includes('روشن') || cName.includes('المصري');

      const isEurope =
        sc?.category === 'europe' ||
        [39, 140, 135, 78, 61, 141].includes(idNum) ||
        cCountry.includes('إنجلترا') || cCountry.includes('england') ||
        cCountry.includes('إسبانيا') || cCountry.includes('spain') ||
        cCountry.includes('إيطاليا') || cCountry.includes('italy') ||
        cCountry.includes('ألمانيا') || cCountry.includes('germany') ||
        cCountry.includes('فرنسا') || cCountry.includes('france');

      const isContinental =
        sc?.category === 'continental' ||
        [2, 3, 12, 20, 17, 7, 1, 6, 4].includes(idNum) ||
        cName.includes('champions') || cName.includes('أبطال') || cName.includes('كأس العالم') || cName.includes('nations');

      if (categoryFilter === 'arab') return isArab;
      if (categoryFilter === 'europe') return isEurope;
      if (categoryFilter === 'continental') return isContinental;
      return true;
    });
  }, [allAvailableCompetitions, categoryFilter]);

  const focused = selectedComp ? allAvailableCompetitions.find((c) => c.id === selectedComp) : null;

  const handleSelectComp = (id: string | null) => {
    setSelectedComp(id);
    if (id) {
      window.history.replaceState(null, '', `?focus=${id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  useEffect(() => {
    if (selectedComp) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedComp]);

  // When a league card is clicked: hide the entire grid and show ONLY this competition's standings!
  if (focused) {
    const compInfo = formatCompetitionInfo({
      id: focused.id,
      name: focused.name,
      country: focused.country,
      logo: focused.logoUrl,
    });

    return (
      <div className="page-frame focused-comp-page">
        <div className="focused-comp-header">
          <button
            type="button"
            className="focused-back-btn"
            onClick={() => handleSelectComp(null)}
          >
            <ArrowRight size={16} />
            <span>العودة إلى قائمة البطولات</span>
          </button>

          <div className="focused-comp-title-card">
            <div className="focused-comp-brand">
              <span className="focused-comp-logo-wrap" style={{ color: focused.accent }}>
                {compInfo.competitionLogo ? (
                  <img
                    src={compInfo.competitionLogo}
                    alt={compInfo.competitionName}
                    className="focused-comp-logo"
                  />
                ) : (
                  <Trophy size={24} />
                )}
              </span>
              <div>
                <div className="focused-comp-eyebrow">
                  <span>جدول الترتيب</span>
                  {compInfo.competitionCountry && (
                    <span className="focused-comp-country">
                      •{' '}
                      {compInfo.countryFlagUrl ? (
                        <img
                          src={compInfo.countryFlagUrl}
                          alt={compInfo.competitionCountry}
                          className="focused-comp-flag-img"
                        />
                      ) : (
                        <span className="focused-comp-flag">{compInfo.countryFlag}</span>
                      )}
                      <span>{compInfo.competitionCountry}</span>
                    </span>
                  )}
                </div>
                <h1 className="focused-comp-name">{compInfo.competitionName}</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="focused-comp-body">
          <StandingsTable competitionId={focused.id} competitionName={focused.name} />
        </div>
      </div>
    );
  }

  // Normal view: list of all competition cards
  return (
    <div className="page-frame">
      <PageHeading
        eyebrow="عالم كرة القدم"
        title="البطولات والدوريات"
        subtitle="تصفح أقوى الدوريات العربية والعالمية، جداول ترتيب الأندية والمباريات."
      />

      {/* Category Navigation Pills */}
      <div className="matches-nav-pill-group" style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          className={`matches-nav-pill ${categoryFilter === 'all' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('all')}
        >
          جميع البطولات
        </button>
        <button
          type="button"
          className={`matches-nav-pill ${categoryFilter === 'europe' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('europe')}
        >
          الدوريات الأوروبية الكبرى ⚽
        </button>
        <button
          type="button"
          className={`matches-nav-pill ${categoryFilter === 'arab' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('arab')}
        >
          الدوريات العربية 🏆
        </button>
        <button
          type="button"
          className={`matches-nav-pill ${categoryFilter === 'continental' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('continental')}
        >
          البطولات القارية والدولية 🌍
        </button>
      </div>

      <div className="competition-grid">
        {filteredCompetitions.map((competition, idx) => {
          const compInfo = formatCompetitionInfo({
            id: competition.id,
            name: competition.name,
            country: competition.country,
            logo: competition.logoUrl,
          });

          return (
            <button
              key={competition.id}
              className="competition-card"
              style={{ '--card-index': idx } as React.CSSProperties}
              onClick={() => handleSelectComp(competition.id)}
              data-testid={`card-competition-${competition.id}`}
            >
              <div className="competition-card-top">
                <span className="competition-symbol">
                  {compInfo.competitionLogo ? (
                    <img
                      src={compInfo.competitionLogo}
                      alt={compInfo.competitionName}
                      className="competition-logo-img"
                    />
                  ) : (
                    <Trophy size={22} />
                  )}
                </span>
                <span className="competition-country-badge">
                  {compInfo.countryFlagUrl ? (
                    <img
                      src={compInfo.countryFlagUrl}
                      alt={compInfo.competitionCountry}
                      className="competition-flag-img"
                    />
                  ) : (
                    <span className="competition-flag-icon">{compInfo.countryFlag}</span>
                  )}
                  <span className="competition-country-text">{compInfo.competitionCountry}</span>
                </span>
              </div>
              <div className="competition-card-info">
                <b className="competition-name">{compInfo.competitionName}</b>
                <span className="competition-action-hint">
                  <span>عرض الترتيب</span>
                  <ArrowRight size={13} className="competition-arrow-icon" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// ============================================================
// NEWS PAGE (MATCHZONE NEWS)
// ============================================================

function NewsPage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<LiveNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { slug: 'all', label: 'الكل' },
    { slug: 'champions', label: 'دوري أبطال أوروبا' },
    { slug: 'premier', label: 'الدوري الإنجليزي' },
    { slug: 'laliga', label: 'الدوري الإسباني' },
    { slug: 'transfers', label: 'سوق الانتقالات' },
    { slug: 'international', label: 'المنتخبات والكرة العربية' },
  ];

  // Fetch live real news on category change or mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    loadLiveFootballNews(selectedCategory)
      .then((data) => {
        if (isMounted) {
          setArticles(data && data.length > 0 ? data : []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setArticles([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory]);

  const filteredNews = useMemo(() => {
    return articles.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [articles, searchQuery]);

  const featured = filteredNews[0];
  const gridArticles = filteredNews.slice(1);
  const breakingHeadline = articles[0]?.title || 'متابعة لحظية ومستمرة لجميع أحداث ومباريات كرة القدم العالمية والعربية!';

  return (
    <div className="page-frame">
      {/* Breaking News Ticker */}
      <div className="breaking-news-ticker" data-testid="ticker-breaking-news">
        <span className="breaking-pill">
          <Flame size={13} />
          عاجل
        </span>
        <div className="breaking-text">
          🔴 {breakingHeadline}
        </div>
      </div>

      <PageHeading
        eyebrow="تغطية حية ومباشرة"
        title="أحدث أخبار كرة القدم"
        subtitle="متابعة فورية ومباشرة لأهم المستجدات الرياضية، سوق الانتقالات، وكواليس الدوريات الكبرى لحظة بلحظة."
      />

      {/* Category Filter Chips & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 20px', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map((c) => (
            <button
              key={c.slug}
              className={`filter-chip ${selectedCategory === c.slug ? 'active' : ''}`}
              onClick={() => setSelectedCategory(c.slug)}
              data-testid={`btn-filter-news-${c.slug}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ width: '100%', maxWidth: 300 }}>
          <div className="search-wrap">
            <Search size={15} style={{ position: 'absolute', right: 13, color: 'hsl(var(--muted-foreground))' }} />
            <input
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في الأخبار والتقارير..."
              data-testid="input-news-search"
            />
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div style={{ display: 'grid', gap: 20 }}>
          <LoadingSkeleton rows={4} />
          <div className="news-grid">
            <LoadingSkeleton rows={3} />
            <LoadingSkeleton rows={3} />
            <LoadingSkeleton rows={3} />
          </div>
        </div>
      ) : (
        <>
          {/* Featured Big Story Card */}
          {featured && (
            <div
              className="news-featured-card"
              onClick={() => {
                cacheArticleForNavigation(featured);
                setLocation(`/news/${encodeURIComponent(featured.id)}`);
              }}
              data-testid="card-news-featured"
            >
              <img src={featured.imageUrl} alt={featured.title} className="news-featured-img" />
              <div className="news-featured-overlay" />
              <div className="news-featured-content">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="news-badge">⭐ الخبر الأبرز</span>
                  <span className="news-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                    {featured.category}
                  </span>
                  {featured.source && (
                    <span className="news-badge" style={{ background: 'rgba(234, 88, 12, 0.2)', color: '#fb923c', borderColor: 'rgba(234, 88, 12, 0.3)' }}>
                      {featured.source}
                    </span>
                  )}
                </div>
                <h2 className="news-featured-title">{featured.title}</h2>
                <p className="news-featured-excerpt">{featured.excerpt}</p>
                <div className="news-meta">
                  <span>{featured.timeAgo}</span>
                  <span>•</span>
                  <span>{featured.readTime}</span>
                  <span>•</span>
                  <span style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>اقرأ التقرير كاملاً ←</span>
                </div>
              </div>
            </div>
          )}

          {/* Grid of Remaining Articles */}
          {gridArticles.length > 0 ? (
            <div className="news-grid">
              {gridArticles.map((article, idx) => (
                <NewsCardItem
                  key={article.id || `news-${idx}`}
                  article={article}
                  onClick={() => {
                    cacheArticleForNavigation(article);
                    setLocation(`/news/${encodeURIComponent(article.id)}`);
                  }}
                />
              ))}
            </div>
          ) : !featured ? (
            <EmptyState
              icon={<Newspaper size={24} />}
              title="لم يتم العثور على أي أخبار"
              copy="جرب البحث بكلمة أخرى أو تغيير التصنيف المحدد."
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function TeamsPage() {
  const { teams } = useMatchZoneData();
  const [query, setQuery] = useState('');
  const visible = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(query.toLowerCase()) ||
      team.country.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="page-frame">
      <PageHeading eyebrow="دليل الأندية" title="الفرق والأندية" subtitle="الأندية والمنتخبات المشاركة في مختلف البطولات الرسمية." />
      <div style={{ maxWidth: 330, margin: '28px 0 18px' }}>
        <div className="search-wrap">
          <UserRound size={15} style={{ position: 'absolute', right: 13, color: 'hsl(var(--muted-foreground))' }} />
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن نادٍ أو فريق..."
            data-testid="input-team-search"
          />
        </div>
      </div>
      {visible.length ? (
        <div className="teams-grid">
          {visible.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Users size={19} />} title="لم يتم العثور على أي فريق" copy="جرب البحث باسم نادٍ أو دولة أخرى." />
      )}
    </div>
  );
}

/**
 * TASK 4: Real events timeline (goals, cards, substitutions) from API-Football
 */
function RealMatchEventTimeline({ matchId }: { matchId: string }) {
  const [events, setEvents] = useState<ApiMatchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadRealMatchEvents(matchId).then((data) => {
      setEvents(data);
      setLoading(false);
    });
  }, [matchId]);

  if (loading) return <LoadingSkeleton rows={2} />;
  if (!events.length) {
    return (
      <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, marginTop: 14 }}>
        لم يتم تسجيل أي أحداث في هذه المباراة بعد.
      </p>
    );
  }

  const renderIcon = (type: string, detail?: string) => {
    const t = (type || '').toLowerCase();
    const d = (detail || '').toLowerCase();
    if (t === 'goal') return <span style={{ fontSize: 16 }}>⚽</span>;
    if (t === 'card') {
      if (d.includes('red') || d.includes('حمراء')) return <span style={{ fontSize: 16 }}>🟥</span>;
      return <span style={{ fontSize: 16 }}>🟨</span>;
    }
    if (t === 'subst') return <span style={{ fontSize: 14, color: 'hsl(var(--primary))' }}>🔄</span>;
    if (t === 'var') return <span style={{ fontSize: 14, color: '#f59e0b' }}>🖥️</span>;
    return <span style={{ fontSize: 14 }}>⏱️</span>;
  };

  const formatArabicEventDetail = (detail?: string) => {
    if (!detail) return '';
    const d = detail.toLowerCase();
    if (d.includes('yellow card')) return 'بطاقة صفراء';
    if (d.includes('red card')) return 'بطاقة حمراء';
    if (d.includes('substitution')) return 'تبديل';
    if (d.includes('penalty')) return 'ضربة جزاء';
    if (d.includes('own goal')) return 'هدف في مرماه';
    if (d.includes('goal')) return 'هدف';
    return detail;
  };

  return (
    <div className="event-timeline" style={{ marginTop: 16 }}>
      {events.map((ev, idx) => (
        <div
          key={idx}
          className="event-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
            borderBottom: '1px solid hsl(var(--border) / 0.5)',
          }}
        >
          <span style={{ fontWeight: 700, color: 'hsl(var(--primary))', minWidth: 36, fontSize: 13 }} dir="ltr">
            {formatMatchMinute(ev.time.elapsed, ev.time.extra)}
          </span>
          {renderIcon(ev.type, ev.detail)}
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))', fontSize: 13 }}>
              {ev.player?.name || ev.type}
            </span>
            {ev.assist?.name && (
              <small style={{ color: 'hsl(var(--muted-foreground))', display: 'block', fontSize: 11 }}>
                صناعة / بديل: {ev.assist.name}
              </small>
            )}
            {ev.detail && (
              <small style={{ color: 'hsl(var(--muted-foreground))', display: 'block', fontSize: 11 }}>
                {formatArabicEventDetail(ev.detail)}
              </small>
            )}
          </div>
          {ev.team?.logo && (
            <img
              src={ev.team.logo}
              alt={ev.team.name}
              style={{ width: 20, height: 20, objectFit: 'contain' }}
              title={ev.team.name}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * TASK 4: Real lineups from API-Football
 */
function RealMatchLineups({ matchId }: { matchId: string }) {
  const [lineups, setLineups] = useState<ApiMatchLineup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadRealMatchLineups(matchId).then((data) => {
      setLineups(data);
      setLoading(false);
    });
  }, [matchId]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!lineups.length) {
    return (
      <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, marginTop: 14 }}>
        يتم الإعلان عن التشكيلات الرسمية المؤكدة قبل انطلاق اللقاء بحوالي 45–60 دقيقة.
      </p>
    );
  }

  const getArabicPos = (pos?: string) => {
    if (!pos) return '';
    const p = pos.toUpperCase();
    if (p === 'G' || p === 'GK') return 'حارس';
    if (p === 'D' || p === 'DF' || p === 'CB' || p === 'LB' || p === 'RB') return 'دفاع';
    if (p === 'M' || p === 'MF' || p === 'CM' || p === 'CDM' || p === 'CAM') return 'وسط';
    if (p === 'F' || p === 'FW' || p === 'ST' || p === 'RW' || p === 'LW') return 'هجوم';
    return pos;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 16 }}>
      {lineups.map((ln, idx) => (
        <div
          key={idx}
          style={{
            background: 'hsl(var(--secondary))',
            borderRadius: 12,
            padding: 16,
            border: '1px solid hsl(var(--border))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {ln.team.logo && (
              <img src={ln.team.logo} alt={ln.team.name} style={{ width: 28, height: 28, objectFit: 'contain' }} />
            )}
            <div>
              <b style={{ color: 'hsl(var(--foreground))', fontSize: 14 }}>{getArabicTeamName(ln.team.name)}</b>
              <small style={{ display: 'block', color: 'hsl(var(--primary))' }}>
                الخطة: {ln.formation || '4-3-3'} · المدرب: {ln.coach?.name || 'غير محدد'}
              </small>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', fontWeight: 700 }}>
              التشكيلة الأساسية
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {ln.startXI?.map((p, pIdx) => (
                <div
                  key={pIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'hsl(var(--foreground))',
                  }}
                >
                  <span>
                    <b style={{ color: 'hsl(var(--primary))', marginInlineEnd: 8, display: 'inline-block', width: 20 }}>
                      {p.player.number}
                    </b>
                    {p.player.name}
                  </span>
                  <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 11 }}>{getArabicPos(p.player.pos)}</span>
                </div>
              ))}
            </div>
          </div>

          {ln.substitutes && ln.substitutes.length > 0 && (
            <div>
              <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', fontWeight: 700 }}>
                دكة البدلاء
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
                {ln.substitutes.slice(0, 9).map((p, sIdx) => (
                  <div key={sIdx} style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                    <span style={{ marginInlineEnd: 6 }}>{p.player.number}.</span>
                    {p.player.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * TASK 4: Real match statistics from API-Football
 */
function RealMatchStatistics({ matchId }: { matchId: string }) {
  const [stats, setStats] = useState<ApiMatchStatistic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadRealMatchStatistics(matchId).then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, [matchId]);

  if (loading) return <LoadingSkeleton rows={3} />;
  if (!stats.length || stats.length < 2) {
    return (
      <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, marginTop: 14 }}>
        سيتم تحديث إحصائيات المباراة مباشرة أثناء مجريات اللقاء.
      </p>
    );
  }

  const teamA = stats[0];
  const teamB = stats[1];

  const statMapping: { en: string; ar: string }[] = [
    { en: 'Ball Possession', ar: 'الاستحواذ على الكرة' },
    { en: 'Total Shots', ar: 'إجمالي التسديدات' },
    { en: 'Shots on Goal', ar: 'التسديدات على المرمى' },
    { en: 'Corner Kicks', ar: 'الركلات الركنية' },
    { en: 'Fouls', ar: 'الأخطاء المرتكبة' },
    { en: 'Offsides', ar: 'حالات التسلل' },
    { en: 'Yellow Cards', ar: 'البطاقات الصفراء' },
    { en: 'Goalkeeper Saves', ar: 'تصديات الحارس' },
    { en: 'Total passes', ar: 'إجمالي التمريرات' },
    { en: 'Passes %', ar: 'دقة التمريرات' },
  ];

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Teams header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 8px',
          marginBottom: 4,
        }}
      >
        <span style={{ color: 'hsl(var(--foreground))', fontWeight: 800, fontSize: 14 }}>
          {getArabicTeamName(teamA.team.name)}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          إحصائيات اللقاء
        </span>
        <span style={{ color: 'hsl(var(--foreground))', fontWeight: 800, fontSize: 14 }}>
          {getArabicTeamName(teamB.team.name)}
        </span>
      </div>

      {statMapping.map(({ en, ar }) => {
        const rawValA = teamA.statistics.find((s) => s.type.toLowerCase() === en.toLowerCase())?.value ?? '–';
        const rawValB = teamB.statistics.find((s) => s.type.toLowerCase() === en.toLowerCase())?.value ?? '–';

        const numA = typeof rawValA === 'number' ? rawValA : parseFloat(String(rawValA).replace('%', ''));
        const numB = typeof rawValB === 'number' ? rawValB : parseFloat(String(rawValB).replace('%', ''));

        const hasValidNums = !isNaN(numA) && !isNaN(numB) && numA + numB > 0;
        const pctA = hasValidNums ? Math.round((numA / (numA + numB)) * 100) : 50;
        const pctB = 100 - pctA;

        const isALeading = hasValidNums && numA > numB;
        const isBLeading = hasValidNums && numB > numA;

        return (
          <div key={en} className="match-stat-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              {/* Team A value */}
              <span
                style={{
                  fontWeight: isALeading ? 800 : 700,
                  fontSize: 14,
                  color: isALeading ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                  minWidth: 44,
                }}
              >
                {String(rawValA)}
              </span>

              {/* Stat Name */}
              <span
                style={{
                  color: 'hsl(var(--foreground))',
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: 'center',
                  flex: 1,
                  padding: '0 8px',
                }}
              >
                {ar}
              </span>

              {/* Team B value */}
              <span
                style={{
                  fontWeight: isBLeading ? 800 : 700,
                  fontSize: 14,
                  color: isBLeading ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                  textAlign: 'left',
                  minWidth: 44,
                }}
              >
                {String(rawValB)}
              </span>
            </div>

            {/* Comparison progress bar */}
            {hasValidNums && (
              <div className="match-stat-bar-track">
                <div
                  style={{
                    width: `${pctA}%`,
                    height: '100%',
                    background: isALeading ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.35)',
                    borderRadius: '999px 0 0 999px',
                    transition: 'width 0.4s ease',
                  }}
                />
                <div
                  style={{
                    width: `${pctB}%`,
                    height: '100%',
                    background: isBLeading ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.35)',
                    borderRadius: '0 999px 999px 0',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Hook to compute live countdown to match kickoff
 */
function useMatchCountdown(rawDate?: string) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isPassed: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPassed: false,
  });

  useEffect(() => {
    if (!rawDate) return;
    const kickoffTime = new Date(rawDate).getTime();
    if (isNaN(kickoffTime)) return;

    const calc = () => {
      const now = Date.now();
      const diff = kickoffTime - now;
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isPassed: true });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, isPassed: false });
    };

    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [rawDate]);

  return timeLeft;
}

/**
 * Formats commentary language dynamically (عربي، إنجليزي، إسباني، فرنسي، etc.)
 */
function formatCommentaryLanguage(lang?: string, channelName?: string): string {
  const chLower = (channelName || '').toLowerCase();
  const langLower = (lang || '').toLowerCase().trim();

  if (
    chLower.includes('عربي') ||
    chLower.includes('معلق عربي') ||
    chLower.includes('الرياضية') ||
    chLower.includes('arryadia') ||
    chLower.includes('riadia') ||
    chLower.includes('أبوظبي') ||
    chLower.includes('abudhabi') ||
    chLower.includes('ad sports') ||
    chLower.includes('on time') ||
    chLower.includes('الجزائرية') ||
    chLower.includes('الوطنية') ||
    chLower.includes('dubai') ||
    chLower.includes('ssc') ||
    chLower.includes('alkass') ||
    chLower.includes('morocco') ||
    langLower.includes('arab') ||
    langLower === 'ar' ||
    langLower.includes('عرب')
  ) {
    return 'معلق عربي 🎙️';
  }

  if (
    langLower.includes('eng') ||
    langLower === 'en' ||
    langLower.includes('إنجليز') ||
    langLower.includes('انجليز') ||
    chLower.includes('ion') ||
    chLower.includes('espn') ||
    chLower.includes('one soccer') ||
    chLower.includes('stan') ||
    chLower.includes('sky') ||
    (chLower.includes('tnt') && !chLower.includes('الرياضية') && !chLower.includes('arryadia')) ||
    chLower.includes('nbc')
  ) {
    return 'معلق إنجليزي 🎙️';
  }

  if (
    langLower.includes('span') ||
    langLower === 'es' ||
    langLower.includes('إسبان') ||
    langLower.includes('اسبان') ||
    chLower.includes('movistar') ||
    chLower.includes('dazn')
  ) {
    return 'معلق إسباني 🎙️';
  }

  if (
    langLower.includes('fren') ||
    langLower === 'fr' ||
    langLower.includes('فرنس') ||
    chLower.includes('canal')
  ) {
    return 'معلق فرنسي 🎙️';
  }

  if (
    langLower.includes('port') ||
    langLower === 'pt' ||
    langLower.includes('برتغال') ||
    chLower.includes('sport tv')
  ) {
    return 'معلق برتغالي 🎙️';
  }

  if (
    langLower.includes('ital') ||
    langLower === 'it' ||
    langLower.includes('إيطال') ||
    langLower.includes('ايطال') ||
    chLower.includes('sky sport italia')
  ) {
    return 'معلق إيطالي 🎙️';
  }

  if (
    langLower.includes('germ') ||
    langLower === 'de' ||
    langLower.includes('ألمان') ||
    langLower.includes('المان')
  ) {
    return 'معلق ألماني 🎙️';
  }

  if (
    langLower.includes('turk') ||
    langLower === 'tr' ||
    langLower.includes('ترك')
  ) {
    return 'معلق تركي 🎙️';
  }

  if (lang && lang.toLowerCase() !== 'other') {
    return `معلق (${lang}) 🎙️`;
  }

  return 'معلق عربي 🎙️';
}

interface PreMatchStatisticsProps {
  homeName: string;
  awayName: string;
  homeLogo?: string;
  awayLogo?: string;
  competitionName: string;
}

function PreMatchStatistics({
  homeName,
  awayName,
  homeLogo,
  awayLogo,
  competitionName,
}: PreMatchStatisticsProps) {
  const homeForm = useMemo(
    () => getTeamRecentForm(homeName, true, competitionName, homeLogo),
    [homeName, competitionName, homeLogo]
  );
  const awayForm = useMemo(
    () => getTeamRecentForm(awayName, false, competitionName, awayLogo),
    [awayName, competitionName, awayLogo]
  );
  const h2h = useMemo(
    () => getPreMatchH2H(homeName, awayName, competitionName),
    [homeName, awayName, competitionName]
  );

  return (
    <div className="pre-match-stats-root" dir="rtl" data-testid="pre-match-stats-widget">
      {/* 1. Head-to-Head Section (المواجهات المباشرة بين الفريقين) */}
      <div className="info-card h2h-card">
        <div className="pre-stat-header">
          <div className="pre-stat-icon-title">
            <Trophy size={18} className="text-amber-500" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>المواجهات المباشرة بين الفريقين (H2H)</h3>
          </div>
          <span className="pre-stat-sub">آخر {h2h.summary.total} مواجهات مسجلة</span>
        </div>

        {/* Win / Draw / Loss distribution overview */}
        <div className="h2h-distribution-container">
          <div className="h2h-summary-row">
            <div className="h2h-team-col home">
              <span className="h2h-team-name">{homeName}</span>
              <span className="h2h-wins-count">{h2h.summary.homeWins} فوز</span>
              <span className="h2h-win-pct">{h2h.summary.homeWinPct}%</span>
            </div>
            <div className="h2h-draw-col">
              <span className="h2h-draw-label">التعادل</span>
              <span className="h2h-draw-count">{h2h.summary.draws}</span>
              <span className="h2h-draw-pct">{h2h.summary.drawPct}%</span>
            </div>
            <div className="h2h-team-col away">
              <span className="h2h-team-name">{awayName}</span>
              <span className="h2h-wins-count">{h2h.summary.awayWins} فوز</span>
              <span className="h2h-win-pct">{h2h.summary.awayWinPct}%</span>
            </div>
          </div>

          {/* Tri-color progress comparison bar */}
          <div className="h2h-progress-bar">
            <div
              className="h2h-bar-segment home"
              style={{ width: `${Math.max(h2h.summary.homeWinPct, 5)}%` }}
              title={`فوز ${homeName}: ${h2h.summary.homeWinPct}%`}
            />
            <div
              className="h2h-bar-segment draw"
              style={{ width: `${Math.max(h2h.summary.drawPct, 5)}%` }}
              title={`تعادل: ${h2h.summary.drawPct}%`}
            />
            <div
              className="h2h-bar-segment away"
              style={{ width: `${Math.max(h2h.summary.awayWinPct, 5)}%` }}
              title={`فوز ${awayName}: ${h2h.summary.awayWinPct}%`}
            />
          </div>
        </div>

        {/* List of past encounters */}
        <div className="h2h-matches-list">
          {h2h.matches.map((m, idx) => (
            <div key={idx} className="h2h-match-item">
              <div className="h2h-match-meta">
                <span className="h2h-match-date">{m.date}</span>
                <span className="h2h-match-comp">{m.competition}</span>
              </div>
              <div className="h2h-match-scoreline">
                <span className={`h2h-score-team ${m.winner === 'home' ? 'winner' : ''}`}>
                  {m.homeTeam}
                </span>
                <span className="h2h-score-badge" dir="ltr">
                  {m.homeScore} - {m.awayScore}
                </span>
                <span className={`h2h-score-team ${m.winner === 'away' ? 'winner' : ''}`}>
                  {m.awayTeam}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Recent Form: Last 5 matches for each team (سجل آخر 5 مباريات) */}
      <div className="recent-form-grid">
        {/* Home Team Form */}
        <div className="info-card form-team-card">
          <div className="form-card-header">
            <div className="form-team-ident">
              {homeLogo && (
                <img
                  src={homeLogo}
                  alt={homeName}
                  className="form-team-crest-sm"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <div>
                <h4 className="form-team-title">آخر 5 مباريات لـ {homeName}</h4>
                <div className="form-badges-row">
                  {homeForm.formBadges.map((badge, idx) => (
                    <span
                      key={idx}
                      className={`form-badge-pill ${badge === 'W' ? 'win' : badge === 'D' ? 'draw' : 'loss'}`}
                      title={badge === 'W' ? 'فوز' : badge === 'D' ? 'تعادل' : 'خسارة'}
                    >
                      {badge === 'W' ? 'ف' : badge === 'D' ? 'ت' : 'خ'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="form-stats-summary">
              <span className="stat-highlight green">{homeForm.stats.wins} فوز</span>
              <span className="stat-highlight yellow">{homeForm.stats.draws} تعادل</span>
              <span className="stat-highlight red">{homeForm.stats.losses} هزيمة</span>
            </div>
          </div>

          <div className="form-matches-list">
            {homeForm.matches.map((item, idx) => (
              <div key={idx} className="form-match-row">
                <div className="form-match-date-badge">
                  <span className={`result-mini-badge ${item.result === 'W' ? 'win' : item.result === 'D' ? 'draw' : 'loss'}`}>
                    {item.result === 'W' ? 'فوز' : item.result === 'D' ? 'تعادل' : 'خسارة'}
                  </span>
                  <span className="form-item-date">{item.date}</span>
                </div>
                <div className="form-match-opp">
                  {item.opponentLogo && (
                    <img
                      src={item.opponentLogo}
                      alt={item.opponent}
                      className="opp-crest"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="opp-name">{item.opponent}</span>
                </div>
                <div className="form-match-score">
                  <span className="score-val" dir="ltr">{item.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Away Team Form */}
        <div className="info-card form-team-card">
          <div className="form-card-header">
            <div className="form-team-ident">
              {awayLogo && (
                <img
                  src={awayLogo}
                  alt={awayName}
                  className="form-team-crest-sm"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <div>
                <h4 className="form-team-title">آخر 5 مباريات لـ {awayName}</h4>
                <div className="form-badges-row">
                  {awayForm.formBadges.map((badge, idx) => (
                    <span
                      key={idx}
                      className={`form-badge-pill ${badge === 'W' ? 'win' : badge === 'D' ? 'draw' : 'loss'}`}
                      title={badge === 'W' ? 'فوز' : badge === 'D' ? 'تعادل' : 'خسارة'}
                    >
                      {badge === 'W' ? 'ف' : badge === 'D' ? 'ت' : 'خ'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="form-stats-summary">
              <span className="stat-highlight green">{awayForm.stats.wins} فوز</span>
              <span className="stat-highlight yellow">{awayForm.stats.draws} تعادل</span>
              <span className="stat-highlight red">{awayForm.stats.losses} هزيمة</span>
            </div>
          </div>

          <div className="form-matches-list">
            {awayForm.matches.map((item, idx) => (
              <div key={idx} className="form-match-row">
                <div className="form-match-date-badge">
                  <span className={`result-mini-badge ${item.result === 'W' ? 'win' : item.result === 'D' ? 'draw' : 'loss'}`}>
                    {item.result === 'W' ? 'فوز' : item.result === 'D' ? 'تعادل' : 'خسارة'}
                  </span>
                  <span className="form-item-date">{item.date}</span>
                </div>
                <div className="form-match-opp">
                  {item.opponentLogo && (
                    <img
                      src={item.opponentLogo}
                      alt={item.opponent}
                      className="opp-crest"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="opp-name">{item.opponent}</span>
                </div>
                <div className="form-match-score">
                  <span className="score-val" dir="ltr">{item.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dedicated, professional match details page conforming to requirements 6-12
 */
function MatchDetailsPage() {
  const { matches, teams, competitions, loading } = useMatchZoneData();
  const { id = '' } = useParams<{ id: string }>();
  const [directMatch, setDirectMatch] = useState<Match | null>(null);
  const [fetchingDirect, setFetchingDirect] = useState(false);
  const [activeChannelInfo, setActiveChannelInfo] = useState<{
    channelName?: string;
    lang?: string;
    commentator?: string;
  }>({});

  const matchedFromContext = matches.find((item) => String(item.id) === String(id));

  // Fetch real-time fresh match data from API
  const fetchFreshMatch = useCallback(() => {
    if (!id) return;
    loadRealMatchDetails(id)
      .then((raw) => {
        if (raw) {
          setDirectMatch(normalizeApiFootballFixture(raw));
        }
      })
      .catch((err) => {
        console.warn('[MatchDetailsPage] Live match poll error:', err);
      });
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (!id) return;
    setFetchingDirect(!matchedFromContext);
    loadRealMatchDetails(id)
      .then((raw) => {
        if (raw) {
          setDirectMatch(normalizeApiFootballFixture(raw));
        }
      })
      .finally(() => setFetchingDirect(false));

    // Poll every 15s so scores and elapsed minutes update in real time with the live stream
    const pollTimer = setInterval(fetchFreshMatch, 15000);
    return () => clearInterval(pollTimer);
  }, [id, fetchFreshMatch]);

  // Prioritize direct fresh match data over cached context
  const match = directMatch || matchedFromContext;

  const homeTeam = teams.find((team) => team.id === match?.home);
  const awayTeam = teams.find((team) => team.id === match?.away);
  const comp = competitions.find((c) => c.id === match?.competitionId);

  const homeName = getArabicTeamName(match?.homeName || homeTeam?.name || 'الفريق المضيف');
  const awayName = getArabicTeamName(match?.awayName || awayTeam?.name || 'الفريق الضيف');
  const homeLogo = resolveTeamLogo(match?.homeName || homeTeam?.name, match?.homeLogo || homeTeam?.logoUrl, match?.home);
  const awayLogo = resolveTeamLogo(match?.awayName || awayTeam?.name, match?.awayLogo || awayTeam?.logoUrl, match?.away);

  const compInfo = formatCompetitionInfo({
    id: match?.competitionId,
    name: match?.competitionName || comp?.name,
    country: match?.competitionCountry || comp?.country,
    logo: match?.competitionLogo || comp?.logoUrl,
  });

  const { favorites, toggleFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<'summary' | 'events' | 'lineups' | 'stats'>('summary');
  const countdown = useMatchCountdown(match?.rawDate);

  const [matchEvents, setMatchEvents] = useState<ApiMatchEvent[]>([]);

  useEffect(() => {
    if (!id) return;
    loadRealMatchEvents(id)
      .then((evts) => {
        if (Array.isArray(evts)) {
          setMatchEvents(evts);
        }
      })
      .catch((err) => {
        console.warn('[MatchDetailsPage] Could not load events:', err);
      });
  }, [id]);

  const { homeGoals, awayGoals } = useMemo(() => {
    if (!match) return { homeGoals: [], awayGoals: [] };
    return parseMatchGoalScorers(matchEvents, {
      ...match,
      homeName,
      awayName,
    });
  }, [matchEvents, match, homeName, awayName]);

  if ((loading || fetchingDirect) && !match) {
    return (
      <div className="page-frame match-details-container" dir="rtl">
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="page-frame match-details-container" dir="rtl">
        <EmptyState
          icon={<CircleAlert size={20} />}
          title="المباراة غير متوفرة"
          copy="المباراة المطلوبة غير موجودة في قاعدة البيانات."
          action={
            <Link href="/matches" className="btn btn-primary" data-testid="link-back-empty-matches">
              العودة لجدول المباريات
            </Link>
          }
        />
      </div>
    );
  }

  const kickoffMs = match.rawDate ? new Date(match.rawDate).getTime() : 0;
  const isFutureKickoff = kickoffMs > 0 && kickoffMs > Date.now();

  // Match only goes live once starting whistle blows
  const isLive = match.status === 'live' && !isFutureKickoff;
  const isFinished = match.status === 'finished';
  const isUpcoming = match.status === 'upcoming' || isFutureKickoff;
  const isPostponed = (match as any).isPostponed || match.minute === 'PST';

  // Status-aware tabs: for upcoming matches, show summary, pre-match stats, and predicted lineups
  const tabs: { key: 'summary' | 'events' | 'lineups' | 'stats'; label: string }[] = isUpcoming
    ? [
        { key: 'summary', label: 'نظرة عامة وموعد المباراة' },
        { key: 'stats', label: 'إحصائيات ما قبل المباراة' },
        { key: 'lineups', label: 'التشكيلة المتوقعة' },
      ]
    : [
        { key: 'summary', label: 'نظرة عامة' },
        { key: 'events', label: 'شريط الأحداث' },
        { key: 'stats', label: 'الإحصائيات' },
        { key: 'lineups', label: 'التشكيلة الرسمية' },
      ];

  return (
    <div className="page-frame match-details-container" dir="rtl">
      {/* Top Breadcrumb Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Link href="/matches" className="section-link" data-testid="link-back-matches">
          ← العودة لجدول المباريات
        </Link>
      </div>

      {/* Main Professional Match Details Hero Card */}
      <div className="match-details-hero" data-testid={`match-details-${match.id}`}>
        {/* Header: [Competition] [Country] on Right (RTL), [Status] on Left */}
        <div className="match-details-topbar">
          <div className="match-comp-identity">
            {compInfo.competitionLogo ? (
              <img
                src={compInfo.competitionLogo}
                alt={compInfo.competitionName}
                className="match-comp-logo"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Trophy size={20} className="text-amber-500" />
            )}
            <span className="match-comp-name">{compInfo.competitionName}</span>
            <span className="match-comp-country">{compInfo.competitionCountry}</span>
            {match.round && (
              <span style={{ fontSize: 12, opacity: 0.75, marginInlineStart: 4 }}>
                · {getArabicRound(match.round)}
              </span>
            )}
          </div>

          <div className="match-status-wrap">
            {isPostponed ? (
              <span className="match-status-badge match-status-postponed" data-testid="badge-status-postponed">
                مؤجلة
              </span>
            ) : null}
          </div>
        </div>

        {/* Scoreboard: Home Team — Score/Time/VS — Away Team */}
        <div className="match-scoreboard-grid">
          {/* Home Team */}
          <div className="match-team-block home">
            <div className="match-team-crest">
              <img
                src={homeLogo}
                alt={homeName}
                className="match-team-logo-img"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = resolveTeamLogo(homeName);
                }}
              />
            </div>
            <h2 className="match-team-title" title={homeName}>
              {homeName}
            </h2>

            {/* Goalscorers under Home Team */}
            {homeGoals.length > 0 && (
              <div className="team-goalscorers-list" data-testid="home-goalscorers">
                {homeGoals.map((g, idx) => (
                  <div key={idx} className="goalscorer-item">
                    <span className="goal-icon">⚽</span>
                    <span className="goalscorer-name">{g.playerName}</span>
                    <span className="goal-minute" dir="ltr">{g.minute}</span>
                    {g.isPenalty && <span className="goal-tag-badge">ر.ج</span>}
                    {g.isOwnGoal && <span className="goal-tag-badge own">هـ.ذ</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Center Board: Score / Kickoff Time */}
          <div className="match-center-board">
            {isUpcoming ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="match-big-score" style={{ fontSize: 32, letterSpacing: 1 }}>
                  VS
                </span>
                <span className="match-timing-sub" style={{ marginTop: 4 }}>
                  {match.date} • {match.kickoffTime || match.time}
                </span>

                {/* Countdown clock for upcoming match */}
                {!countdown.isPassed && (countdown.hours > 0 || countdown.minutes > 0 || countdown.seconds > 0) && (
                  <div className="match-countdown-box" title="الوقت المتبقي حتى الانطلاق">
                    <div className="match-countdown-item">
                      <span className="match-countdown-num">{String(countdown.hours).padStart(2, '0')}</span>
                      <span className="match-countdown-unit">ساعة</span>
                    </div>
                    <span style={{ fontWeight: 800, color: 'hsl(var(--muted-foreground))' }}>:</span>
                    <div className="match-countdown-item">
                      <span className="match-countdown-num">{String(countdown.minutes).padStart(2, '0')}</span>
                      <span className="match-countdown-unit">دقيقة</span>
                    </div>
                    <span style={{ fontWeight: 800, color: 'hsl(var(--muted-foreground))' }}>:</span>
                    <div className="match-countdown-item">
                      <span className="match-countdown-num">{String(countdown.seconds).padStart(2, '0')}</span>
                      <span className="match-countdown-unit">ثانية</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className={`match-big-score ${isLive ? 'match-score-live-highlight' : ''}`}>
                  <span>{match.homeScore ?? 0}</span>
                  <span style={{ opacity: 0.5 }}>-</span>
                  <span>{match.awayScore ?? 0}</span>
                </div>
                <div className="match-timing-sub" style={{ marginTop: 6 }}>
                  {isLive ? (
                    match.minute === 'إستراحة' || match.minute === 'HT' ? (
                      <span className="match-halftime-highlight">
                        إستراحة
                      </span>
                    ) : (
                      <span>
                        الدقيقة <span dir="ltr">{formatMatchMinute(match.minute) || 'جارية الآن'}</span>
                      </span>
                    )
                  ) : (
                    `النتيجة النهائية (${match.date})`
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="match-team-block away">
            <div className="match-team-crest">
              <img
                src={awayLogo}
                alt={awayName}
                className="match-team-logo-img"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = resolveTeamLogo(awayName);
                }}
              />
            </div>
            <h2 className="match-team-title" title={awayName}>
              {awayName}
            </h2>

            {/* Goalscorers under Away Team */}
            {awayGoals.length > 0 && (
              <div className="team-goalscorers-list" data-testid="away-goalscorers">
                {awayGoals.map((g, idx) => (
                  <div key={idx} className="goalscorer-item">
                    <span className="goal-icon">⚽</span>
                    <span className="goalscorer-name">{g.playerName}</span>
                    <span className="goal-minute" dir="ltr">{g.minute}</span>
                    {g.isPenalty && <span className="goal-tag-badge">ر.ج</span>}
                    {g.isOwnGoal && <span className="goal-tag-badge own">هـ.ذ</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================
            LIVE VIDEO PLAYER INTEGRATION (REQUIREMENT 8)
            ONLY shown when:
            1. The match status is genuinely LIVE
            AND
            2. An authorized stream URL is available from the configured provider.
            If match is LIVE but no stream: Show "البث المباشر غير متوفر حالياً"
            If match is upcoming/finished/postponed: DO NOT SHOW VIDEO PLAYER!
           ============================================================ */}
        {/* ============================================================
            BROADCAST & LIVE STREAM SECTION WITH SERVER SWITCHING
           ============================================================ */}

        {/* ============================================================
            LIVE SOURCES SYSTEM (Provider-Agnostic, Legitimate Permitted Streams)
            - Live: queries provider / models, displays permitted player or
                    "البث المباشر غير متوفر حالياً"
            - Upcoming: displays kickoff info, NO live player
            - Finished: displays final score & summary, NO live player
           ============================================================ */}
        <div style={{ marginTop: 20 }}>
          <LiveSources
            matchId={match.id}
            status={isLive ? 'live' : isFinished ? 'finished' : 'upcoming'}
            homeName={homeName}
            awayName={awayName}
            rawHomeName={match.homeName || homeTeam?.name}
            rawAwayName={match.awayName || awayTeam?.name}
            competitionName={compInfo.originalName || compInfo.competitionName}
            kickoffTime={match.kickoffTime || match.time}
            date={match.date}
            rawDate={match.rawDate}
            onActiveChannelChange={setActiveChannelInfo}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="match-details-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`match-details-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`btn-detail-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="detail-panel" style={{ marginTop: 20 }}>
        {activeTab === 'summary' && (
          <>
            <div className="info-card">
              <h3>معلومات اللقاء</h3>
              <div className="info-row">
                <span>البطولة</span>
                <b>{compInfo.competitionName}</b>
              </div>
              <div className="info-row">
                <span>الدولة / الاتحاد</span>
                <b>{compInfo.competitionCountry}</b>
              </div>
              <div className="info-row">
                <span>الملعب</span>
                <b style={{ color: '#60A5FA', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} style={{ color: '#3B82F6' }} />
                  {resolveMatchStadium({
                    venue: match.venue,
                    homeName,
                    awayName,
                    country: compInfo.competitionCountry,
                    competitionName: compInfo.competitionName,
                  })}
                </b>
              </div>
              {(() => {
                const currentChannel = activeChannelInfo.channelName || match.channel || resolveMatchBroadcaster({
                  homeName,
                  awayName,
                  competitionName: compInfo.competitionName,
                  competitionId: match.competitionId,
                  knownChannel: match.channel,
                });
                const currentCommentator = resolveMatchCommentator({
                  matchId: match.id,
                  homeName,
                  awayName,
                  competitionName: compInfo.competitionName,
                  channelName: currentChannel,
                  rawCommentator: activeChannelInfo.commentator || match.commentator,
                });
                return (
                  <>
                    <div className="info-row">
                      <span>القناة الناقلة</span>
                      <b style={{ color: '#C084FC', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Tv size={14} style={{ color: '#A855F7' }} />
                        {currentChannel}
                      </b>
                    </div>
                    <div className="info-row">
                      <span>المعلق الصوتي</span>
                      <b style={{ color: '#34D399', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Mic size={14} style={{ color: '#10B981' }} />
                        {currentCommentator}
                      </b>
                    </div>
                  </>
                );
              })()}
              <div className="info-row">
                <span>موعد الانطلاق</span>
                <b>{match.date} · {match.kickoffTime || match.time}</b>
              </div>
              <div className="info-row">
                <span>الحالة</span>
                <b>
                  {isLive ? (
                    match.minute === 'إستراحة' || match.minute === 'HT' ? (
                      <span style={{ color: '#EAB308', fontWeight: 800 }}>إستراحة</span>
                    ) : (
                      <span>
                        مباشر الآن (<span dir="ltr">{formatMatchMinute(match.minute) || 'جارية'}</span>)
                      </span>
                    )
                  ) : isFinished ? (
                    'انتهت المباراة'
                  ) : isPostponed ? (
                    'مؤجلة'
                  ) : (
                    'قادمة'
                  )}
                </b>
              </div>
            </div>

            <div className="info-card">
              <h3>خيارات المشاهدة والمتابعة</h3>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                {isLive
                  ? 'المباراة جارية حالياً، يمكنك متابعة البث المباشر المعتمد في قسم المشغل أعلاه مع تحديثات النتيجة والأحداث لحظة بلحظة.'
                  : isFinished
                  ? 'اكتملت المباراة بالنتيجة النهائية المدونة أعلاه. يمكنك مراجعة شريط الأهداف والإحصائيات.'
                  : 'ستنطلق المباراة في الموعد المحدد. احفظها في المفضلة ليصلك إشعار عند البداية.'}
              </p>
              <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button
                  variant={favorites.includes(match.id) ? 'secondary' : 'primary'}
                  onClick={() => toggleFavorite(match.id)}
                >
                  {favorites.includes(match.id) ? '⭐ في المفضلة' : '⭐ إضافة للمفضلة'}
                </Button>
              </div>
            </div>

            {/* If match is upcoming, render pre-match stats (H2H + Last 5 matches) directly in overview */}
            {isUpcoming && (
              <div style={{ gridColumn: '1 / -1', marginTop: 14 }}>
                <PreMatchStatistics
                  homeName={homeName}
                  awayName={awayName}
                  homeLogo={homeLogo}
                  awayLogo={awayLogo}
                  competitionName={compInfo.competitionName}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'events' && (
          <div className="info-card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} /> شريط أحداث المباراة
            </h3>
            <RealMatchEventTimeline matchId={match.id} />
          </div>
        )}

        {activeTab === 'lineups' && (
          <div className="info-card" style={{ gridColumn: '1 / -1' }}>
            <h3>التشكيلات الرسمية المؤكدة</h3>
            <RealMatchLineups matchId={match.id} />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="info-card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={18} className="text-amber-500" />
              {isUpcoming ? 'إحصائيات وتحليل ما قبل المباراة' : 'إحصائيات اللقاء الكاملة'}
            </h3>
            {isUpcoming ? (
              <PreMatchStatistics
                homeName={homeName}
                awayName={awayName}
                homeLogo={homeLogo}
                awayLogo={awayLogo}
                competitionName={compInfo.competitionName}
              />
            ) : (
              <RealMatchStatistics matchId={match.id} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Fullscreen / Theater Watch Page powered by LiveSources component
 */
function WatchPage() {
  const { matches, teams } = useMatchZoneData();
  const { id = '' } = useParams<{ id: string }>();
  const [directMatch, setDirectMatch] = useState<Match | null>(null);
  const matchedFromContext = matches.find((item) => String(item.id) === String(id));

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (!matchedFromContext && id) {
      loadRealMatchDetails(id).then((raw) => {
        if (raw) setDirectMatch(normalizeApiFootballFixture(raw));
      });
    }
  }, [id, matchedFromContext]);

  const match = matchedFromContext || directMatch;

  const homeTeam = teams.find((t) => t.id === match?.home);
  const awayTeam = teams.find((t) => t.id === match?.away);

  const homeName = getArabicTeamName(match?.homeName || homeTeam?.name || 'الفريق المضيف');
  const awayName = getArabicTeamName(match?.awayName || awayTeam?.name || 'الفريق الضيف');
  const homeLogo = resolveTeamLogo(match?.homeName || homeTeam?.name, match?.homeLogo || homeTeam?.logoUrl, match?.home);
  const awayLogo = resolveTeamLogo(match?.awayName || awayTeam?.name, match?.awayLogo || awayTeam?.logoUrl, match?.away);

  if (!match) {
    return (
      <div className="page-frame match-details-container" dir="rtl">
        <EmptyState
          icon={<CircleAlert size={20} />}
          title="المباراة غير متوفرة"
          copy="المباراة المطلوبة غير متوفرة حالياً."
          action={
            <Link href="/matches" className="btn btn-primary">
              العودة لجدول المباريات
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-frame match-details-container" dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Link href={`/match/${match.id}`} className="section-link" data-testid="link-back-match-details">
          ← العودة لتفاصيل المباراة الكاملة
        </Link>
        <span style={{ fontSize: 13, color: '#94A3B8' }}>وضع المشاهدة المباشرة</span>
      </div>

      {/* Match Scoreboard Summary */}
      <div
        style={{
          background: '#111827',
          border: '1px solid #253044',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%', maxWidth: 650 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 140, textAlign: 'center' }}>
            <img
              src={homeLogo}
              alt={homeName}
              style={{ width: 44, height: 44, objectFit: 'contain' }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = resolveTeamLogo(homeName);
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>{homeName}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{match.homeScore ?? 0}</span>
              <span style={{ opacity: 0.5 }}>:</span>
              <span>{match.awayScore ?? 0}</span>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: match.status === 'live'
                  ? (match.minute === 'إستراحة' || match.minute === 'HT' ? '#EAB308' : '#ef4444')
                  : '#1e293b',
                color: match.status === 'live' && (match.minute === 'إستراحة' || match.minute === 'HT') ? '#000' : '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: 20,
              }}
            >
              {match.status === 'live' ? (
                match.minute === 'إستراحة' || match.minute === 'HT' ? (
                  <span>إستراحة</span>
                ) : (
                  <span>
                    مباشر <span dir="ltr">{formatMatchMinute(match.minute)}</span>
                  </span>
                )
              ) : (
                match.time
              )}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 140, textAlign: 'center' }}>
            {awayLogo ? (
              <img src={awayLogo} alt={awayName} style={{ width: 44, height: 44, objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center' }}>
                {awayName.slice(0, 3)}
              </div>
            )}
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>{awayName}</span>
          </div>
        </div>
      </div>

      {/* Live Sources System */}
      <LiveSources
        matchId={match.id}
        status={match.status}
        homeName={homeName}
        awayName={awayName}
        rawHomeName={match.homeName || homeTeam?.name}
        rawAwayName={match.awayName || awayTeam?.name}
        competitionName={match.competitionName}
        kickoffTime={match.kickoffTime || match.time}
        date={match.date}
        rawDate={match.rawDate}
      />
    </div>
  );
}

function FavoritesPage() {
  const { matches } = useMatchZoneData();
  const { favorites, toggleFavorite } = useFavorites();
  const saved = matches.filter((match) => favorites.includes(match.id));

  return (
    <div className="page-frame">
      <PageHeading
        eyebrow="قائمتك الخاصة"
        title="المباريات المفضلة"
        subtitle="المباريات والفرق التي اخترت متابعتها والاهتمام بها."
      />
      {saved.length ? (
        <div className="match-grid" style={{ marginTop: 30 }}>
          {saved.map((match) => (
            <MatchCard key={match.id} match={match} favorite onFavorite={toggleFavorite} />
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 28 }}>
          <EmptyState
            icon={<Heart size={19} />}
            title="قائمتك المفضلة فارغة حالياً"
            copy="اضغط على رمز النجمة ⭐ في أي بطاقة مباراة لإضافتها إلى قائمة مفضلتك الشخصية."
            action={
              <Link href="/matches" className="btn btn-primary" data-testid="link-favorites-browse">
                تصفح المباريات
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function LoginPage({ register }: { register?: boolean }) {
  const { signIn, sendVerification, verifyAndSignUp, signInWithGoogle, forgotPassword, resetPassword } = useAuth();
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Email verification OTP step states (for register)
  const [regStep, setRegStep] = useState<'form' | 'otp'>('form');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password flow states
  const [forgotMode, setForgotMode] = useState<'none' | 'email' | 'otp_new_password' | 'success'>('none');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setRegStep('form');
    setForgotMode('none');
    setError('');
    setSubmitted(false);
    setOtpCode('');
    setForgotOtp('');
    setForgotEmail('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowNewPassword(false);
  }, [register]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !formData.email) return;
    setError('');
    setSubmitted(true);
    try {
      await sendVerification(formData.email, formData.name);
      setResendCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إعادة إرسال رمز التحقق.');
    } finally {
      setSubmitted(false);
    }
  };

  const handleSendForgotCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!forgotEmail.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    setError('');
    setSubmitted(true);
    try {
      await forgotPassword(forgotEmail.trim().toLowerCase());
      setForgotCooldown(60);
      setForgotMode('otp_new_password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال رمز التحقق. يرجى التأكد من البريد الإلكتروني.');
    } finally {
      setSubmitted(false);
    }
  };

  const handleResendForgotCode = async () => {
    if (forgotCooldown > 0 || !forgotEmail) return;
    setError('');
    setSubmitted(true);
    try {
      await forgotPassword(forgotEmail.trim().toLowerCase());
      setForgotCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إعادة إرسال رمز التحقق.');
    } finally {
      setSubmitted(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (forgotOtp.length !== 6) {
      setError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }
    if (newPassword.length < 8) {
      setError('يجب ألا تقل كلمة المرور عن 8 أحرف');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    setError('');
    setSubmitted(true);
    try {
      await resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        code: forgotOtp.trim(),
        newPassword,
      });
      setForgotMode('success');
      setTimeout(() => {
        setLocation('/');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'رمز التحقق غير صحيح أو انتهت صلاحيته.');
      setSubmitted(false);
    }
  };

  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '64012684884-6422im2keevaav2co3d6mubm6v6614k4.apps.googleusercontent.com';

  const handleGoogleSubmit = async (
    input: { credential?: string; email?: string; displayName?: string; avatarUrl?: string } | string,
    nameToUse?: string,
    avatarToUse?: string
  ) => {
    setError('');
    setSubmitted(true);
    try {
      if (typeof input === 'string') {
        const email = input.trim();
        const displayName = nameToUse || email.split('@')[0];
        const avatarUrl =
          avatarToUse ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=16a34a&textColor=ffffff`;
        await signInWithGoogle({
          email,
          displayName,
          avatarUrl,
        });
      } else {
        await signInWithGoogle(input);
      }
      setShowGoogleModal(false);
      setLocation('/');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر تسجيل الدخول بواسطة Google.');
      setSubmitted(false);
    }
  };

  useEffect(() => {
    // Check if redirected with access_token in URL hash
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        setSubmitted(true);
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then(async (profile: { email?: string; name?: string; picture?: string }) => {
            if (profile.email) {
              await signInWithGoogle({
                email: profile.email,
                displayName: profile.name,
                avatarUrl: profile.picture,
              });
              window.history.replaceState(null, '', window.location.pathname);
              setLocation('/');
            }
          })
          .catch(() => {
            setError('تعذر استرجاع بيانات حساب Google.');
            setSubmitted(false);
          });
      }
    }
  }, []);

  const triggerGoogleOAuth = () => {
    setError('');

    // Google Identity Services OAuth2 Token Client - Opens real Google Account Chooser popup with all user's Gmail accounts
    // @ts-expect-error Google Identity Services OAuth2
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      try {
        // @ts-expect-error Google Identity Services OAuth2
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: { access_token?: string; error?: string }) => {
            if (tokenResponse.error) {
              console.log('Google login cancelled or closed:', tokenResponse.error);
              return;
            }
            if (tokenResponse.access_token) {
              setSubmitted(true);
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const profile = (await res.json()) as { email?: string; name?: string; picture?: string };
                if (profile.email) {
                  await signInWithGoogle({
                    email: profile.email,
                    displayName: profile.name,
                    avatarUrl: profile.picture,
                  });
                  setLocation('/');
                }
              } catch (fetchError) {
                setError(fetchError instanceof Error ? fetchError.message : 'تعذر استرجاع بيانات الحساب من Google');
                setSubmitted(false);
              }
            }
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.error('OAuth2 initTokenClient error:', err);
      }
    }

    // Fallback if Google GIS script failed to load
    setShowGoogleModal(true);
  };

  const isOtpStep = register && regStep === 'otp';

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            {forgotMode === 'email'
              ? 'استعادة كلمة المرور'
              : forgotMode === 'otp_new_password'
              ? 'إعادة تعيين كلمة المرور'
              : forgotMode === 'success'
              ? 'تم تحديث كلمة المرور'
              : isOtpStep
              ? 'أدخل رمز التحقق'
              : register
              ? 'انضم إلى مجتمع MatchZone'
              : 'تسجيل الدخول إلى MatchZone'}
          </h1>
          <p className="auth-subtitle">
            {forgotMode === 'email'
              ? 'أدخل بريدك الإلكتروني وسنرسل لك رمز تحقق (OTP) لإعادة تعيين كلمة المرور.'
              : forgotMode === 'otp_new_password'
              ? `أرسلنا رمز تحقق (6 أرقام) إلى ${forgotEmail}. يرجى إدخاله وتعيين كلمة المرور الجديدة.`
              : forgotMode === 'success'
              ? 'تم تغيير كلمة المرور بنجاح. جاري تسجيل الدخول ونقلك إلى الصفحة الرئيسية...'
              : isOtpStep
              ? `أرسلنا رمز تحقق (6 أرقام) إلى ${formData.email}. يرجى إدخاله لتأكيد حسابك.`
              : register
              ? 'تابع أنديتك وبطولاتك المفضلة وتلقى النتائج والبث المباشر أولاً بأول.'
              : 'مبارياتك وفرقك المفضلة وأحدث أهداف المباريات في انتظارك.'}
          </p>
        </div>

        {forgotMode === 'none' && !isOtpStep && (
          <>
            {/* Single Clean Google / Gmail Auth Button */}
            <button
              type="button"
              className="auth-google-btn"
              onClick={triggerGoogleOAuth}
              disabled={submitted}
              data-testid="button-auth-google"
            >
              <span>{register ? 'التسجيل بواسطة حساب Google' : 'تسجيل الدخول بواسطة Google'}</span>
              <GoogleIcon />
            </button>

            <div className="auth-divider">
              <span>أو بالبريد الإلكتروني</span>
            </div>
          </>
        )}

        {forgotMode === 'success' ? (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div className="profile-success-icon-wrap" style={{ margin: '0 auto 18px' }}>
              <CheckCircle2 size={46} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px', color: '#10b981' }}>
              تم تغيير كلمة المرور بنجاح!
            </h3>
            <p style={{ fontSize: '13.5px', color: '#94a3b8', margin: '0 0 20px' }}>
              تم تسجيل دخولك بنجاح. جاري نقلك إلى الصفحة الرئيسية...
            </p>
            <div className="profile-success-loader">
              <div className="profile-success-loader-bar" />
            </div>
          </div>
        ) : forgotMode === 'email' ? (
          <form className="auth-form" onSubmit={handleSendForgotCode}>
            <div className="form-field">
              <label className="form-label" htmlFor="forgot-email">
                البريد الإلكتروني لحسابك
              </label>
              <div className="form-input-wrap">
                <Mail className="form-input-icon" size={17} />
                <input
                  id="forgot-email"
                  className="form-input has-icon"
                  type="email"
                  required
                  autoFocus
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  data-testid="input-forgot-email"
                />
              </div>
            </div>

            {error && (
              <div className="auth-error-alert" role="alert">
                <CircleAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={submitted}
              data-testid="button-send-forgot-otp"
            >
              {submitted ? 'جاري إرسال الرمز...' : 'إرسال رمز التحقق إلى البريد'}
            </button>
          </form>
        ) : forgotMode === 'otp_new_password' ? (
          <form className="auth-form" onSubmit={handleResetPassword}>
            <div className="form-field">
              <label className="form-label" htmlFor="forgot-otp">
                رمز التحقق المكون من 6 أرقام
              </label>
              <div className="form-input-wrap">
                <KeyRound className="form-input-icon" size={17} />
                <input
                  id="forgot-otp"
                  className="form-input has-icon"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  style={{
                    letterSpacing: '8px',
                    textAlign: 'center',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    direction: 'ltr',
                  }}
                  data-testid="input-forgot-otp"
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="new-password">
                كلمة المرور الجديدة (8 أحرف على الأقل)
              </label>
              <div className="form-input-wrap">
                <LockKeyhole className="form-input-icon" size={17} />
                <input
                  id="new-password"
                  className="form-input has-icon"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: showNewPassword ? '#10b981' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    transition: 'color 0.18s ease',
                  }}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="confirm-password">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="form-input-wrap">
                <LockKeyhole className="form-input-icon" size={17} />
                <input
                  id="confirm-password"
                  className="form-input has-icon"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                  data-testid="input-confirm-password"
                />
              </div>
            </div>

            {error && (
              <div className="auth-error-alert" role="alert">
                <CircleAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={submitted || forgotOtp.length !== 6 || newPassword.length < 8}
              data-testid="button-reset-password-submit"
            >
              {submitted ? 'جاري الحفظ...' : 'تحديث كلمة المرور والمتابعة'}
            </button>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                fontSize: '13px',
                gap: '8px',
              }}
            >
              <button
                type="button"
                disabled={forgotCooldown > 0 || submitted}
                onClick={handleResendForgotCode}
                style={{
                  background: 'none',
                  border: 'none',
                  color: forgotCooldown > 0 ? '#64748b' : '#22c55e',
                  cursor: forgotCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '4px',
                }}
              >
                {forgotCooldown > 0 ? `إعادة الإرسال بعد (${forgotCooldown} ث)` : 'إعادة إرسال الرمز'}
              </button>

              <button
                type="button"
                disabled={submitted}
                onClick={() => {
                  setForgotMode('email');
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '4px',
                }}
              >
                تعديل البريد الإلكتروني
              </button>
            </div>
          </form>
        ) : isOtpStep ? (
          <form
            className="auth-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (otpCode.length !== 6) {
                setError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
                return;
              }
              setError('');
              setSubmitted(true);
              try {
                await verifyAndSignUp(formData.email, otpCode, formData.password, formData.name);
                setLocation('/');
              } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : 'رمز التحقق غير صحيح أو انتهت صلاحيته.');
                setSubmitted(false);
              }
            }}
          >
            <div className="form-field">
              <label className="form-label" htmlFor="otpCode">
                رمز التحقق المكون من 6 أرقام
              </label>
              <div className="form-input-wrap">
                <KeyRound className="form-input-icon" size={17} />
                <input
                  id="otpCode"
                  name="otpCode"
                  className="form-input has-icon"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  style={{
                    letterSpacing: '8px',
                    textAlign: 'center',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    direction: 'ltr',
                  }}
                  data-testid="input-auth-otp"
                />
              </div>
            </div>

            {error && (
              <div className="auth-error-alert" role="alert">
                <CircleAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={submitted || otpCode.length !== 6}
              data-testid="button-auth-verify-submit"
            >
              {submitted ? 'جاري التحقق...' : 'تأكيد الحساب ومتابعة'}
            </button>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                fontSize: '13px',
                gap: '8px',
              }}
            >
              <button
                type="button"
                disabled={resendCooldown > 0 || submitted}
                onClick={handleResendCode}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? '#64748b' : '#22c55e',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '4px',
                }}
              >
                {resendCooldown > 0 ? `إعادة الإرسال بعد (${resendCooldown} ث)` : 'إعادة إرسال الرمز'}
              </button>

              <button
                type="button"
                disabled={submitted}
                onClick={() => {
                  setRegStep('form');
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '4px',
                }}
              >
                تعديل البريد الإلكتروني
              </button>
            </div>
          </form>
        ) : (
          <form
            className="auth-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              setSubmitted(true);
              const form = new FormData(event.currentTarget);
              const email = String(form.get('email')).trim().toLowerCase();
              const password = String(form.get('password'));
              const name = String(form.get('name') ?? '').trim();

              try {
                if (register) {
                  // Step 1: Send verification code to email
                  await sendVerification(email, name);
                  setFormData({ name, email, password });
                  setResendCooldown(60);
                  setRegStep('otp');
                  setSubmitted(false);
                } else {
                  await signIn(email, password);
                  setLocation('/');
                }
              } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : 'تعذر إتمام العملية.');
                setSubmitted(false);
              }
            }}
          >
            {register && (
              <div className="form-field">
                <label className="form-label" htmlFor="name">
                  الاسم الكامل
                </label>
                <div className="form-input-wrap">
                  <UserRound className="form-input-icon" size={17} />
                  <input
                    id="name"
                    name="name"
                    className="form-input has-icon"
                    required
                    minLength={2}
                    placeholder="محمد علي"
                    defaultValue={formData.name}
                    data-testid="input-auth-name"
                  />
                </div>
              </div>
            )}
            <div className="form-field">
              <label className="form-label" htmlFor="email">
                البريد الإلكتروني
              </label>
              <div className="form-input-wrap">
                <Mail className="form-input-icon" size={17} />
                <input
                  id="email"
                  name="email"
                  className="form-input has-icon"
                  type="email"
                  required
                  placeholder="you@example.com"
                  defaultValue={formData.email}
                  data-testid="input-auth-email"
                />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="password">
                كلمة المرور
              </label>
              <div className="form-input-wrap">
                <LockKeyhole className="form-input-icon" size={17} />
                <input
                  id="password"
                  name="password"
                  className="form-input has-icon"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={register ? 8 : undefined}
                  placeholder="••••••••"
                  defaultValue={formData.password}
                  data-testid="input-auth-password"
                  style={{ paddingLeft: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: showPassword ? '#10b981' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    transition: 'color 0.18s ease',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!register && (
                <div className="auth-forgot-row">
                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => {
                      setForgotMode('email');
                      setError('');
                    }}
                    data-testid="link-forgot-password"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}
            </div>
            {error && (
              <div className="auth-error-alert" role="alert">
                <CircleAlert size={16} />
                <span>{error}</span>
              </div>
            )}
            <button type="submit" className="auth-submit-btn" disabled={submitted} data-testid="button-auth-submit">
              {submitted ? 'جاري المعالجة...' : register ? 'متابعة وإرسال رمز التحقق' : 'تسجيل الدخول'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          {forgotMode !== 'none' ? (
            <button
              type="button"
              onClick={() => {
                setForgotMode('none');
                setError('');
              }}
              className="auth-switch-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13.5px' }}
              data-testid="link-back-to-login"
            >
              العودة إلى تسجيل الدخول
            </button>
          ) : (
            <>
              <span>{register ? 'هل لديك حساب بالفعل؟' : 'جديد في MatchZone؟'}</span>
              <Link href={register ? '/login' : '/register'} className="auth-switch-link" data-testid="link-auth-switch">
                {register ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Google Sign-in Interactive Modal */}
      {showGoogleModal && (
        <div className="google-modal-backdrop" onClick={() => setShowGoogleModal(false)}>
          <div className="google-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="google-modal-header">
              <div className="google-logo-wrapper">
                <GoogleIcon />
              </div>
              <h3>تسجيل الدخول عبر Google</h3>
              <p>اختر حساب Google للمتابعة إلى MatchZone</p>
            </div>

            <div className="google-accounts-list">
              <button
                type="button"
                className="google-account-item"
                onClick={() => handleGoogleSubmit('hamzaelmeski47@gmail.com', 'hamza El miski')}
              >
                <div className="google-account-avatar">H</div>
                <div className="google-account-info">
                  <span className="google-account-name">hamza El miski</span>
                  <span className="google-account-email">hamzaelmeski47@gmail.com</span>
                </div>
              </button>
            </div>

            <div className="google-modal-divider">
              <span>أو أدخل بريدك في Gmail</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (googleEmail) {
                  handleGoogleSubmit(googleEmail, googleName || undefined);
                }
              }}
              className="google-custom-form"
            >
              <input
                type="email"
                className="form-input"
                placeholder="username@gmail.com"
                required
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder="اسم المستخدم (اختياري)"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
              />
              <div className="google-modal-actions">
                <button type="submit" className="auth-submit-btn" style={{ margin: 0, width: '100%' }}>
                  متابعة بواسطة Gmail
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowGoogleModal(false)}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfilePage() {
  const { user, updateProfile, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [toast, setToast] = useState('');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? '');
      setAvatarUrl(user.avatarUrl ?? null);
    }
  }, [user]);

  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setToast('يرجى اختيار ملف صورة صالح');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 240, 240);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setAvatarUrl(dataUrl);
          setToast('تم اختيار الصورة! انقر على "حفظ التغييرات" لتثبيتها');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!displayName.trim()) {
      setToast('يرجى إدخال اسم العرض');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        avatarUrl,
      });
      setShowSuccessModal(true);
      setTimeout(() => {
        setLocation('/');
      }, 1200);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'تعذر حفظ التغييرات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    signOut();
    setLocation('/login');
  };

  return (
    <div className="page-frame">
      <PageHeading eyebrow="الحساب / الإعدادات" title="الملف الشخصي" subtitle="إدارة بيانات حسابك وتفضيلات المشاهدة." />
      <div className="profile-layout">
        <aside className="profile-side">
          <div className="profile-avatar-wrapper">
            <div
              className={`profile-avatar ${avatarUrl ? 'profile-avatar-clickable' : ''}`}
              onClick={() => {
                if (avatarUrl) {
                  setPreviewPhotoModal(true);
                } else {
                  fileInputRef.current?.click();
                }
              }}
              title={avatarUrl ? 'انقر لمعاينة الصورة بالحجم الكامل' : 'انقر لاختيار صورة للملف الشخصي'}
              role="button"
              tabIndex={0}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName || 'المستخدم'}
                  referrerPolicy="no-referrer"
                  className="profile-avatar-img"
                />
              ) : (
                (displayName || user?.displayName || 'MZ').slice(0, 2).toUpperCase()
              )}
            </div>
            <button
              type="button"
              className="profile-avatar-edit-badge"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              title="تغيير صورة الملف الشخصي"
              data-testid="btn-avatar-edit"
            >
              <Camera size={15} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarFile(file);
              }}
            />
          </div>

          <div className="profile-side-info">
            <h2>{displayName || user?.displayName || 'مشجع MatchZone'}</h2>
            <p>{user?.email ?? 'سجل الدخول لإدارة حسابك'}</p>
          </div>
        </aside>
        <div className="profile-main">
          <section className="profile-section">
            <h2 className="profile-section-title">بياناتك الشخصية</h2>
            <p className="profile-section-desc">هذه التفاصيل محفوظة في حسابك بـ MatchZone.</p>
            <div className="form-field">
              <label className="form-label" htmlFor="profile-name">
                اسم العرض
              </label>
              <div className="form-input-wrap">
                <UserRound className="form-input-icon" size={17} />
                <input
                  id="profile-name"
                  className="form-input has-icon"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  data-testid="input-profile-name"
                />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="profile-email">
                البريد الإلكتروني
              </label>
              <div className="form-input-wrap">
                <Mail className="form-input-icon" size={17} />
                <input
                  id="profile-email"
                  className="form-input has-icon"
                  value={user?.email ?? ''}
                  readOnly
                  type="email"
                  data-testid="input-profile-email"
                />
              </div>
            </div>
            <div className="profile-actions">
              <Button onClick={save} disabled={isSaving} data-testid="button-save-profile">
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
              {user && (
                <Button variant="ghost" onClick={handleLogout} data-testid="button-sign-out">
                  تسجيل الخروج
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Modal for viewing profile photo enlarged */}
      {previewPhotoModal && (
        <div
          className="profile-modal-overlay"
          onClick={() => setPreviewPhotoModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="profile-preview-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-preview-header">
              <h3 className="profile-preview-title">معاينة صورة الحساب</h3>
              <button
                type="button"
                className="profile-preview-close"
                onClick={() => setPreviewPhotoModal(false)}
                title="إغلاق"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            <div className="profile-preview-body">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName || 'صورة الحساب'}
                  className="profile-preview-image"
                />
              ) : (
                <div className="profile-preview-placeholder">
                  {(displayName || user?.displayName || 'MZ').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="profile-preview-footer">
              <Button
                variant="secondary"
                onClick={() => {
                  setPreviewPhotoModal(false);
                  fileInputRef.current?.click();
                }}
              >
                <Camera size={15} style={{ marginInlineEnd: 6 }} />
                تغيير الصورة
              </Button>
              <Button variant="ghost" onClick={() => setPreviewPhotoModal(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Success Message Modal */}
      {showSuccessModal && (
        <div className="profile-modal-overlay" role="alert">
          <div className="profile-success-card">
            <div className="profile-success-icon-wrap">
              <CheckCircle2 size={46} />
            </div>
            <h3 className="profile-success-title">تم حفظ التغييرات بنجاح!</h3>
            <p className="profile-success-desc">
              تم تحديث بيانات ملفك الشخصي بنجاح، جاري تحويلك للصفحة الرئيسية...
            </p>
            <div className="profile-success-loader">
              <div className="profile-success-loader-bar" />
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

function NotFound() {
  return (
    <div className="page-frame">
      <EmptyState
        icon={<Zap size={19} />}
        title="هذه الصفحة في موقف تسلل!"
        copy="الصفحة التي تبحث عنها غير موجودة أو تم نقلها."
        action={
          <Link href="/" className="btn btn-primary" data-testid="link-not-found-home">
            العودة للصفحة الرئيسية
          </Link>
        }
      />
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ScrollToTop() {
  const [location] = useLocation();

  // 1. Disable browser's automatic scroll restoration to prevent landing at previous scroll positions
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // 2. Global capture click listener on any internal links or nav buttons
  // Resets scroll immediately on user interaction, even before route renders
  useEffect(() => {
    const handleGlobalLinkClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest('a[href], button[data-nav]');
      if (!target) return;
      const href = target.getAttribute('href');
      // Only for internal SPA links that do not open in a new tab
      if (
        href &&
        (href.startsWith('/') || href.startsWith('#')) &&
        target.getAttribute('target') !== '_blank'
      ) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };

    document.addEventListener('click', handleGlobalLinkClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleGlobalLinkClick, { capture: true });
    };
  }, []);

  // 3. Force scroll to top on every route change (with multi-stage RAF and timeout for safety)
  useEffect(() => {
    const scrollToPageTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Immediate scroll reset
    scrollToPageTop();

    // Next frame (after React mounts the new page components)
    const rafId = requestAnimationFrame(scrollToPageTop);

    // Timeout fallback (for async components or layout shifts)
    const timerId = setTimeout(scrollToPageTop, 50);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [location]);

  return null;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <ScrollToTop />
      <AppShell>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/live" component={LivePage} />
          <Route path="/matches" component={MatchesPage} />
          <Route path="/competitions" component={CompetitionsPage} />
          <Route path="/news" component={NewsPage} />
          <Route path="/news/:id" component={NewsArticlePage} />
          <Route path="/teams" component={NewsPage} />
          <Route path="/match/:id" component={MatchDetailsPage} />
          <Route path="/watch/:id" component={WatchPage} />
          <Route path="/favorites" component={FavoritesPage} />
          <Route path="/admin" component={AdminStreamsPage} />
          <Route path="/admin/streams" component={AdminStreamsPage} />
          <Route path="/login">
            <LoginPage />
          </Route>
          <Route path="/register">
            <LoginPage register />
          </Route>
          <Route path="/profile" component={ProfilePage} />
          <Route component={NotFound} />
        </Switch>
        <AuthRequiredModal />
      </AppShell>
    </RoutedErrorBoundary>
  );
}

function App() {
  return (
    <TooltipProvider>
      <SplashScreen />
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;