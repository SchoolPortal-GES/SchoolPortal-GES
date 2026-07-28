import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useNav, type RouteId } from '@/lib/nav-context';
import { AppShell } from './AppShell';
import { Logo } from './Logo';
import { EmptyState, Spinner } from './ui';
import { ROLE_LABELS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { AppUser, School } from '@/lib/types';
import { School as SchoolIcon, Users, ClipboardList, BookOpen, Wallet, Megaphone, MessagesSquare, LayoutGrid, CalendarDays, Siren, Palmtree, Bell, ScrollText, FileText, Shield, Building2 } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const { navigate } = useNav();
  if (!user) return null;

  const title =
    user.role === 'super_admin' ? 'Super Admin Dashboard'
      : user.role === 'parent' ? 'Parent Dashboard'
      : `${ROLE_LABELS[user.role]} Dashboard`;

  return (
    <AppShell title={title}>
      <div className="space-y-6">
        <WelcomeCard user={user} />
        <RoleTools user={user} navigate={navigate} />
      </div>
    </AppShell>
  );
}

function WelcomeCard({ user }: { user: AppUser }) {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user.school_id) { if (active) setLoading(false); return; }
      const { data } = await supabase.from('schools').select('*').eq('id', user.school_id).maybeSingle();
      if (active) { setSchool(data as School | null); setLoading(false); }
    })();
    return () => { active = false; };
  }, [user.school_id]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-6 text-white" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-90">{greeting}</p>
            <h1 className="mt-0.5 text-2xl font-bold">{user.full_name || 'Welcome'}</h1>
            <p className="mt-1 text-sm opacity-90">{ROLE_LABELS[user.role]}{school && ` · ${school.name}`}</p>
          </div>
          <Logo size={48} className="bg-white/20" />
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800 sm:grid-cols-4">
        <Stat label="Role" value={ROLE_LABELS[user.role]} />
        <Stat label="School" value={loading ? '...' : school ? school.name : user.role === 'super_admin' ? 'Platform' : '—'} />
        <Stat label="Status" value={user.is_active ? 'Active' : 'Inactive'} />
        <Stat label="Profile" value={user.profile_completed ? 'Complete' : 'Pending'} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

type Feature = { label: string; desc: string; icon: typeof SchoolIcon; route: RouteId };

function RoleTools({ user, navigate }: { user: AppUser; navigate: (r: RouteId) => void }) {
  let features: Feature[] = [];
  if (user.role === 'super_admin') {
    features = [
      { label: 'School Management', desc: 'Register, deactivate, delete schools', icon: SchoolIcon, route: 'schools' },
      { label: 'Office Users', desc: 'Register district office staff', icon: Users, route: 'office-users' },
      { label: 'Advertisements', desc: 'Platform-wide ads', icon: Megaphone, route: 'advertisements' },
      { label: 'Broadcast Messaging', desc: 'Message all schools', icon: Bell, route: 'broadcasts' },
      { label: 'Emergency Alerts', desc: 'Send urgent alerts', icon: Siren, route: 'emergency-alerts' },
      { label: 'Audit Logs', desc: 'View all admin actions', icon: ScrollText, route: 'audit-logs' },
      { label: 'Data Backup', desc: 'Export platform data', icon: FileText, route: 'data-backup' },
    ];
  } else if (user.role === 'headteacher' || user.role === 'assistant_headteacher') {
    features = [
      { label: 'Staff Management', desc: 'Register and manage staff', icon: Users, route: 'staff' },
      { label: 'Staff Appointment', desc: 'Assign classes and subjects', icon: ClipboardList, route: 'staff-appointment' },
      { label: 'Academic Records', desc: 'Scores and report cards', icon: BookOpen, route: 'academic-records' },
      { label: 'Fees and Levies', desc: 'Levy setup and payments', icon: Wallet, route: 'levies' },
      { label: 'Announcements', desc: 'Post school notices', icon: Megaphone, route: 'announcements' },
      { label: 'Chat', desc: 'In-app messaging', icon: MessagesSquare, route: 'chat' },
      { label: 'Status Tracking', desc: 'Staff progress overview', icon: LayoutGrid, route: 'status' },
      { label: 'Event Calendar', desc: 'School events', icon: CalendarDays, route: 'event-calendar' },
      { label: 'Emergency Alert', desc: 'Send urgent alert', icon: Siren, route: 'emergency-alerts' },
      { label: 'Leave Requests', desc: 'Approve staff leave', icon: Palmtree, route: 'leave-applications' },
      { label: 'Broadcast Messaging', desc: 'Message school', icon: Bell, route: 'broadcasts' },
      { label: 'District Data Sharing', desc: 'Control district data access', icon: Shield, route: 'district-data-sharing' },
      { label: 'District Meetings', desc: 'View meeting invitations', icon: CalendarDays, route: 'district-meetings' },
      { label: 'District Chat', desc: 'Meeting group chats', icon: MessagesSquare, route: 'district-chat' },
      { label: 'Audit Logs', desc: 'View admin actions', icon: ScrollText, route: 'audit-logs' },
    ];
  } else if (user.role === 'emis_officer') {
    features = [
      { label: 'School Data', desc: 'View approved school data', icon: Building2, route: 'school-data-view' },
      { label: 'Data Sharing Controls', desc: 'Manage officer data access', icon: Shield, route: 'emis-sharing' },
      { label: 'District Meetings', desc: 'Schedule and manage meetings', icon: CalendarDays, route: 'district-meetings' },
      { label: 'District Chat', desc: 'Office messaging', icon: MessagesSquare, route: 'district-chat' },
    ];
  } else if (user.role === 'district_director') {
    features = [
      { label: 'School Data', desc: 'View approved school data', icon: Building2, route: 'school-data-view' },
      { label: 'District Meetings', desc: 'Schedule and manage meetings', icon: CalendarDays, route: 'district-meetings' },
      { label: 'District Chat', desc: 'Office messaging', icon: MessagesSquare, route: 'district-chat' },
    ];
  } else if (['director_admin', 'director_hr', 'circuit_supervisor', 'district_education_officer'].includes(user.role)) {
    features = [
      { label: 'School Data', desc: 'View shared school data', icon: Building2, route: 'school-data-view' },
      { label: 'District Meetings', desc: 'View and join meetings', icon: CalendarDays, route: 'district-meetings' },
      { label: 'District Chat', desc: 'Office messaging', icon: MessagesSquare, route: 'district-chat' },
    ];
  } else if (user.role === 'staff') {
    features = [
      { label: 'Academic Records', desc: 'Enter scores, fill report cards', icon: BookOpen, route: 'academic-records' },
      { label: 'Announcements', desc: 'Read school notices', icon: Megaphone, route: 'announcements' },
      { label: 'Chat', desc: 'In-app messaging', icon: MessagesSquare, route: 'chat' },
      { label: 'Status Tracker', desc: 'Your task progress', icon: LayoutGrid, route: 'status' },
      { label: 'Leave Application', desc: 'Apply for leave', icon: Palmtree, route: 'leave-applications' },
      { label: 'Documents', desc: 'Upload documents', icon: FileText, route: 'documents' },
    ];
  } else {
    features = [
      { label: 'Messages', desc: 'School messages', icon: Bell, route: 'messages' },
      { label: 'Chat', desc: 'Chat with school', icon: MessagesSquare, route: 'chat' },
      { label: 'Announcements', desc: 'Read announcements', icon: Megaphone, route: 'announcements' },
      { label: 'Fees and Levies', desc: 'Check balances, pay', icon: Wallet, route: 'levies' },
      { label: 'Event Calendar', desc: 'Upcoming events', icon: CalendarDays, route: 'event-calendar' },
      { label: 'Emergency Alerts', desc: 'View alerts', icon: Siren, route: 'emergency-alerts' },
    ];
  }
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {user.role === 'parent' ? 'Your dashboard' : 'Quick access'}
      </h3>
      {user.role === 'parent' ? (
        <ParentChildList />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <button key={f.label} onClick={() => navigate(f.route)} className="card group flex flex-col items-start p-4 text-left transition hover:border-primary-400 hover:shadow-md">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"><f.icon size={20} /></div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{f.label}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{f.desc}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ParentChildList() {
  const { user } = useAuth();
  const { navigate } = useNav();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<{ pupil_id: string; pupil: { full_name: string; current_class_name: string | null } }[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from('parent_pupil_links').select('pupil_id, pupil:pupils(full_name, current_class_name)').eq('parent_id', user?.id).eq('blocked', false);
      if (active) { setLinks((data as never) ?? []); setLoading(false); }
    })();
    return () => { active = false; };
  }, [user?.id]);
  if (loading) return <div className="flex justify-center py-8"><Spinner className="text-primary-600" /></div>;
  if (links.length === 0) return <EmptyState title="No children linked yet" message="Once your school links your child to your account, their records will appear here." />;
  return (
    <div className="space-y-3">
      {links.map((l) => (
        <button key={l.pupil_id} onClick={() => navigate('pupils', { pupilId: l.pupil_id })} className="card flex w-full items-center justify-between p-4 text-left transition hover:border-primary-400">
          <div><p className="font-semibold text-gray-900 dark:text-gray-100">{l.pupil?.full_name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{l.pupil?.current_class_name ?? 'Class not set'}</p></div>
          <span className="text-primary-600" style={{ color: 'var(--color-primary)' }}>View ›</span>
        </button>
      ))}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <Logo size={56} />
        <Spinner className="text-primary-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading SchoolPortal-GES…</p>
      </div>
    </div>
  );
}
