import { useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, ChevronRight, Heart, Info, LockKeyhole, Mail, Play, Radio, UserRound, Users, Zap } from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { competitions, getCompetition, getTeam, matches, teams } from '@/lib/mock-data';
import { AppShell, Button, CompetitionCard, EmptyState, LiveMatchCard, LoadingSkeleton, MatchCard, TeamCard, Toast, useFavorites } from '@/components/matchzone-components';

function PageHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return <div className="content-head"><div><span className="eyebrow">{eyebrow}</span><h1 className="page-title">{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div></div>;
}

function Home() {
  const { favorites, toggleFavorite } = useFavorites();
  const live = matches.filter((match) => match.status === 'live');
  const today = matches.filter((match) => match.status === 'upcoming' && match.date === 'Today');
  const upcoming = matches.filter((match) => match.status === 'upcoming' && match.date !== 'Today');
  return <div className="page-frame">
    <section className="hero">
      <div className="hero-orbit" />
      <div className="hero-content"><span className="hero-kicker"><i className="pulse-dot" /> Matchday intelligence, live</span><h1>Watch Football <span>Live.</span></h1><p>Follow your favorite matches, teams and competitions. One sharp, fast view of everything happening on the pitch.</p><div className="hero-actions"><Link href="/live" className="btn btn-primary" data-testid="link-hero-watch-live"><Radio size={15} /> Watch live</Link><Link href="/matches" className="btn btn-secondary" data-testid="link-hero-explore"><CalendarDays size={15} /> Explore matches</Link></div></div>
      <span className="hero-meta">MZ / SIGNAL 001 — THE MATCH IS ON</span>
    </section>
    <section><div className="section-row"><div><span className="eyebrow">01 / happening now</span><h2 className="section-title" style={{ marginTop: 6 }}>Live matches</h2></div><Link href="/live" className="section-link" data-testid="link-home-live-more">See all live <ChevronRight size={13} style={{ verticalAlign: 'middle' }} /></Link></div><div className="live-grid">{live.map((match) => <LiveMatchCard key={match.id} match={match} favorite={favorites.includes(match.id)} onFavorite={toggleFavorite} />)}</div></section>
    <section><div className="section-row"><div><span className="eyebrow">02 / match center</span><h2 className="section-title" style={{ marginTop: 6 }}>Today’s matches</h2></div><Link href="/matches" className="section-link" data-testid="link-home-matches-more">All matches <ChevronRight size={13} style={{ verticalAlign: 'middle' }} /></Link></div><div className="match-grid">{today.map((match) => <MatchCard key={match.id} match={match} favorite={favorites.includes(match.id)} onFavorite={toggleFavorite} />)}</div></section>
    <section><div className="section-row"><div><span className="eyebrow">03 / next on</span><h2 className="section-title" style={{ marginTop: 6 }}>Upcoming matches</h2></div></div><div className="match-grid">{upcoming.map((match) => <MatchCard key={match.id} match={match} favorite={favorites.includes(match.id)} onFavorite={toggleFavorite} />)}</div></section>
    <section><div className="section-row"><div><span className="eyebrow">04 / the big ones</span><h2 className="section-title" style={{ marginTop: 6 }}>Popular competitions</h2></div><Link href="/competitions" className="section-link" data-testid="link-home-competitions-more">Browse all <ChevronRight size={13} style={{ verticalAlign: 'middle' }} /></Link></div><div className="competition-grid">{competitions.slice(0, 4).map((competition) => <CompetitionCard key={competition.id} competition={competition} />)}</div></section>
  </div>;
}

function LivePage() {
  const { favorites, toggleFavorite } = useFavorites();
  const live = matches.filter((match) => match.status === 'live');
  return <div className="page-frame"><PageHeading eyebrow="Live / broadcast room" title="Live matches" subtitle="Every minute, every momentum shift, in one focused view." /><div className="filter-row"><button className="filter-chip active" data-testid="button-filter-live">All live · {live.length}</button><button className="filter-chip" data-testid="button-filter-popular">Popular</button><button className="filter-chip" data-testid="button-filter-competitions">By competition</button></div>{live.length ? <div className="live-grid">{live.map((match) => <LiveMatchCard key={match.id} match={match} favorite={favorites.includes(match.id)} onFavorite={toggleFavorite} />)}</div> : <EmptyState icon={<Radio size={19} />} title="Nothing live right now" copy="The next kick-off will appear here as soon as it starts." action={<Link href="/matches" className="btn btn-secondary" data-testid="link-live-empty-matches">View upcoming matches</Link>} />}</div>;
}

function MatchesPage() {
  const { favorites, toggleFavorite } = useFavorites();
  const [, setLocation] = useLocation();
  const [active, setActive] = useState('All');
  const [loading, setLoading] = useState(false);
  const search = new URLSearchParams(window.location.search).get('search')?.toLowerCase() ?? '';
  const filtered = useMemo(() => matches.filter((match) => {
    const home = getTeam(match.home).name.toLowerCase(); const away = getTeam(match.away).name.toLowerCase();
    const statusMatch = active === 'All' || (active === 'Live' && match.status === 'live') || (active === 'Upcoming' && match.status === 'upcoming') || (active === 'Finished' && match.status === 'finished');
    return statusMatch && (!search || home.includes(search) || away.includes(search) || getCompetition(match.competitionId).name.toLowerCase().includes(search));
  }), [active, search]);
  const chooseFilter = (value: string) => { setLoading(true); setActive(value); window.setTimeout(() => setLoading(false), 260); };
  return <div className="page-frame"><PageHeading eyebrow="Match center / fixtures" title="All matches" subtitle={search ? `Showing results for “${search}”` : 'The full slate, sorted for the way you follow football.'} /><div className="filter-row">{['All', 'Live', 'Upcoming', 'Finished'].map((filter) => <button key={filter} className={`filter-chip ${active === filter ? 'active' : ''}`} onClick={() => chooseFilter(filter)} data-testid={`button-filter-${filter.toLowerCase()}`}>{filter}</button>)}<button className="filter-chip" style={{ marginLeft: 'auto' }} onClick={() => setLocation('/matches')} data-testid="button-clear-match-search"><Info size={13} /> Reset</button></div>{loading ? <LoadingSkeleton rows={3} /> : filtered.length ? <div className="match-grid">{filtered.map((match) => <MatchCard key={match.id} match={match} favorite={favorites.includes(match.id)} onFavorite={toggleFavorite} />)}</div> : <EmptyState icon={<CalendarDays size={19} />} title="No matches found" copy="Try another team, competition or filter." action={<Button variant="secondary" onClick={() => setLocation('/matches')}>Reset search</Button>} />}</div>;
}

function CompetitionsPage() {
  const [active, setActive] = useState('All');
  const visible = active === 'All' ? competitions : competitions.filter((competition) => competition.country === active);
  return <div className="page-frame"><PageHeading eyebrow="The world game" title="Competitions" subtitle="Keep the leagues and tournaments you care about within reach." /><div className="filter-row">{['All', 'England', 'Europe', 'Spain', 'Germany', 'Italy', 'France'].map((filter) => <button key={filter} onClick={() => setActive(filter)} className={`filter-chip ${active === filter ? 'active' : ''}`} data-testid={`button-competition-filter-${filter.toLowerCase()}`}>{filter}</button>)}</div><div className="competition-grid">{visible.map((competition) => <CompetitionCard key={competition.id} competition={competition} />)}</div><div className="section-row"><div><span className="eyebrow">calendar view</span><h2 className="section-title" style={{ marginTop: 6 }}>Tonight’s spotlight</h2></div></div><div className="match-grid">{matches.filter((match) => match.status === 'upcoming').slice(0, 3).map((match) => <MatchCard key={match.id} match={match} favorite={false} onFavorite={() => undefined} compact />)}</div></div>;
}

function TeamsPage() {
  const [query, setQuery] = useState('');
  const visible = teams.filter((team) => team.name.toLowerCase().includes(query.toLowerCase()) || team.country.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-frame"><PageHeading eyebrow="Club directory" title="Teams" subtitle="Pinpoint your clubs and keep their next match close." /><div style={{ maxWidth: 330, margin: '28px 0 18px' }}><div className="search-wrap"><UserRound size={15} style={{ position: 'absolute', left: 13, color: 'hsl(var(--muted-foreground))' }} /><input className="search-input" style={{ paddingLeft: 38 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a team..." data-testid="input-team-search" /></div></div>{visible.length ? <div className="teams-grid">{visible.map((team) => <TeamCard key={team.id} team={team} />)}</div> : <EmptyState icon={<Users size={19} />} title="No team found" copy="Try a club name or country." />}</div>;
}

function MatchDetailsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const match = matches.find((item) => item.id === id) ?? matches[0];
  const home = getTeam(match.home); const away = getTeam(match.away); const competition = getCompetition(match.competitionId);
  const { favorites, toggleFavorite } = useFavorites();
  return <div className="page-frame"><Link href="/matches" className="section-link" data-testid="link-back-matches">← Back to matches</Link><div className="detail-hero" style={{ marginTop: 17 }}><div className="detail-head"><span>{competition.name}</span><span>{match.date} · {match.venue}</span></div><div className="detail-scoreboard"><div className="detail-team"><i className="team-crest" style={{ borderColor: home.color }}>{home.short}</i><span>{home.name}</span></div><div><div className={`detail-score ${match.status === 'live' ? 'featured-score' : ''}`}>{match.status === 'upcoming' ? '– : –' : `${match.homeScore} : ${match.awayScore}`}</div><div className="detail-status">{match.status === 'live' ? `${match.minute} · LIVE` : match.time}</div></div><div className="detail-team"><i className="team-crest" style={{ borderColor: away.color }}>{away.short}</i><span>{away.name}</span></div></div><div className="detail-tabs"><button className="filter-chip active" data-testid="button-tab-summary">Summary</button><button className="filter-chip" data-testid="button-tab-lineups">Lineups</button><button className="filter-chip" data-testid="button-tab-stats">Stats</button></div></div><div className="detail-panel"><div className="info-card"><h3>Match notes</h3><div className="info-row"><span>Status</span><b>{match.status === 'live' ? 'In progress' : match.status === 'finished' ? 'Full time' : 'Not started'}</b></div><div className="info-row"><span>Venue</span><b>{match.venue}</b></div><div className="info-row"><span>Competition</span><b>{competition.name}</b></div></div><div className="info-card"><h3>Keep it close</h3><p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, lineHeight: 1.6, margin: 0 }}>Add this fixture to your personal matchday signal. We’ll surface it first in Favorites.</p><div style={{ marginTop: 17 }}><Button variant={favorites.includes(match.id) ? 'secondary' : 'primary'} onClick={() => toggleFavorite(match.id)}>{favorites.includes(match.id) ? 'Saved to favorites' : 'Add to favorites'}</Button></div></div></div></div>;
}

function WatchPage() {
  const { id = '' } = useParams<{ id: string }>();
  const match = matches.find((item) => item.id === id) ?? matches[0];
  const [playing, setPlaying] = useState(false);
  const home = getTeam(match.home); const away = getTeam(match.away);
  return <div className="page-frame"><Link href={`/match/${match.id}`} className="section-link" data-testid="link-back-match-details">← Match details</Link><div className="watch-layout" style={{ marginTop: 17 }}><div><div className="player"><span className="player-label">MATCHZONE DEMO FEED / {home.short} v {away.short}</span><button className="play-button" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause demo' : 'Play demo'} data-testid="button-play-demo">{playing ? <span style={{ fontSize: 20 }}>Ⅱ</span> : <Play size={26} fill="currentColor" />}</button><span className="player-demo">{playing ? 'Demo playback active · no real stream connected' : 'A safe, simulated matchday experience'}</span></div><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 15 }}><div><span className="eyebrow">Now showing</span><h1 className="page-title" style={{ fontSize: 24 }}>{home.name} <span style={{ color: 'hsl(var(--muted-foreground))' }}>vs</span> {away.name}</h1></div><span className="live-label"><i className="pulse-dot" /> Demo only</span></div></div><aside className="watch-aside"><span className="eyebrow">Match signal</span><h2>{home.short} <span style={{ color: 'hsl(var(--muted-foreground))' }}>—</span> {away.short}</h2><div className="watch-stat"><span>Status</span><b>{match.status === 'live' ? 'Live now' : 'Preview'}</b></div><div className="watch-stat"><span>Venue</span><b>{match.venue}</b></div><div className="watch-stat"><span>Coverage</span><b>Demo screen</b></div><div style={{ marginTop: 19, display: 'flex', gap: 8, color: 'hsl(var(--muted-foreground))', fontSize: 11, lineHeight: 1.5 }}><Info size={15} style={{ flex: '0 0 auto', color: 'hsl(var(--primary))' }} /> This is a product demo. No copyrighted footage or external stream is used.</div></aside></div></div>;
}

function FavoritesPage() {
  const { favorites, toggleFavorite } = useFavorites();
  const saved = matches.filter((match) => favorites.includes(match.id));
  return <div className="page-frame"><PageHeading eyebrow="Your matchday" title="Favorites" subtitle="The fixtures you asked MatchZone to keep in the front row." />{saved.length ? <div className="match-grid" style={{ marginTop: 30 }}>{saved.map((match) => <MatchCard key={match.id} match={match} favorite onFavorite={toggleFavorite} />)}</div> : <div style={{ marginTop: 28 }}><EmptyState icon={<Heart size={19} />} title="Your watchlist is quiet" copy="Tap the star on any match to build your personal matchday." action={<Link href="/matches" className="btn btn-primary" data-testid="link-favorites-browse">Browse matches</Link>} /></div>}</div>;
}

function LoginPage({ register = false }: { register?: boolean }) {
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  return <div className="auth-shell"><div className="auth-card"><Link href="/" className="brand" data-testid="link-auth-brand"><span className="brand-mark" />MatchZone</Link><span className="eyebrow" style={{ display: 'block', marginTop: 30 }}>{register ? 'Create your signal' : 'Welcome back'}</span><h1>{register ? 'Join the matchday.' : 'Log in to MatchZone.'}</h1><p>{register ? 'Build a sharper way to follow the clubs and competitions that matter to you.' : 'Your matches, teams and live moments are waiting.'}</p><form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); window.setTimeout(() => setLocation('/'), 550); }}><div className="form-field"><label className="form-label" htmlFor="email">Email address</label><div className="search-wrap"><Mail size={15} style={{ position: 'absolute', left: 13, color: 'hsl(var(--muted-foreground))' }} /><input id="email" className="form-input" style={{ paddingLeft: 38 }} type="email" required placeholder="you@example.com" data-testid="input-auth-email" /></div></div><div className="form-field"><label className="form-label" htmlFor="password">Password</label><div className="search-wrap"><LockKeyhole size={15} style={{ position: 'absolute', left: 13, color: 'hsl(var(--muted-foreground))' }} /><input id="password" className="form-input" style={{ paddingLeft: 38 }} type="password" required placeholder="••••••••" data-testid="input-auth-password" /></div></div>{register && <div className="form-field"><label className="form-label" htmlFor="name">Your name</label><input id="name" className="form-input" required placeholder="Jamie Doe" data-testid="input-auth-name" /></div>}{!register && <div className="form-row"><label className="form-check"><input type="checkbox" data-testid="input-remember" /> Remember me</label><button type="button" className="btn btn-ghost" style={{ padding: 0, minHeight: 20, color: 'hsl(var(--primary))' }} data-testid="button-forgot-password">Forgot password?</button></div>}<Button type="submit" className="auth-submit" disabled={submitted}>{submitted ? 'Opening MatchZone...' : register ? 'Create account' : 'Log in'}</Button></form><p className="auth-footer">{register ? 'Already have an account? ' : 'New to MatchZone? '}<Link href={register ? '/login' : '/register'} data-testid="link-auth-switch">{register ? 'Log in' : 'Create an account'}</Link></p></div></div>;
}

function ProfilePage() {
  const [notifications, setNotifications] = useState(true);
  const [scores, setScores] = useState(true);
  const [toast, setToast] = useState('');
  const save = () => setToast('Preferences saved locally');
  return <div className="page-frame"><PageHeading eyebrow="Account / settings" title="Profile" subtitle="Tune the way MatchZone reaches you on matchday." /><div className="profile-layout" style={{ marginTop: 29 }}><aside className="profile-side"><div className="profile-avatar">JD</div><div><h2>Jamie Doe</h2><p>jamie@example.com</p></div></aside><div><section className="profile-section"><h2>Your profile</h2><p>A few details for your MatchZone identity.</p><div className="form-field"><label className="form-label" htmlFor="profile-name">Display name</label><input id="profile-name" className="form-input" defaultValue="Jamie Doe" data-testid="input-profile-name" /></div><div className="form-field"><label className="form-label" htmlFor="profile-email">Email address</label><input id="profile-email" className="form-input" defaultValue="jamie@example.com" type="email" data-testid="input-profile-email" /></div><Button onClick={save} data-testid="button-save-profile">Save changes</Button></section><section className="profile-section"><h2>Matchday preferences</h2><p>Make your alerts feel useful, never noisy.</p><div className="preference"><div><b className="preference-title">Match start alerts</b><div className="preference-copy">A quiet nudge 15 minutes before kick-off.</div></div><button className={`toggle ${notifications ? 'on' : ''}`} onClick={() => setNotifications(!notifications)} data-testid="button-toggle-notifications"><span /></button></div><div className="preference"><div><b className="preference-title">Live score moments</b><div className="preference-copy">Goals, cards and full-time updates.</div></div><button className={`toggle ${scores ? 'on' : ''}`} onClick={() => setScores(!scores)} data-testid="button-toggle-scores"><span /></button></div></section></div></div>{toast && <Toast message={toast} onClose={() => setToast('')} />}</div>;
}

function NotFound() {
  return <div className="page-frame"><EmptyState icon={<Zap size={19} />} title="That page is offside" copy="The page you’re looking for doesn’t exist in this matchday." action={<Link href="/" className="btn btn-primary" data-testid="link-not-found-home">Back to home</Link>} /></div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><AppShell><Switch><Route path="/" component={Home} /><Route path="/live" component={LivePage} /><Route path="/matches" component={MatchesPage} /><Route path="/competitions" component={CompetitionsPage} /><Route path="/teams" component={TeamsPage} /><Route path="/match/:id" component={MatchDetailsPage} /><Route path="/watch/:id" component={WatchPage} /><Route path="/favorites" component={FavoritesPage} /><Route path="/login"><LoginPage /></Route><Route path="/register"><LoginPage register /></Route><Route path="/profile" component={ProfilePage} /><Route component={NotFound} /></Switch></AppShell></RoutedErrorBoundary>;
}

function App() {
  return <TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider>;
}

export default App;