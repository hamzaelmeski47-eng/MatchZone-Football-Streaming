import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { competitions as fallbackCompetitions, matches as fallbackMatches, teams as fallbackTeams, type Competition, type Match, type Team } from './mock-data';
import {
  addFavoriteMatch,
  clearStoredAuth,
  getCurrentUser,
  getStoredUser,
  loadFavoriteMatchIds,
  loadRemoteData,
  login as loginRequest,
  register as registerRequest,
  removeFavoriteMatch,
  saveAuth,
  updateCurrentUser as updateCurrentUserRequest,
  type ApiUser,
} from './api';

type AppData = {
  matches: Match[];
  teams: Team[];
  competitions: Competition[];
  loading: boolean;
  usingDemoData: boolean;
};

const fallbackData = {
  matches: fallbackMatches,
  teams: fallbackTeams,
  competitions: fallbackCompetitions,
};

const DataContext = createContext<AppData>({
  ...fallbackData,
  loading: true,
  usingDemoData: true,
});

export function MatchZoneDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({
    ...fallbackData,
    loading: true,
    usingDemoData: true,
  });

  useEffect(() => {
    let active = true;
    loadRemoteData()
      .then((remoteData) => {
        if (active) setData({ ...remoteData, loading: false, usingDemoData: false });
      })
      .catch((error) => {
        console.warn('[MatchZone] API data unavailable; showing demo data.', error);
        if (active) setData((current) => ({ ...current, loading: false, usingDemoData: true }));
      });
    return () => {
      active = false;
    };
  }, []);

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

export function useMatchZoneData() {
  return useContext(DataContext);
}

type AuthContextValue = {
  user: ApiUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
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

  const value = useMemo<AuthContextValue>(() => ({
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
    async updateProfile(displayName) {
      const result = await updateCurrentUserRequest(displayName);
      saveAuth(window.localStorage.getItem('matchzone-token') ?? '', result.user);
      setUser(result.user);
    },
    signOut() {
      clearStoredAuth();
      setUser(null);
    },
  }), [loading, user]);

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
}>({ favorites: [], toggleFavorite: () => undefined });

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    if (!user) {
      try {
        setFavorites(JSON.parse(window.localStorage.getItem('matchzone-favorites') ?? '[]') as string[]);
      } catch {
        setFavorites([]);
      }
      return () => {
        active = false;
      };
    }

    loadFavoriteMatchIds()
      .then((ids) => {
        if (active) setFavorites(ids);
      })
      .catch(() => {
        if (active) setFavorites([]);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const toggleFavorite = (id: string) => {
    const wasFavorite = favorites.includes(id);
    const next = wasFavorite ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(next);

    if (!user) {
      window.localStorage.setItem('matchzone-favorites', JSON.stringify(next));
      return;
    }

    const request = wasFavorite ? removeFavoriteMatch(id) : addFavoriteMatch(id);
    request.catch(() => setFavorites(favorites));
  };

  return <FavoritesContext.Provider value={{ favorites, toggleFavorite }}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  return useContext(FavoritesContext);
}

export function AppProviders({ children }: { children: ReactNode }) {
  return <AuthProvider><MatchZoneDataProvider><FavoritesProvider>{children}</FavoritesProvider></MatchZoneDataProvider></AuthProvider>;
}