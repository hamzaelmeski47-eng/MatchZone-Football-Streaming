import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Competition, Match, Team } from './mock-data';
import {
  addFavoriteMatch,
  clearStoredAuth,
  forgotPasswordRequest,
  getCurrentUser,
  getStoredUser,
  googleLogin,
  loadFavoriteMatchIds,
  loadRemoteData,
  login as loginRequest,
  register as registerRequest,
  removeFavoriteMatch,
  resetPasswordWithCode,
  saveAuth,
  sendVerificationCode,
  updateCurrentUser as updateCurrentUserRequest,
  verifyAndRegister as verifyAndRegisterRequest,
  type ApiUser,
} from './api';

export type AppData = {
  matches: Match[];
  teams: Team[];
  competitions: Competition[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const DataContext = createContext<AppData>({
  matches: [],
  teams: [],
  competitions: [],
  loading: true,
  error: null,
  refresh: () => undefined,
});

export function MatchZoneDataProvider({ children }: { children: ReactNode }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = () => {
    loadRemoteData()
      .then((remoteData) => {
        setMatches(remoteData.matches);
        setTeams(remoteData.teams);
        setCompetitions(remoteData.competitions);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        console.error('[MatchZone] Failed to load matches from backend:', err);
        setLoading(false);

        const isQuota =
          err.status === 429 ||
          err.status === 400 ||
          (err.message && (err.message.includes('request limit') || err.message.includes('rate')));

        if (isQuota) {
          setError(
            'API daily quota reached (100 req/day free plan). ' +
            'Fix: go to dashboard.api-football.com → get a new free API key → update API_FOOTBALL_KEY in .env → restart backend. ' +
            'Or wait until midnight UTC for quota reset.'
          );
        } else {
          setError(err.message || 'Unable to load live matches. Please try again.');
        }
      });
  };

  useEffect(() => {
    fetchMatches();
    // Refresh matches every 30s to keep live scores and match minutes updated in real time
    const interval = setInterval(fetchMatches, 30 * 1000);
    return () => clearInterval(interval);
  }, []);


  return (
    <DataContext.Provider
      value={{
        matches,
        teams,
        competitions,
        loading,
        error,
        refresh: fetchMatches,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useMatchZoneData() {
  return useContext(DataContext);
}

type AuthContextValue = {
  user: ApiUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  sendVerification: (email: string, displayName?: string) => Promise<{ success: boolean; message: string; devCode?: string }>;
  verifyAndSignUp: (email: string, code: string, password: string, displayName: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; devCode?: string }>;
  resetPassword: (payload: { email: string; code: string; newPassword: string }) => Promise<void>;
  signInWithGoogle: (
    input: { credential?: string; email?: string; displayName?: string; avatarUrl?: string } | string,
    displayName?: string,
    avatarUrl?: string
  ) => Promise<void>;
  updateProfile: (input: { displayName?: string; avatarUrl?: string | null } | string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    if (!user) return;
    getCurrentUser()
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        window.localStorage.setItem('matchzone-user', JSON.stringify(currentUser));
      })
      .catch(() => {
        clearStoredAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        const result = await loginRequest(email, password);
        saveAuth(result.token, result.user);
        setUser(result.user);
      },
      async signUp(email, password, displayName) {
        const result = await registerRequest(email, password, displayName);
        saveAuth(result.token, result.user);
        setUser(result.user);
      },
      async sendVerification(email, displayName) {
        return await sendVerificationCode(email, displayName);
      },
      async verifyAndSignUp(email, code, password, displayName) {
        const result = await verifyAndRegisterRequest(email, code, password, displayName);
        saveAuth(result.token, result.user);
        setUser(result.user);
      },
      async forgotPassword(email) {
        return await forgotPasswordRequest(email);
      },
      async resetPassword(payload) {
        const result = await resetPasswordWithCode(payload);
        if (result.token && result.user) {
          saveAuth(result.token, result.user);
          setUser(result.user);
        }
      },
      async signInWithGoogle(input, displayName, avatarUrl) {
        const result = await googleLogin(input, displayName, avatarUrl);
        saveAuth(result.token, result.user);
        setUser(result.user);
      },
      async updateProfile(input) {
        const result = await updateCurrentUserRequest(input);
        saveAuth(window.localStorage.getItem('matchzone-token') ?? '', result.user);
        setUser(result.user);
      },
      signOut() {
        clearStoredAuth();
        setUser(null);
      },
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

const FavoritesContext = createContext<{
  favorites: string[];
  toggleFavorite: (id: string) => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  pendingFavoriteId: string | null;
}>({
  favorites: [],
  toggleFavorite: () => undefined,
  showAuthModal: false,
  setShowAuthModal: () => undefined,
  pendingFavoriteId: null,
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setFavorites([]);
      return () => {
        active = false;
      };
    }

    loadFavoriteMatchIds()
      .then((ids) => {
        if (active) {
          if (pendingFavoriteId && !ids.includes(pendingFavoriteId)) {
            addFavoriteMatch(pendingFavoriteId)
              .then(() => setFavorites([...ids, pendingFavoriteId]))
              .catch(() => setFavorites(ids));
            setPendingFavoriteId(null);
          } else {
            setFavorites(ids);
          }
        }
      })
      .catch(() => {
        if (active) setFavorites([]);
      });
    return () => {
      active = false;
    };
  }, [user, pendingFavoriteId]);

  const toggleFavorite = (id: string) => {
    if (!user) {
      setPendingFavoriteId(id);
      setShowAuthModal(true);
      return;
    }

    const wasFavorite = favorites.includes(id);
    const next = wasFavorite ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(next);

    const request = wasFavorite ? removeFavoriteMatch(id) : addFavoriteMatch(id);
    request.catch(() => setFavorites(favorites));
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        showAuthModal,
        setShowAuthModal,
        pendingFavoriteId,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}

export type ThemeMode = 'dark' | 'light';

type ThemeContextType = {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => undefined,
  setTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const userSet = window.localStorage.getItem('matchzone_theme_explicit');
      if (userSet === 'true') {
        const stored = window.localStorage.getItem('matchzone_theme');
        if (stored === 'light' || stored === 'dark') return stored;
      }
    } catch {}
    return 'dark'; // Site opens in Dark Mode by default
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem('matchzone_theme', next);
        window.localStorage.setItem('matchzone_theme_explicit', 'true');
      } catch {}
      return next;
    });
  };

  const setTheme = (t: ThemeMode) => {
    try {
      window.localStorage.setItem('matchzone_theme', t);
      window.localStorage.setItem('matchzone_theme_explicit', 'true');
    } catch {}
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MatchZoneDataProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </MatchZoneDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}