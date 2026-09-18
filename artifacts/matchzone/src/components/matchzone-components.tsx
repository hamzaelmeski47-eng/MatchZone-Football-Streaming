import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { CalendarDays, ChevronRight, CircleUserRound, Clock3, Heart, Home, Menu, Radio, Search, Star, Trophy, Users, X, Zap } from 'lucide-react';
import { getCompetition, getTeam, type Competition, type Match, type Team } from '@/lib/mock-data';

type ButtonProps = { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; className?: string; type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean; };
export function Button({ children, variant = 'primary', className = '', type = 'button', onClick, disabled }: ButtonProps) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`btn btn-${variant} ${className}`} data-testid={`button-${String(children).replace(/\s+/g, '-').toLowerCase()}`}>{children}</button>;
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="match-grid" data-testid="state-loading">{Array.from({ length: rows }).map((_, index) => <div className="match-card" key={index}><div className="skeleton" style={{ width: '45%', height: 11 }} /><div className="skeleton" style={{ width: '100%', height: 36, marginTop: 25 }} /><div className="skeleton" style={{ width: '72%', height: 11, marginTop: 22 }} /></div>)}</div>;
}

export function SearchBar({ value, onChange, onSubmit, className = '' }: { value: string; onChange: (value: string) => void; onSubmit?: () => void; className?: string }) {
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit?.(); };
  return <form onSubmit={submit} className={`search-wrap ${className}`}><Search size={15} /><input data-testid="input-search" className="search-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search teams, matches..." /></form>;
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(3,6,7,.72)', backdropFilter: 'blur(8px)' }} onClick={onClose}><div className="info-card" style={{ width: 'min(100%, 430px)', background: '#171d1f' }} onClick={(event) => event.stopPropagation()}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 }}><h3 style={{ margin: 0 }}>{title}</h3><button className="header-action" onClick={onClose} data-testid="button-close-modal"><X size={15} /></button></div>{children}</div></div>;
}

export function Header() {
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const nav = [['/', 'Home'], ['/live', 'Live'], ['/matches', 'Matches'], ['/competitions', 'Competitions'], ['/teams', 'Teams']];
  const handleSubmit = () => { if (search.trim()) setLocation(`/matches?search=${encodeURIComponent(search.trim())}`); };
  return <header className="topbar"><div className="topbar-inner"><Link href="/" className="brand" data-testid="link-brand"><span className="brand-mark" />MatchZone</Link><nav className="desktop-nav" aria-label="Main navigation">{nav.map(([href, label]) => <Link key={href} href={href} className={`nav-link ${location === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase()}`}>{label}</Link>)}</nav><SearchBar value={search} onChange={setSearch} onSubmit={handleSubmit} className="header-search" /><Link href="/favorites" className="header-action" aria-label="Favorites" data-testid="link-favorites"><Heart size={16} /></Link>{location === '/profile' ? <Link href="/profile" className="avatar" data-testid="link-profile-avatar">JD</Link> : <Link href="/login" className="header-login" data-testid="link-login">Log in</Link>}</div></header>;
}

export function MobileNavigation() {
  const [location] = useLocation();
  const links = [['/', Home, 'Home'], ['/live', Radio, 'Live'], ['/matches', CalendarDays, 'Matches'], ['/favorites', Heart, 'Favorites'], ['/profile', CircleUserRound, 'Profile']] as const;
  return <nav className="mobile-nav" aria-label="Mobile navigation">{links.map(([href, Icon, label]) => <Link key={href} href={href} className={`mobile-link ${location === href ? 'active' : ''}`} data-testid={`link-mobile-${label.toLowerCase()}`}><Icon size={18} /><span>{label}</span></Link>)}</nav>;
}

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="app-shell"><Header /><main>{children}</main><MobileNavigation /></div>;
}

export function MatchCard({ match, favorite, onFavorite, compact = false }: { match: Match; favorite: boolean; onFavorite: (id: string) => void; compact?: boolean }) {
  const home = getTeam(match.home); const away = getTeam(match.away); const competition = getCompetition(match.competitionId);
  return <article className={`match-card ${match.status === 'live' ? 'hero-live-card' : ''}`} data-testid={`card-match-${match.id}`}><button className={`star-btn ${favorite ? 'favorited' : ''}`} onClick={() => onFavorite(match.id)} aria-label={`Favorite ${home.name} vs ${away.name}`} data-testid={`button-favorite-${match.id}`}><Star size={15} fill={favorite ? 'currentColor' : 'none'} /></button><div className="match-top"><span className="competition-label"><i className="competition-dot" style={{ background: competition.accent }} />{competition.name}</span>{match.status === 'live' ? <span className="live-label"><i className="pulse-dot" />{match.minute}</span> : <span>{match.time}</span>}</div><Link href={`/match/${match.id}`} className="match-teams" data-testid={`link-match-${match.id}`}><span className="team-mini"><i className="team-crest" style={{ borderColor: home.color }}>{home.short}</i><b className="team-mini-name">{home.name}</b></span><strong className={`score ${match.status === 'upcoming' ? 'muted-score' : ''} ${match.status === 'live' ? 'featured-score' : ''}`}>{match.status === 'upcoming' ? '–' : `${match.homeScore} : ${match.awayScore}`}</strong><span className="team-mini"><b className="team-mini-name">{away.name}</b><i className="team-crest" style={{ borderColor: away.color }}>{away.short}</i></span></Link>{!compact && <div className="match-bottom"><span>{match.venue}</span><Link href={`/match/${match.id}`} className="section-link" data-testid={`link-details-${match.id}`}>Details <ChevronRight size={13} style={{ verticalAlign: 'middle' }} /></Link></div>}</article>;
}

export function LiveMatchCard({ match, favorite, onFavorite }: { match: Match; favorite: boolean; onFavorite: (id: string) => void }) {
  return <div><MatchCard match={match} favorite={favorite} onFavorite={onFavorite} /><Link href={`/watch/${match.id}`} className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} data-testid={`link-watch-${match.id}`}><Radio size={14} /> Watch demo</Link></div>;
}

export function CompetitionCard({ competition }: { competition: Competition }) {
  return <Link href={`/competitions?focus=${competition.id}`} className="competition-card" data-testid={`card-competition-${competition.id}`}><span className="competition-symbol" style={{ color: competition.accent }}><Trophy size={18} /></span><span><b className="competition-name">{competition.name}</b><small className="competition-meta">{competition.country} · {competition.matches} matches</small></span></Link>;
}

export function TeamCard({ team }: { team: Team }) {
  return <Link href={`/teams?focus=${team.id}`} className="team-card" data-testid={`card-team-${team.id}`}><i className="team-crest" style={{ borderColor: team.color }}>{team.short}</i><span className="team-card-copy"><b className="team-card-name">{team.name}</b><small className="team-card-meta">{team.country}</small></span><ChevronRight size={15} style={{ marginLeft: 'auto', color: 'hsl(var(--muted-foreground))' }} /></Link>;
}

export function EmptyState({ icon = <Heart size={19} />, title, copy, action }: { icon?: ReactNode; title: string; copy: string; action?: ReactNode }) {
  return <div className="empty-state" data-testid="state-empty"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{copy}</p>{action && <div style={{ marginTop: 20 }}>{action}</div>}</div>;
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onClose, 3000); return () => window.clearTimeout(timer); }, [message, onClose]);
  return <div className="toast-note" role="status" data-testid="status-toast">{message}</div>;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('matchzone-favorites') ?? '[]') as string[]; } catch { return []; } });
  const toggleFavorite = (id: string) => setFavorites((current) => { const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]; localStorage.setItem('matchzone-favorites', JSON.stringify(next)); return next; });
  return { favorites, toggleFavorite };
}

export function DataIcon({ kind }: { kind: 'clock' | 'menu' | 'users' | 'zap' }) {
  const icons = { clock: Clock3, menu: Menu, users: Users, zap: Zap };
  const Icon = icons[kind];
  return <Icon size={17} />;
}