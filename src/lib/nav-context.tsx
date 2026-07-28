import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './auth-context';

export type RouteId =
  | 'dashboard' | 'pupils' | 'attendance' | 'messages' | 'staff' | 'staff-appointment'
  | 'documents' | 'academic-records' | 'levies' | 'announcements' | 'chat' | 'status'
  | 'app-features' | 'class-registration' | 'event-calendar' | 'emergency-alerts'
  | 'leave-applications' | 'settings' | 'appearance' | 'wallpaper' | 'language'
  | 'schools' | 'forgot-pin' | 'audit-logs' | 'data-backup' | 'advertisements'
  | 'broadcasts' | 'profile'
  | 'district-data-sharing' | 'export-approvals' | 'district-meetings'
  | 'district-chat' | 'office-users' | 'emis-sharing' | 'school-data-view';

interface NavContextValue {
  route: RouteId;
  params: Record<string, string>;
  navigate: (route: RouteId, params?: Record<string, string>) => void;
  back: () => void;
  forward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  refreshKey: number;
  refresh: () => void;
  sideMenuOpen: boolean;
  setSideMenuOpen: (v: boolean) => void;
}

const NavContext = createContext<NavContextValue | undefined>(undefined);

export function NavProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [route, setRoute] = useState<RouteId>('dashboard');
  const [params, setParams] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<RouteId[]>(['dashboard']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  const navigate = useCallback((r: RouteId, p: Record<string, string> = {}) => {
    setRoute(r); setParams(p); setSideMenuOpen(false);
    setHistory((h) => { const trimmed = h.slice(0, historyIndex + 1); return [...trimmed, r]; });
    setHistoryIndex((i) => i + 1);
    window.scrollTo({ top: 0 });
  }, [historyIndex]);

  const back = useCallback(() => { setHistoryIndex((i) => { if (i > 0) { const ni = i - 1; setRoute(history[ni]); return ni; } return i; }); }, [history]);
  const forward = useCallback(() => { setHistoryIndex((i) => { if (i < history.length - 1) { const ni = i + 1; setRoute(history[ni]); return ni; } return i; }); }, [history]);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => { setRoute('dashboard'); setParams({}); setHistory(['dashboard']); setHistoryIndex(0); }, [user?.id]);

  useEffect(() => {
    let startX = 0; let startY = 0;
    function onStart(e: TouchEvent) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }
    function onMove(e: TouchEvent) { const dx = e.touches[0].clientX - startX; const dy = e.touches[0].clientY - startY; if (dx > 60 && Math.abs(dy) < 40 && startX < 40) setSideMenuOpen(true); }
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchmove', onMove); };
  }, []);

  const value = useMemo<NavContextValue>(() => ({ route, params, navigate, back, forward, canGoBack: historyIndex > 0, canGoForward: historyIndex < history.length - 1, refreshKey, refresh, sideMenuOpen, setSideMenuOpen }), [route, params, navigate, back, forward, historyIndex, history.length, refreshKey, refresh, sideMenuOpen]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue { const ctx = useContext(NavContext); if (!ctx) throw new Error('useNav must be used within NavProvider'); return ctx; }

export function useAutoLogout(onLogout: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [warningSeconds, setWarningSeconds] = useState<number | null>(null);
  const IDLE_MS = 15 * 60 * 1000;
  const WARN_AT_MS = 13 * 60 * 1000;
  const reset = useCallback(() => { if (timerRef.current) clearTimeout(timerRef.current); if (warnRef.current) clearTimeout(warnRef.current); setWarningSeconds(null); warnRef.current = setTimeout(() => setWarningSeconds(120), WARN_AT_MS); timerRef.current = setTimeout(() => onLogout(), IDLE_MS); }, [onLogout]);
  useEffect(() => { reset(); const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']; const handler = () => reset(); events.forEach((e) => window.addEventListener(e, handler, { passive: true })); return () => { events.forEach((e) => window.removeEventListener(e, handler)); if (timerRef.current) clearTimeout(timerRef.current); if (warnRef.current) clearTimeout(warnRef.current); }; }, [reset]);
  useEffect(() => { if (warningSeconds === null) return; if (warningSeconds <= 0) { onLogout(); return; } const t = setTimeout(() => setWarningSeconds((s) => (s ?? 1) - 1), 1000); return () => clearTimeout(t); }, [warningSeconds, onLogout]);
  const dismissWarning = useCallback(() => { setWarningSeconds(null); reset(); }, [reset]);
  return { warningSeconds, dismissWarning, resetTimer: reset };
}
