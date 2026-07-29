import { useState, type ReactNode } from 'react';
import {
  Home, Users, CalendarCheck, MessageSquare, MoreHorizontal,
  ChevronDown, ArrowLeft, ArrowRight, RefreshCw, Database, Languages,
  ScrollText, LogOut, X, Settings as SettingsIcon, GraduationCap,
  ClipboardList, FileText, BookOpen, Wallet, Megaphone, MessagesSquare,
  LayoutGrid, CalendarDays, Siren, Palmtree, Bell, Building2, Shield,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useNav, useAutoLogout, type RouteId } from '@/lib/nav-context';
import { useAppearance } from '@/lib/appearance-context';
import { t } from '@/lib/i18n';
import { Wordmark } from './Logo';
import { ROLE_LABELS } from '@/lib/constants';

const BOTTOM_NAV: { route: RouteId; labelKey: string; icon: typeof Home; roles: string[] }[] = [
  { route: 'dashboard', labelKey: 'nav.home', icon: Home, roles: ['super_admin', 'headteacher', 'assistant_headteacher', 'staff', 'parent', 'emis_officer', 'district_director', 'director_admin', 'director_hr', 'circuit_supervisor', 'district_education_officer'] },
  { route: 'school-data-view', labelKey: 'nav.more', icon: BookOpen, roles: ['emis_officer', 'district_director', 'director_admin', 'director_hr', 'circuit_supervisor', 'district_education_officer'] },
  { route: 'district-chat', labelKey: 'nav.messages', icon: MessageSquare, roles: ['emis_officer', 'district_director', 'director_admin', 'director_hr', 'circuit_supervisor', 'district_education_officer', 'headteacher'] },
  { route: 'app-features', labelKey: 'nav.more', icon: MoreHorizontal, roles: ['super_admin', 'headteacher', 'assistant_headteacher', 'staff', 'parent'] },
];

const SIDE_MENU: { route: RouteId; labelKey: string; icon: typeof Home; roles: string[] }[] = [
  { route: 'staff', labelKey: 'nav.staff', icon: Users, roles: ['headteacher', 'assistant_headteacher', 'super_admin'] },
  { route: 'staff-appointment', labelKey: 'nav.staffAppointment', icon: ClipboardList, roles: ['headteacher', 'assistant_headteacher', 'super_admin'] },
  { route: 'documents', labelKey: 'nav.documents', icon: FileText, roles: ['headteacher', 'assistant_headteacher', 'staff', 'super_admin'] },
  { route: 'academic-records', labelKey: 'nav.academicRecords', icon: BookOpen, roles: ['headteacher', 'assistant_headteacher', 'staff', 'super_admin'] },
  { route: 'levies', labelKey: 'nav.levies', icon: Wallet, roles: ['headteacher', 'assistant_headteacher', 'staff', 'parent', 'super_admin'] },
  { route: 'announcements', labelKey: 'nav.announcements', icon: Megaphone, roles: ['headteacher', 'assistant_headteacher', 'staff', 'super_admin'] },
  { route: 'chat', labelKey: 'nav.chat', icon: MessagesSquare, roles: ['headteacher', 'assistant_headteacher', 'staff', 'parent', 'super_admin'] },
  { route: 'status', labelKey: 'nav.status', icon: LayoutGrid, roles: ['headteacher', 'assistant_headteacher', 'staff', 'super_admin'] },
  { route: 'app-features', labelKey: 'nav.appFeatures', icon: LayoutGrid, roles: ['super_admin', 'headteacher', 'assistant_headteacher', 'staff', 'parent'] },
  { route: 'event-calendar', labelKey: 'nav.eventCalendar', icon: CalendarDays, roles: ['headteacher', 'assistant_headteacher', 'staff', 'parent', 'super_admin'] },
  { route: 'emergency-alerts', labelKey: 'nav.emergencyAlerts', icon: Siren, roles: ['headteacher', 'assistant_headteacher', 'super_admin'] },
  { route: 'leave-applications', labelKey: 'nav.leaveApplications', icon: Palmtree, roles: ['staff', 'headteacher', 'assistant_headteacher'] },
  { route: 'settings', labelKey: 'nav.settings', icon: SettingsIcon, roles: ['super_admin', 'headteacher', 'assistant_headteacher', 'staff', 'parent'] },
  { route: 'advertisements', labelKey: 'nav.appFeatures', icon: Megaphone, roles: ['super_admin'] },
  { route: 'broadcasts', labelKey: 'nav.appFeatures', icon: Bell, roles: ['super_admin', 'headteacher', 'assistant_headteacher'] },
  { route: 'schools', labelKey: 'nav.appFeatures', icon: GraduationCap, roles: ['super_admin'] },
  { route: 'audit-logs', labelKey: 'nav.auditLogs', icon: ScrollText, roles: ['super_admin', 'headteacher', 'assistant_headteacher'] },
  // Office role routes
  { route: 'office-users', labelKey: 'nav.appFeatures', icon: Users, roles: ['super_admin', 'director_admin', 'director_hr', 'emis_officer'] },
  { route: 'office-notices', labelKey: 'nav.appFeatures', icon: Megaphone, roles: ['emis_officer', 'district_director', 'director_admin', 'director_hr', 'circuit_supervisor', 'district_education_officer'] },
  { route: 'school-data-view', labelKey: 'nav.appFeatures', icon: Building2, roles: ['emis_officer', 'district_director', 'director_admin', 'director_hr', 'circuit_supervisor', 'district_education_officer'] },
  { route: 'emis-sharing', labelKey: 'nav.appFeatures', icon: Shield, roles: ['emis_officer'] },
  { route: 'district-meetings', labelKey: 'nav.appFeatures', icon: CalendarDays, roles: ['emis_officer', 'district_director', 'director_admin', 'director_hr', 'circuit_supervisor', 'district_education_officer', 'headteacher'] },
  { route: 'district-chat', labelKey: 'nav.appFeatures', icon: MessagesSquare, roles: ['emis_officer', 'district_director', 'director_admin', 'director_hr', 'circuit_supervisor', 'district_education_officer', 'headteacher'] },
  { route: 'district-data-sharing', labelKey: 'nav.appFeatures', icon: Shield, roles: ['headteacher'] },
];

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const { user, logout } = useAuth();
  const { route, navigate, back, forward, canGoBack, canGoForward, refresh, sideMenuOpen, setSideMenuOpen } = useNav();
  const { appearance } = useAppearance();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { warningSeconds, dismissWarning } = useAutoLogout(() => void logout());

  if (!user) return <>{children}</>;

  const role = user.role;
  const bottomItems = BOTTOM_NAV.filter((i) => i.roles.includes(role));
  const sideItems = SIDE_MENU.filter((i) => i.roles.includes(role));

  const navItems: { label: string; icon: typeof Home; onClick: () => void; disabled?: boolean }[] = [
    { label: t(appearance.language, 'nav.home'), icon: Home, onClick: () => navigate('dashboard') },
    { label: t(appearance.language, 'nav.back'), icon: ArrowLeft, onClick: back, disabled: !canGoBack },
    { label: t(appearance.language, 'nav.forward'), icon: ArrowRight, onClick: forward, disabled: !canGoForward },
    { label: t(appearance.language, 'nav.refresh'), icon: RefreshCw, onClick: refresh },
    { label: t(appearance.language, 'nav.syncStatus'), icon: RefreshCw, onClick: () => setDropdownOpen(false) },
    { label: t(appearance.language, 'nav.dataBackup'), icon: Database, onClick: () => { navigate('data-backup'); setDropdownOpen(false); } },
    { label: t(appearance.language, 'nav.languageSettings'), icon: Languages, onClick: () => { navigate('language'); setDropdownOpen(false); } },
    { label: t(appearance.language, 'nav.auditLogs'), icon: ScrollText, onClick: () => { navigate('audit-logs'); setDropdownOpen(false); } },
    { label: t(appearance.language, 'nav.logout'), icon: LogOut, onClick: () => void logout() },
  ];

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
        <div className="flex items-center justify-between px-4 py-3">
          <Wordmark />
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={() => navigate('profile')}
                className="hidden items-center gap-2 rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 sm:flex"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  {(user.full_name || '?').charAt(0).toUpperCase()}
                </span>
                {user.full_name} · {ROLE_LABELS[user.role]}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Navigation menu"
                aria-expanded={dropdownOpen}
              >
                <ChevronDown size={22} />
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                    {navItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          item.onClick();
                          setDropdownOpen(false);
                        }}
                        disabled={item.disabled}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <item.icon size={18} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col lg:flex-row">
        <aside className="hidden w-56 shrink-0 border-r border-gray-200 p-3 dark:border-gray-800 lg:block">
          <nav className="space-y-1">
            {sideItems.map((item) => (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  route === item.route
                    ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                <item.icon size={18} />
                {t(appearance.language, item.labelKey)}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6">{children}</main>
      </div>

      {sideMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setSideMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] overflow-y-auto bg-white p-4 shadow-xl dark:bg-gray-900 animate-slide-in">
            <div className="mb-4 flex items-center justify-between">
              <Wordmark />
              <button onClick={() => setSideMenuOpen(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-1">
              {sideItems.map((item) => (
                <button
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    route === item.route
                      ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  <item.icon size={18} />
                  {t(appearance.language, item.labelKey)}
                </button>
              ))}
              <button
                onClick={() => void logout()}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <LogOut size={18} />
                {t(appearance.language, 'nav.logout')}
              </button>
            </nav>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:hidden">
        <div className="flex items-stretch justify-around">
          {bottomItems.map((item) => {
            const active = route === item.route || (item.route === 'app-features' && route === 'app-features');
            return (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
                  active ? 'font-semibold text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'
                }`}
                style={active ? { color: 'var(--color-primary)' } : undefined}
              >
                <item.icon size={22} />
                {t(appearance.language, item.labelKey)}
              </button>
            );
          })}
        </div>
      </nav>

      {warningSeconds !== null && warningSeconds > 0 && (
        <div
          className="fixed left-1/2 top-0 z-[60] w-full max-w-md -translate-x-1/2 animate-slide-down"
          onClick={dismissWarning}
        >
          <div className="m-3 rounded-xl bg-amber-500 px-4 py-3 text-center text-white shadow-lg">
            <p className="text-sm font-medium">
              You will be logged out in {Math.floor(warningSeconds / 60)}:
              {String(warningSeconds % 60).padStart(2, '0')} due to inactivity. Tap anywhere to stay logged in.
            </p>
          </div>
        </div>
      )}

      <style>{`@keyframes slide-in { from { transform: translateX(-100%); } to { transform: translateX(0); } } .animate-slide-in { animation: slide-in 0.25s ease-out; }`}</style>
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      {action}
    </div>
  );
}