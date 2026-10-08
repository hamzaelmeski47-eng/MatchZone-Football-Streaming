import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'wouter';
import {
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Clock,
  Clock3,
  Heart,
  Home,
  Menu,
  Radio,
  Search,
  Star,
  Sun,
  Moon,
  Trophy,
  Users,
  Newspaper,
  Tv,
  X,
  Zap,
} from 'lucide-react';
import { type Competition, type Match, type Team } from '@/lib/mock-data';
import { useAuth, useMatchZoneData, useTheme } from '@/lib/app-state';
import { formatCompetitionInfo, resolveTeamLogo, resolveMatchBroadcaster } from '@/lib/competitions-map';
import { formatMatchMinute } from '@/lib/api';

export { useFavorites, useTheme } from '@/lib/app-state';

type ButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
};

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  onClick,
  disabled,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${className}`}
      data-testid={`button-${String(children).replace(/\s+/g, '-').toLowerCase()}`}
    >
      {children}
    </button>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="match-grid" data-testid="state-loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="match-card" key={index}>
          <div className="skeleton" style={{ width: '45%', height: 11 }} />
          <div className="skeleton" style={{ width: '100%', height: 36, marginTop: 25 }} />
          <div className="skeleton" style={{ width: '72%', height: 11, marginTop: 22 }} />
        </div>
      ))}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  className?: string;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.();
  };
  return (
    <form onSubmit={submit} className={`search-wrap ${className}`}>
      <Search size={15} />
      <input
        data-testid="input-search"
        className="search-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="ابحث عن الفرق، المباريات..."
      />
    </form>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background: 'rgba(3,6,7,.72)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="info-card"
        style={{ width: 'min(100%, 430px)', background: '#171d1f' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="header-action" onClick={onClose} data-testid="button-close-modal">
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Header() {
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [isBurgerOpen, setIsBurgerOpen] = useState(false);
  const { user } = useAuth();
  const { matches, competitions } = useMatchZoneData();
  const { theme, toggleTheme } = useTheme();
  const liveCount = matches.filter((m) => m.status === 'live').length;

  // Arabic Navigation
  const nav: Array<[string, string, any]> = [
    ['/', 'الرئيسية', Home],
    ['/live', 'مباشر الآن', Radio],
    ['/matches', 'جدول المباريات', CalendarDays],
    ['/competitions', 'الدوريات', Trophy],
    ['/news', 'أخبار', Newspaper],
    ['/favorites', 'المفضلة', Heart],
  ];

  const desktopNav = nav.filter(([href]) => href !== '/favorites');

  const handleSubmit = () => {
    if (search.trim()) {
      setLocation(`/matches?search=${encodeURIComponent(search.trim())}`);
      setIsBurgerOpen(false);
    }
  };

  const closeBurger = () => setIsBurgerOpen(false);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (isBurgerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isBurgerOpen]);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand" data-testid="link-brand" onClick={closeBurger}>
          <span className="brand-mark" />
          MatchZone
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav desktop-only" aria-label="التنقل الرئيسي">
          {desktopNav.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${location === href ? 'active' : ''}`}
              data-testid={`link-nav-${label.toLowerCase()}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <SearchBar value={search} onChange={setSearch} onSubmit={handleSubmit} className="header-search desktop-only" />

        {/* Theme Toggle Button (Desktop) */}
        <button
          className="header-action theme-toggle-btn desktop-only"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'التحويل للوضع النهاري' : 'التحويل للوضع الليلي'}
          title={theme === 'dark' ? 'التحويل للوضع النهاري (Light Mode)' : 'التحويل للوضع الليلي (Dark Mode)'}
          data-testid="button-theme-toggle"
        >
          {theme === 'dark' ? (
            <Sun size={17} className="theme-icon-sun" />
          ) : (
            <Moon size={17} className="theme-icon-moon" />
          )}
        </button>

        <Link href="/favorites" className="header-action desktop-only" aria-label="المفضلة" data-testid="link-favorites">
          <Heart size={16} />
        </Link>

        {user ? (
          <Link href="/profile" className="avatar desktop-only" data-testid="link-profile-avatar">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} referrerPolicy="no-referrer" className="avatar-img" />
            ) : (
              user.displayName.slice(0, 2).toUpperCase()
            )}
          </Link>
        ) : (
          <Link href="/login" className="header-login desktop-only" data-testid="link-login">
            تسجيل الدخول
          </Link>
        )}

        {/* Mobile Header Actions: Dark/Light Mode Toggle + Burger Menu Button */}
        <div className="mobile-topbar-actions">
          <button
            className="header-action theme-toggle-btn mobile-theme-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'التحويل للوضع النهاري' : 'التحويل للوضع الليلي'}
            title={theme === 'dark' ? 'التحويل للوضع النهاري' : 'التحويل للوضع الليلي'}
            data-testid="button-mobile-theme-toggle-header"
          >
            {theme === 'dark' ? (
              <Sun size={18} className="theme-icon-sun" />
            ) : (
              <Moon size={18} className="theme-icon-moon" />
            )}
          </button>

          <button
            className="burger-btn"
            onClick={() => setIsBurgerOpen(!isBurgerOpen)}
            aria-label="تبديل القائمة"
            aria-expanded={isBurgerOpen}
            data-testid="button-burger-menu"
          >
            {isBurgerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Enhanced Mobile Drawer mounted directly to body to avoid containing block issues */}
      {isBurgerOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="mobile-drawer-overlay" onClick={closeBurger} data-testid="mobile-drawer-overlay">
            <aside className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-drawer-header">
                <Link href="/" className="brand" onClick={closeBurger}>
                  <span className="brand-mark" />
                  MatchZone
                </Link>
                <button
                  onClick={closeBurger}
                  className="mobile-drawer-close"
                  aria-label="إغلاق القائمة"
                >
                  <X size={20} />
                </button>
              </div>

              {/* In-drawer Search */}
              <div className="mobile-drawer-search">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  onSubmit={handleSubmit}
                  className="mobile-search-bar"
                />
              </div>

              {/* Navigation items */}
              <nav className="mobile-drawer-nav">
                <span className="mobile-section-title">القائمة الرئيسية</span>
                {nav.map(([href, label, Icon]) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeBurger}
                    className={`mobile-drawer-link ${location === href ? 'active' : ''}`}
                    data-testid={`mobile-link-${label.toLowerCase()}`}
                  >
                    <div className="mobile-link-icon-wrap">
                      <Icon size={19} />
                    </div>
                    <span className="mobile-link-text">{label}</span>
                    {href === '/live' && liveCount > 0 && (
                      <span className="mobile-live-pill">
                        <i className="pulse-dot" style={{ width: 6, height: 6 }} />
                        {liveCount} مباشر
                      </span>
                    )}
                    <ChevronRight size={15} className="mobile-link-arrow" />
                  </Link>
                ))}

                {/* Theme Toggle in Mobile Drawer */}
                <button
                  className="mobile-drawer-link theme-drawer-link"
                  onClick={toggleTheme}
                  style={{ width: '100%', justifyContent: 'space-between', cursor: 'pointer', marginTop: 4 }}
                  data-testid="button-mobile-theme-toggle"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="mobile-link-icon-wrap" style={{ background: theme === 'dark' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(99, 102, 241, 0.15)' }}>
                      {theme === 'dark' ? (
                        <Sun size={18} style={{ color: '#fbbf24' }} />
                      ) : (
                        <Moon size={18} style={{ color: '#6366f1' }} />
                      )}
                    </div>
                    <span className="mobile-link-text">
                      {theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
                    </span>
                  </div>
                  <span className="theme-drawer-pill">
                    {theme === 'dark' ? '☀️ نهاري' : '🌙 ليلي'}
                  </span>
                </button>

                {/* Quick Competitions */}
                {competitions.length > 0 && (
                  <>
                    <span className="mobile-section-title" style={{ marginTop: 20 }}>أبرز الدوريات والبطولات</span>
                    <div className="mobile-comp-list">
                      {competitions.slice(0, 6).map((comp) => (
                        <Link
                          key={comp.id}
                          href={`/competitions?focus=${comp.id}`}
                          onClick={closeBurger}
                          className="mobile-comp-pill"
                        >
                          {comp.logoUrl ? (
                            <img src={comp.logoUrl} alt={comp.name} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                          ) : (
                            <span className="comp-dot" style={{ background: comp.accent || 'hsl(var(--primary))' }} />
                          )}
                          <span>{comp.name}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </nav>

              {/* Account / Footer */}
              <div className="mobile-drawer-footer">
                {user ? (
                  <Link
                    href="/profile"
                    onClick={closeBurger}
                    className="mobile-user-card"
                  >
                    <div className="avatar" style={{ width: 40, height: 40, fontSize: 13, flexShrink: 0 }}>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.displayName} referrerPolicy="no-referrer" className="avatar-img" />
                      ) : (
                        user.displayName.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{user.displayName}</span>
                      <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>الملف الشخصي والإعدادات</span>
                    </div>
                    <ChevronRight size={16} style={{ marginInlineStart: 'auto', color: 'hsl(var(--muted-foreground))' }} />
                  </Link>
                ) : (
                  <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                    <Link
                      href="/login"
                      onClick={closeBurger}
                      className="btn btn-primary"
                      style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}
                    >
                      تسجيل الدخول
                    </Link>
                    <Link
                      href="/register"
                      onClick={closeBurger}
                      className="btn btn-secondary"
                      style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}
                    >
                      إنشاء حساب
                    </Link>
                  </div>
                )}
              </div>
            </aside>
          </div>,
          document.body
        )}
    </header>
  );
}

export function MobileNavigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <nav className="mobile-nav" aria-label="التنقل بالهاتف">
      <Link
        href="/"
        className={`mobile-link ${location === '/' ? 'active' : ''}`}
        data-testid="link-mobile-home"
      >
        <Home size={18} />
        <span>الرئيسية</span>
      </Link>

      <Link
        href="/live"
        className={`mobile-link ${location === '/live' ? 'active' : ''}`}
        data-testid="link-mobile-live"
      >
        <Radio size={18} />
        <span>مباشر</span>
      </Link>

      <Link
        href="/matches"
        className={`mobile-link ${location === '/matches' ? 'active' : ''}`}
        data-testid="link-mobile-matches"
      >
        <CalendarDays size={18} />
        <span>المباريات</span>
      </Link>

      <Link
        href="/favorites"
        className={`mobile-link ${location === '/favorites' ? 'active' : ''}`}
        data-testid="link-mobile-favorites"
      >
        <Heart size={18} />
        <span>المفضلة</span>
      </Link>

      <Link
        href={user ? '/profile' : '/login'}
        className={`mobile-link ${location === '/profile' || location === '/login' || location === '/register' ? 'active' : ''}`}
        data-testid="link-mobile-profile"
      >
        {user ? (
          user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName || user.email}
              className="mobile-nav-avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="mobile-nav-avatar-fallback">
              {(user.displayName || user.email || 'H')[0].toUpperCase()}
            </div>
          )
        ) : (
          <CircleUserRound size={18} />
        )}
        <span>حسابي</span>
      </Link>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="app-footer" data-testid="app-footer">
      <div className="footer-top-container">
        {/* Brand column */}
        <div className="footer-brand-col">
          <Link href="/" className="footer-logo">
            <span className="logo-badge">
              <span className="logo-icon-dot" />
            </span>
            <span className="footer-logo-text">MatchZone</span>
          </Link>
          <p className="footer-bio">
            منصتك الرياضية الأولى لمتابعة البث المباشر، جداول المباريات، والنتائج الحية اللحظية لأقوى الدوريات العالمية والمسابقات القارية.
          </p>
          <div className="footer-status-indicator">
            <span className="footer-live-dot" />
            <span>تحديثات مباشرة ومستمرة 24/7</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-nav-col">
          <h4 className="footer-col-title">أقسام المنصة</h4>
          <ul className="footer-links-list">
            <li><Link href="/">الرئيسية</Link></li>
            <li><Link href="/live">المباريات المباشرة</Link></li>
            <li><Link href="/matches">جدول المباريات</Link></li>
            <li><Link href="/competitions">أبرز البطولات</Link></li>
            <li><Link href="/news">آخر الأخبار والتقارير</Link></li>
            <li><Link href="/favorites">قائمتي المفضلة</Link></li>
          </ul>
        </div>

        {/* Top Competitions */}
        <div className="footer-nav-col">
          <h4 className="footer-col-title">أبرز البطولات</h4>
          <ul className="footer-links-list">
            <li><Link href="/competitions?focus=39">الدوري الإنجليزي الممتاز</Link></li>
            <li><Link href="/competitions?focus=140">الدوري الإسباني (LaLiga)</Link></li>
            <li><Link href="/competitions?focus=2">دوري أبطال أوروبا</Link></li>
            <li><Link href="/competitions?focus=135">الدوري الإيطالي (Serie A)</Link></li>
            <li><Link href="/competitions?focus=78">الدوري الألماني (Bundesliga)</Link></li>
            <li><Link href="/competitions?focus=6">كأس أمم إفريقيا (AFCON)</Link></li>
          </ul>
        </div>

        {/* Social Media Column */}
        <div className="footer-nav-col">
          <h4 className="footer-col-title">متابعة على صفحاتنا</h4>
          <p className="footer-social-desc">
            انضم إلى مجتمع MatchZone على شبكات التواصل لمتابعة روابط البث الحي، الأهداف وتحديثات المباريات أولاً بأول.
          </p>
          <div className="footer-social-grid">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn fb"
              title="تابعنا على فيسبوك"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>فيسبوك</span>
            </a>

            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn ig"
              title="تابعنا على إنستغرام"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>إنستغرام</span>
            </a>

            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn x"
              title="تابعنا على منصة X"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>منصة X</span>
            </a>

            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn tg"
              title="تابعنا على تيليجرام"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.196 1.006.128.832.942z"/>
              </svg>
              <span>تيليجرام</span>
            </a>

            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn yt"
              title="تابعنا على يوتيوب"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span>يوتيوب</span>
            </a>

            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn tt"
              title="تابعنا على تيك توك"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.77 1.81-.03 3.28-1.47 3.4-3.28.09-2.8.05-5.61.05-8.41V.02z"/>
              </svg>
              <span>تيك توك</span>
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom-container">
        <div className="footer-bottom-row">
          <p className="footer-copyright">
            © {new Date().getFullYear()} <strong>MatchZone</strong>. جميع الحقوق محفوظة.
          </p>
          <p className="footer-disclaimer">
            جميع حقوق البث والعلامات التجارية وشعارات الفرق والمسابقات محفوظة لأصحابها الشرعيين. الموقع يقدم روابط وإحصائيات لأغراض المتابعة الرياضية فقط.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell" dir="rtl">
      <Header />
      <main>{children}</main>
      <Footer />
      <MobileNavigation />
    </div>
  );
}

export function MatchCard({
  match,
  favorite,
  onFavorite,
  compact = false,
}: {
  match: Match;
  favorite: boolean;
  onFavorite: (id: string) => void;
  compact?: boolean;
}) {
  const { teams, competitions } = useMatchZoneData();
  const [, setLocation] = useLocation();
  const home =
    teams.find((team) => team.id === match.home) ?? {
      id: match.home,
      name: match.homeName || 'الفريق المضيف',
      short: (match.homeName || 'HOM').slice(0, 3).toUpperCase(),
      country: 'دولي',
      color: '#888',
      logoUrl: resolveTeamLogo(match.homeName, match.homeLogo, match.home),
    };
  const away =
    teams.find((team) => team.id === match.away) ?? {
      id: match.away,
      name: match.awayName || 'الفريق الضيف',
      short: (match.awayName || 'AWY').slice(0, 3).toUpperCase(),
      country: 'دولي',
      color: '#888',
      logoUrl: resolveTeamLogo(match.awayName, match.awayLogo, match.away),
    };
  const competition =
    competitions.find((item) => item.id === match.competitionId) ?? {
      id: match.competitionId,
      name: match.competitionName || 'دوري كرة القدم',
      short: 'CMP',
      country: 'دولي',
      matches: 1,
      accent: '#16A34A',
      logoUrl: match.competitionLogo || null,
    };

  const compInfo = formatCompetitionInfo({
    id: match.competitionId,
    name: match.competitionName || competition.name,
    country: match.competitionCountry || competition.country,
    logo: match.competitionLogo || competition.logoUrl,
  });

  return (
    <article
      className={`match-card ${match.status === 'live' ? 'hero-live-card' : ''}`}
      onClick={() => setLocation(`/match/${match.id}`)}
      data-testid={`card-match-${match.id}`}
      style={{ cursor: 'pointer' }}
    >
      <div className="match-top">
        <span className="competition-label">
          <i
            className="competition-dot"
            style={{ background: competition.accent || 'hsl(var(--primary))' }}
          />
          <span className="competition-name-val">{compInfo.competitionName}</span>
          <span className="competition-sep" style={{ opacity: 0.6, margin: '0 4px' }}>•</span>
          <span className="competition-country-val" style={{ opacity: 0.85, fontSize: 11.5 }}>
            {compInfo.competitionCountry}
          </span>
        </span>

        {/* Separated action area for status and favorite button */}
        <div className="match-top-actions">
          {match.status === 'live' ? (
            match.minute === 'إستراحة' || match.minute === 'HT' ? (
              <span className="halftime-label">
                <i className="halftime-dot" /> إستراحة
              </span>
            ) : (
              <span className="live-label">
                <i className="pulse-dot" /> مباشر <span dir="ltr">{formatMatchMinute(match.minute)}</span>
              </span>
            )
          ) : match.status === 'upcoming' ? (
            <span className="kickoff-badge" title={`موعد انطلاق المباراة: ${match.kickoffTime || match.time}`}>
              <Clock size={12} style={{ marginInlineEnd: 4, verticalAlign: 'middle' }} />
              ستبدأ قريباً
            </span>
          ) : (
            <span className="finished-badge">انتهت</span>
          )}

          <button
            className={`star-btn ${favorite ? 'favorited' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite(match.id);
            }}
            aria-label={`إضافة مباراة ${home.name} و ${away.name} للمفضلة`}
            title="إضافة للمفضلة"
            data-testid={`button-favorite-${match.id}`}
          >
            <Star size={15} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="match-teams" data-testid={`link-match-${match.id}`}>
        <span className="team-mini">
          <i className="team-crest" style={{ borderColor: home.color, overflow: 'hidden' }}>
            <img
              src={resolveTeamLogo(home.name, home.logoUrl, home.id)}
              alt={home.name}
              style={{ width: 22, height: 22, objectFit: 'contain' }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = resolveTeamLogo(home.name);
              }}
            />
          </i>
          <b className="team-mini-name">{home.name}</b>
        </span>

        <strong
          className={`score ${match.status === 'upcoming' ? 'muted-score' : ''} ${
            match.status === 'live' ? 'featured-score' : ''
          }`}
        >
          {match.status === 'upcoming' ? (
            <span className="upcoming-time-display">{match.kickoffTime || match.time}</span>
          ) : (
            <span className="score-numbers">
              <span className="score-num">{match.homeScore}</span>
              <span className="score-divider">:</span>
              <span className="score-num">{match.awayScore}</span>
            </span>
          )}
        </strong>

        <span className="team-mini">
          <b className="team-mini-name">{away.name}</b>
          <i className="team-crest" style={{ borderColor: away.color, overflow: 'hidden' }}>
            <img
              src={resolveTeamLogo(away.name, away.logoUrl, away.id)}
              alt={away.name}
              style={{ width: 22, height: 22, objectFit: 'contain' }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = resolveTeamLogo(away.name);
              }}
            />
          </i>
        </span>
      </div>

      {!compact ? (
        <div className="match-bottom">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span className="match-venue-date">
              <CalendarDays size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 4, opacity: 0.7 }} />
              {match.date}
              {match.kickoffTime ? ` • ${match.kickoffTime}` : ''}
            </span>
          </div>
          <span className="section-link" data-testid={`link-details-${match.id}`}>
            تفاصيل المباراة <ChevronRight size={13} style={{ verticalAlign: 'middle' }} />
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '4px 10px 6px', fontSize: 11, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ color: '#94A3B8', fontSize: 10.5 }}>{match.kickoffTime || match.time}</span>
        </div>
      )}
    </article>
  );
}

export function LiveMatchCard({
  match,
  favorite,
  onFavorite,
}: {
  match: Match;
  favorite: boolean;
  onFavorite: (id: string) => void;
}) {
  return (
    <div className="live-card-wrapper">
      <MatchCard match={match} favorite={favorite} onFavorite={onFavorite} />
      <Link
        href={`/match/${match.id}`}
        className="btn btn-secondary watch-live-btn"
        style={{ width: '100%', marginTop: 8 }}
        data-testid={`link-live-details-${match.id}`}
      >
        <Radio size={14} className="animate-pulse" style={{ color: '#10B981' }} /> دخول البث
      </Link>
    </div>
  );
}

export function CompetitionCard({ competition }: { competition: Competition }) {
  const compInfo = formatCompetitionInfo({
    id: competition.id,
    name: competition.name,
    country: competition.country,
    logo: competition.logoUrl,
  });

  return (
    <Link
      href={`/competitions?focus=${competition.id}`}
      className="competition-card"
      data-testid={`card-competition-${competition.id}`}
    >
      <div className="competition-card-top">
        <span className="competition-symbol">
          {compInfo.competitionLogo ? (
            <img
              src={compInfo.competitionLogo}
              alt={compInfo.competitionName}
              className="competition-logo-img"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Trophy size={18} />
          )}
        </span>
        {compInfo.competitionCountry && (
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
            <span>{compInfo.competitionCountry}</span>
          </span>
        )}
      </div>
      <div className="competition-card-center">
        <b className="competition-name">{compInfo.competitionName}</b>
      </div>
      <div className="competition-card-bottom">
        <span className="competition-matches-pill">
          {competition.matches} {competition.matches === 1 ? 'مباراة' : 'مباريات'}
        </span>
      </div>
    </Link>
  );
}

export function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      href={`/teams?focus=${team.id}`}
      className="team-card"
      data-testid={`card-team-${team.id}`}
    >
      <i className="team-crest" style={{ borderColor: team.color, overflow: 'hidden' }}>
        {team.logoUrl ? (
          <img src={team.logoUrl} alt={team.name} style={{ width: 28, height: 28, objectFit: 'contain' }} />
        ) : (
          team.short
        )}
      </i>
      <span className="team-card-copy">
        <b className="team-card-name">{team.name}</b>
        <small className="team-card-meta">{team.country}</small>
      </span>
      <ChevronRight size={15} style={{ marginInlineStart: 'auto', color: 'hsl(var(--muted-foreground))' }} />
    </Link>
  );
}

export function EmptyState({
  icon = <Heart size={19} />,
  title,
  copy,
  action,
}: {
  icon?: ReactNode;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state" data-testid="state-empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  return (
    <div className="toast-note" role="status" data-testid="status-toast">
      {message}
    </div>
  );
}

export function DataIcon({ kind }: { kind: 'clock' | 'menu' | 'users' | 'zap' }) {
  const icons = { clock: Clock3, menu: Menu, users: Users, zap: Zap };
  const Icon = icons[kind];
  return <Icon size={17} />;
}