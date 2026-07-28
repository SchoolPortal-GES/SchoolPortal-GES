import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, ToggleLeft, ToggleRight, FileText, Check, X, Clock,
  Users, Plus, CalendarDays, MessageSquare, Shield, Eye, Download,
  Send, ChevronRight, Building2, AlertCircle,
} from 'lucide-react';
import { AppShell } from './AppShell';
import { Alert, Button, EmptyState, Field, Modal, Spinner } from './ui';
import { useAuth } from '@/lib/auth-context';
import { ROLE_LABELS, DATA_SHARING_CATEGORIES, EMIS_SHARING_CATEGORIES, OFFICE_ROLE_LABELS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import * as authApi from '@/lib/auth';
import type { AppUser, ExportRequest, DistrictDataToggle, DataToggleAuditLog, EmisSharingGrant, DistrictMeeting, DistrictMeetingInvitation, DistrictChatConversation, School } from '@/lib/types';

export function DistrictDataSharingScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [toggles, setToggles] = useState<DistrictDataToggle[]>([]);
  const [auditLog, setAuditLog] = useState<DataToggleAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.school_id) return;
    setLoading(true); setError(null);
    try {
      const [t, a] = await Promise.all([authApi.getDistrictDataToggles(user.school_id), authApi.getDataToggleAuditLog()]);
      setToggles(t); setAuditLog(a.filter((log) => log.school_id === user.school_id));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load data sharing settings.'); }
    finally { setLoading(false); }
  }, [user?.school_id]);
  useEffect(() => { void load(); }, [load]);

  async function handleToggle(category: string, currentEnabled: boolean) {
    setError(null); setSuccess(null);
    try {
      await authApi.toggleDistrictDataSharing(category, !currentEnabled);
      setSuccess(`${DATA_SHARING_CATEGORIES.find((c) => c.key === category)?.label ?? category} is now ${!currentEnabled ? 'ON' : 'OFF'}.`);
      await load(); setTimeout(() => setSuccess(null), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update toggle.'); }
  }

  if (!user?.school_id) return (<AppShell title="District Data Sharing"><button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-600 hover:underline dark:text-gray-300"><ArrowLeft size={16} /> Back</button><EmptyState title="No school" message="You need to be associated with a school to manage data sharing." /></AppShell>);

  return (
    <AppShell title="District Data Sharing">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-600 hover:underline dark:text-gray-300"><ArrowLeft size={16} /> Back to Settings</button>
      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      {success && <div className="mb-4"><Alert type="success">{success}</Alert></div>}
      {loading ? <div className="flex justify-center py-12"><Spinner className="text-primary-600" /></div> : (
        <div className="space-y-6">
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2"><Shield size={20} className="text-primary-600" /><h3 className="font-semibold text-gray-900 dark:text-gray-100">Data Sharing Controls</h3></div>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Control which categories of your school's data are visible to the District Education Office. All toggles default to OFF. Changes take effect immediately.</p>
            <div className="space-y-3">
              {DATA_SHARING_CATEGORIES.map((cat) => {
                const toggle = toggles.find((t) => t.category === cat.key);
                const enabled = toggle?.is_enabled ?? false;
                return (
                  <div key={cat.key} className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                    <div className="mr-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{cat.label}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{enabled ? 'Visible to EMIS Officer and District Director' : 'Hidden from all District Office users'}</p>
                    </div>
                    <button onClick={() => handleToggle(cat.key, enabled)} className={`flex items-center gap-1 text-sm font-medium ${enabled ? 'text-green-700 dark:text-green-300' : 'text-gray-500'}`}>
                      {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}{enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
          <ExportApprovalsSection />
          <section className="card p-5">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Toggle Change History</h3>
            {auditLog.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No toggle changes recorded yet.</p> : (
              <div className="space-y-2">
                {auditLog.map((log) => (
                  <div key={log.id} className="rounded-lg border border-gray-100 p-3 text-sm dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{DATA_SHARING_CATEGORIES.find((c) => c.key === log.category)?.label ?? log.category}</span>
                      <span className="text-xs text-gray-400">{new Date(log.changed_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Changed by {log.headteacher_name} — {log.old_status === null ? '—' : log.old_status ? 'ON' : 'OFF'} → {log.new_status ? 'ON' : 'OFF'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}

function ExportApprovalsSection() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ExportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!user?.id) return; try { const reqs = await authApi.getExportRequestsForHeadteacher(user.id); setRequests(reqs); } catch { } finally { setLoading(false); } }, [user?.id]);
  useEffect(() => { void load(); }, [load]);
  async function handleRespond(requestId: string, approve: boolean) { try { await authApi.respondToExportRequest(requestId, approve); await load(); } catch (err) { alert(err instanceof Error ? err.message : 'Could not respond.'); } }
  const pending = requests.filter((r) => r.status === 'pending');
  const resolved = requests.filter((r) => r.status !== 'pending');
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-2"><FileText size={20} className="text-primary-600" /><h3 className="font-semibold text-gray-900 dark:text-gray-100">Export Approval Requests</h3></div>
      {loading ? <div className="flex justify-center py-4"><Spinner className="text-primary-600" /></div> : pending.length === 0 && resolved.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No export requests received.</p> : (
        <div className="space-y-4">
          {pending.length > 0 && (<div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Pending</p>{pending.map((req) => <ExportRequestCard key={req.id} request={req} onRespond={handleRespond} />)}</div>)}
          {resolved.length > 0 && (<div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">History</p>{resolved.slice(0, 10).map((req) => <ExportRequestCard key={req.id} request={req} />)}</div>)}
        </div>
      )}
    </section>
  );
}

function ExportRequestCard({ request, onRespond }: { request: ExportRequest; onRespond?: (id: string, approve: boolean) => void }) {
  const requester = request.requester as unknown as { full_name: string; role: string; office_designation: string | null } | undefined;
  const statusColors: Record<string, string> = { pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', declined: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{request.document_type}</p>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">From: {requester?.full_name ?? 'Unknown'} ({requester?.office_designation ?? ROLE_LABELS[requester?.role ?? ''] ?? 'Office'})</p>
          {request.reason && <p className="mt-1 text-xs text-gray-500">Reason: {request.reason}</p>}
          <p className="mt-1 text-xs text-gray-400">{new Date(request.created_at).toLocaleString()}</p>
          {request.status === 'pending' && <p className="mt-1 text-xs text-amber-600"><Clock size={12} className="inline" /> Expires in {Math.max(0, Math.round((new Date(request.expires_at).getTime() - Date.now()) / 3600000))}h</p>}
        </div>
        <span className={`badge ${statusColors[request.status]}`}>{request.status}</span>
      </div>
      {request.status === 'pending' && onRespond && (
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" onClick={() => onRespond(request.id, true)} className="!bg-green-50 !text-green-700 dark:!bg-green-900/30 dark:!text-green-300"><Check size={16} /> Approve Export</Button>
          <Button variant="secondary" onClick={() => onRespond(request.id, false)} className="!bg-red-50 !text-red-700 dark:!bg-red-900/30 dark:!text-red-300"><X size={16} /> Decline Export</Button>
        </div>
      )}
    </div>
  );
}

export function OfficeUserManagementScreen({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { const officeUsers = await authApi.getDistrictOfficeUsers(); setUsers(officeUsers); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load office users.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return (
    <AppShell title="Office User Management">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:underline dark:text-gray-300"><ArrowLeft size={16} /> Back</button>
        <Button onClick={() => setShowForm(true)}><Plus size={18} /> Register Office User</Button>
      </div>
      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      {loading ? <div className="flex justify-center py-12"><Spinner className="text-primary-600" /></div> : users.length === 0 ? <EmptyState title="No Office users" message="Register District Education Office staff to get started." /> : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="card flex items-center justify-between p-4">
              <div><p className="font-semibold text-gray-900 dark:text-gray-100">{u.full_name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{OFFICE_ROLE_LABELS[u.role] ?? ROLE_LABELS[u.role] ?? u.role}</p><p className="text-xs text-gray-400">{u.phone}</p></div>
              <span className={`badge ${u.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
        </div>
      )}
      {showForm && <RegisterOfficeUserModal onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); await load(); }} />}
    </AppShell>
  );
}

function RegisterOfficeUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [pin, setPin] = useState(''); const [role, setRole] = useState('emis_officer'); const [districtId, setDistrictId] = useState('');
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [success, setSuccess] = useState(false);
  async function handleSave() {
    setError(null);
    if (!name.trim()) { setError('Name is required.'); return; } if (!phone.trim()) { setError('Phone number is required.'); return; } if (pin.length < 4) { setError('PIN must be at least 4 characters.'); return; } if (!districtId.trim()) { setError('District is required.'); return; }
    setLoading(true);
    try { await authApi.registerOfficeUser({ name: name.trim(), phone: phone.trim(), pin, role, officeDesignation: OFFICE_ROLE_LABELS[role] ?? role, districtId: districtId.trim() }); setSuccess(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Registration failed.'); } finally { setLoading(false); }
  }
  if (success) return (<Modal open onClose={onSaved} title="Office User Registered"><Alert type="success">Office user registered successfully. They can log in with the provided credentials and will be prompted to complete their profile.</Alert><div className="mt-4 flex justify-end"><Button onClick={onSaved}>Done</Button></div></Modal>);
  return (
    <Modal open onClose={onClose} title="Register Office User">
      {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
      <div className="space-y-3">
        <Field label="Full Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Phone Number (login username)"><input type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Temporary PIN"><input type="text" inputMode="numeric" className="input" value={pin} onChange={(e) => setPin(e.target.value)} /></Field>
        <Field label="Role"><select className="input" value={role} onChange={(e) => setRole(e.target.value)}>{Object.entries(OFFICE_ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <Field label="District"><input className="input" value={districtId} onChange={(e) => setDistrictId(e.target.value)} placeholder="e.g. Accra Metro" /></Field>
        <div className="flex justify-end"><Button onClick={handleSave} loading={loading}>Register</Button></div>
      </div>
    </Modal>
  );
}

export function EmisSharingScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [grants, setGrants] = useState<EmisSharingGrant[]>([]); const [officers, setOfficers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [showForm, setShowForm] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { const [g, o] = await Promise.all([authApi.getEmisSharingGrants(), authApi.getDistrictOfficeUsers(user?.district_id ?? undefined)]); setGrants(g.filter((gr) => !gr.revoked)); setOfficers(o.filter((u) => u.id !== user?.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load sharing controls.'); } finally { setLoading(false); }
  }, [user?.id, user?.district_id]);
  useEffect(() => { void load(); }, [load]);
  async function handleRevoke(grantId: string) { try { await authApi.revokeEmisSharingGrant(grantId); await load(); } catch (err) { alert(err instanceof Error ? err.message : 'Could not revoke.'); } }
  return (
    <AppShell title="EMIS Data Sharing Controls">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:underline dark:text-gray-300"><ArrowLeft size={16} /> Back</button>
        <Button onClick={() => setShowForm(true)}><Plus size={18} /> Share Data</Button>
      </div>
      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      {loading ? <div className="flex justify-center py-12"><Spinner className="text-primary-600" /></div> : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">As the EMIS Officer, you control which district officers can access school data. Officers without grants see "Data access not granted."</p>
          {grants.length === 0 ? <EmptyState title="No active sharing grants" message="Share data with district officers to give them access." /> : grants.map((grant) => {
            const target = grant.granted_to_user as unknown as AppUser | undefined;
            return (
              <div key={grant.id} className="card flex items-center justify-between p-4">
                <div><p className="font-medium text-gray-900 dark:text-gray-100">{target?.full_name ?? 'Unknown'}</p><p className="text-sm text-gray-500 dark:text-gray-400">{OFFICE_ROLE_LABELS[target?.role ?? ''] ?? ROLE_LABELS[target?.role ?? ''] ?? 'Office'}</p><p className="text-xs text-gray-400">{EMIS_SHARING_CATEGORIES.find((c) => c.key === grant.data_category)?.label ?? grant.data_category}{grant.is_permanent ? ' · Permanent' : grant.expires_at ? ` · Expires ${new Date(grant.expires_at).toLocaleDateString()}` : ''}</p></div>
                <Button variant="danger" onClick={() => handleRevoke(grant.id)}>Revoke</Button>
              </div>
            );
          })}
        </div>
      )}
      {showForm && <CreateGrantModal officers={officers} onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); await load(); }} />}
    </AppShell>
  );
}

function CreateGrantModal({ officers, onClose, onSaved }: { officers: AppUser[]; onClose: () => void; onSaved: () => void }) {
  const [officerId, setOfficerId] = useState(''); const [category, setCategory] = useState('all'); const [isPermanent, setIsPermanent] = useState(true); const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function handleSave() {
    setError(null); if (!officerId) { setError('Select an officer.'); return; } setLoading(true);
    try { await authApi.createEmisSharingGrant(officerId, category, isPermanent, isPermanent ? undefined : expiresAt ? new Date(expiresAt).toISOString() : undefined); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not create grant.'); } finally { setLoading(false); }
  }
  return (
    <Modal open onClose={onClose} title="Share Data with Officer">
      {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
      <div className="space-y-3">
        <Field label="Select Officer"><select className="input" value={officerId} onChange={(e) => setOfficerId(e.target.value)}><option value="">Select…</option>{officers.map((o) => <option key={o.id} value={o.id}>{o.full_name} — {OFFICE_ROLE_LABELS[o.role] ?? ROLE_LABELS[o.role]}</option>)}</select></Field>
        <Field label="Data Category"><select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{EMIS_SHARING_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></Field>
        <Field label="Duration"><div className="flex gap-3"><label className="flex items-center gap-1"><input type="radio" checked={isPermanent} onChange={() => setIsPermanent(true)} /><span className="text-sm">Permanent</span></label><label className="flex items-center gap-1"><input type="radio" checked={!isPermanent} onChange={() => setIsPermanent(false)} /><span className="text-sm">Time-limited</span></label></div></Field>
        {!isPermanent && <Field label="Expiry Date"><input type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></Field>}
        <div className="flex justify-end"><Button onClick={handleSave} loading={loading}>Share</Button></div>
      </div>
    </Modal>
  );
}

export function DistrictMeetingsScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<DistrictMeeting[]>([]); const [invitations, setInvitations] = useState<DistrictMeetingInvitation[]>([]);
  const [loading, setLoading] = useState(true); const [showForm, setShowForm] = useState(false); const [selectedMeeting, setSelectedMeeting] = useState<DistrictMeeting | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const [m, inv] = await Promise.all([authApi.getDistrictMeetings(), user?.role === 'headteacher' ? authApi.getMeetingInvitationsForHeadteacher(user.id) : Promise.resolve([])]); setMeetings(m); setInvitations(inv as DistrictMeetingInvitation[]); }
    catch { } finally { setLoading(false); }
  }, [user?.id, user?.role]);
  useEffect(() => { void load(); }, [load]);
  async function handleInvitationResponse(invitationId: string, accept: boolean) { try { await authApi.respondToMeetingInvitation(invitationId, accept); await load(); } catch (err) { alert(err instanceof Error ? err.message : 'Could not respond.'); } }
  const isOfficeRole = user && ['emis_officer', 'district_director', 'director_admin', 'director_hr', 'circuit_supervisor', 'district_education_officer'].includes(user.role);
  return (
    <AppShell title="District Meetings">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:underline dark:text-gray-300"><ArrowLeft size={16} /> Back</button>
        {isOfficeRole && <Button onClick={() => setShowForm(true)}><Plus size={18} /> Schedule Meeting</Button>}
      </div>
      {loading ? <div className="flex justify-center py-12"><Spinner className="text-primary-600" /></div> : (
        <div className="space-y-6">
          {user?.role === 'headteacher' && invitations.length > 0 && (
            <section className="card p-5">
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Meeting Invitations</h3>
              <div className="space-y-3">
                {invitations.filter((i) => i.status === 'pending').map((inv) => {
                  const meeting = inv.meeting as unknown as DistrictMeeting | undefined; const inviter = inv.inviter as unknown as AppUser | undefined;
                  return (
                    <div key={inv.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{meeting?.title ?? 'Meeting'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">From: {inviter?.full_name ?? 'Unknown'} ({inviter?.office_designation ?? ''})</p>
                      <p className="text-sm text-gray-500">When: {meeting ? new Date(meeting.meeting_date).toLocaleString() : ''}</p>
                      {meeting?.agenda && <p className="mt-1 text-xs text-gray-500">Agenda: {meeting.agenda}</p>}
                      <div className="mt-3 flex gap-2">
                        <Button variant="secondary" onClick={() => handleInvitationResponse(inv.id, true)} className="!bg-green-50 !text-green-700 dark:!bg-green-900/30 dark:!text-green-300"><Check size={16} /> Accept</Button>
                        <Button variant="secondary" onClick={() => handleInvitationResponse(inv.id, false)} className="!bg-red-50 !text-red-700 dark:!bg-red-900/30 dark:!text-red-300"><X size={16} /> Decline</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Upcoming Meetings</h3>
            {meetings.length === 0 ? <EmptyState title="No meetings" message="No district meetings scheduled yet." /> : (
              <div className="space-y-3">
                {meetings.map((m) => (
                  <button key={m.id} onClick={() => setSelectedMeeting(m)} className="card flex w-full items-center justify-between p-4 text-left transition hover:border-primary-400">
                    <div><p className="font-medium text-gray-900 dark:text-gray-100">{m.title}</p><p className="text-sm text-gray-500 dark:text-gray-400">{new Date(m.meeting_date).toLocaleString()} · {m.duration_minutes}min · {m.meeting_type.replace('_', '-')}</p></div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
      {showForm && isOfficeRole && <CreateMeetingModal onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); await load(); }} />}
      {selectedMeeting && <MeetingDetailModal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} />}
    </AppShell>
  );
}

function CreateMeetingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState(''); const [date, setDate] = useState(''); const [time, setTime] = useState(''); const [duration, setDuration] = useState(60);
  const [agenda, setAgenda] = useState(''); const [meetingType, setMeetingType] = useState('in_person'); const [officers, setOfficers] = useState<AppUser[]>([]);
  const [selectedOfficers, setSelectedOfficers] = useState<string[]>([]); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  useEffect(() => { (async () => { try { const o = await authApi.getDistrictOfficeUsers(user?.district_id ?? undefined); setOfficers(o.filter((u) => u.id !== user?.id)); } catch { } })(); }, [user?.id, user?.district_id]);
  async function handleSave() {
    setError(null); if (!title.trim()) { setError('Title is required.'); return; } if (!date || !time) { setError('Date and time are required.'); return; }
    const meetingDate = new Date(`${date}T${time}`).toISOString(); setLoading(true);
    try { await authApi.createDistrictMeeting(title.trim(), meetingDate, duration, agenda.trim(), meetingType, selectedOfficers); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not create meeting.'); } finally { setLoading(false); }
  }
  function toggleOfficer(id: string) { setSelectedOfficers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]); }
  return (
    <Modal open onClose={onClose} title="Schedule District Meeting">
      {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
      <div className="space-y-3">
        <Field label="Meeting Title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Time"><input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} /></Field></div>
        <Field label="Duration (minutes)"><input type="number" className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></Field>
        <Field label="Agenda"><textarea className="input min-h-[80px]" value={agenda} onChange={(e) => setAgenda(e.target.value)} /></Field>
        <Field label="Meeting Type"><select className="input" value={meetingType} onChange={(e) => setMeetingType(e.target.value)}><option value="in_person">In-Person</option><option value="virtual">Virtual</option><option value="hybrid">Hybrid</option></select></Field>
        <Field label="Participants">{officers.length === 0 ? <p className="text-sm text-gray-500">No other office users in your district.</p> : (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-800">
            {officers.map((o) => (<label key={o.id} className="flex items-center gap-2 rounded p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"><input type="checkbox" checked={selectedOfficers.includes(o.id)} onChange={() => toggleOfficer(o.id)} /><span className="text-sm text-gray-700 dark:text-gray-300">{o.full_name} — {OFFICE_ROLE_LABELS[o.role] ?? ROLE_LABELS[o.role]}</span></label>))}
          </div>
        )}</Field>
        <div className="flex justify-end"><Button onClick={handleSave} loading={loading}>Schedule</Button></div>
      </div>
    </Modal>
  );
}

function MeetingDetailModal({ meeting, onClose }: { meeting: DistrictMeeting; onClose: () => void }) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<{ user_id: string; rsvp_status: string; user?: AppUser }[]>([]);
  const [headteachers, setHeadteachers] = useState<AppUser[]>([]); const [showInviteForm, setShowInviteForm] = useState(false); const [selectedHts, setSelectedHts] = useState<string[]>([]);
  const isOfficeRole = user && ['emis_officer', 'district_director', 'director_admin', 'director_hr', 'circuit_supervisor', 'district_education_officer'].includes(user.role);
  useEffect(() => { (async () => { const { data } = await supabase.from('district_meeting_participants').select('*, user:user_id(full_name, role, office_designation)').eq('meeting_id', meeting.id); setParticipants(data ?? []); if (isOfficeRole) { const hts = await authApi.getHeadteachersInDistrict(user?.district_id ?? undefined); setHeadteachers(hts); } })(); }, [meeting.id, user?.district_id, isOfficeRole]);
  async function handleInvite() { try { await authApi.inviteHeadteachersToMeeting(meeting.id, selectedHts); setShowInviteForm(false); setSelectedHts([]); } catch (err) { alert(err instanceof Error ? err.message : 'Could not send invitations.'); } }
  async function handleRsvp(accept: boolean) { try { await authApi.respondToMeetingRsvp(meeting.id, accept); onClose(); } catch (err) { alert(err instanceof Error ? err.message : 'Could not respond.'); } }
  return (
    <Modal open onClose={onClose} title={meeting.title}>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">When: {new Date(meeting.meeting_date).toLocaleString()}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Duration: {meeting.duration_minutes} minutes</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Type: {meeting.meeting_type.replace('_', '-')}</p>
          {meeting.agenda && <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">{meeting.agenda}</div>}
        </div>
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Participants</p><div className="space-y-1">{participants.map((p) => (<div key={p.user_id} className="flex items-center justify-between rounded p-1.5 text-sm"><span className="text-gray-700 dark:text-gray-300">{p.user?.full_name ?? 'Unknown'}</span><span className={`badge text-xs ${p.rsvp_status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : p.rsvp_status === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>{p.rsvp_status}</span></div>))}</div></div>
        {isOfficeRole && (<div>{!showInviteForm ? <Button variant="secondary" onClick={() => setShowInviteForm(true)}><Users size={16} /> Add Headteachers</Button> : (
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="mb-2 text-sm font-medium">Invite Headteachers</p>
            <div className="max-h-32 space-y-1 overflow-y-auto">{headteachers.length === 0 ? <p className="text-sm text-gray-500">No headteachers found in your district.</p> : headteachers.map((ht) => (<label key={ht.id} className="flex items-center gap-2 rounded p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"><input type="checkbox" checked={selectedHts.includes(ht.id)} onChange={() => { setSelectedHts((prev) => prev.includes(ht.id) ? prev.filter((x) => x !== ht.id) : [...prev, ht.id]); }} /><span className="text-sm text-gray-700 dark:text-gray-300">{ht.full_name}</span></label>))}</div>
            <div className="mt-2 flex gap-2"><Button onClick={handleInvite}><Send size={14} /> Send Invitations</Button><Button variant="secondary" onClick={() => setShowInviteForm(false)}>Cancel</Button></div>
          </div>
        )}</div>)}
        {!isOfficeRole && (<div className="flex gap-2"><Button variant="secondary" onClick={() => handleRsvp(true)} className="!bg-green-50 !text-green-700 dark:!bg-green-900/30 dark:!text-green-300"><Check size={16} /> Accept</Button><Button variant="secondary" onClick={() => handleRsvp(false)} className="!bg-red-50 !text-red-700 dark:!bg-red-900/30 dark:!text-red-300"><X size={16} /> Decline</Button></div>)}
      </div>
    </Modal>
  );
}

export function DistrictChatScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DistrictChatConversation[]>([]);
  const [activeConv, setActiveConv] = useState<DistrictChatConversation | null>(null);
  const [messages, setMessages] = useState<{ id: string; content: string | null; sender_id: string; created_at: string; sender?: { full_name: string } }[]>([]);
  const [input, setInput] = useState(''); const [loading, setLoading] = useState(true); const [showGroupForm, setShowGroupForm] = useState(false);
  const load = useCallback(async () => { try { const convs = await authApi.getDistrictChatConversations(); setConversations(convs); } catch { } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!activeConv) return; (async () => { const msgs = await authApi.getDistrictChatMessages(activeConv.id); setMessages(msgs as typeof messages); })(); }, [activeConv?.id]);
  async function handleSend() { if (!input.trim() || !activeConv) return; try { await authApi.sendDistrictChatMessage(activeConv.id, input.trim()); setInput(''); const msgs = await authApi.getDistrictChatMessages(activeConv.id); setMessages(msgs as typeof messages); } catch (err) { alert(err instanceof Error ? err.message : 'Could not send message.'); } }
  if (loading) return (<AppShell title="District Chat"><div className="flex justify-center py-12"><Spinner className="text-primary-600" /></div></AppShell>);
  if (activeConv) return (
    <AppShell title={activeConv.name ?? 'Chat'}>
      <button onClick={() => setActiveConv(null)} className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-600 hover:underline dark:text-gray-300"><ArrowLeft size={16} /> Back to conversations</button>
      <div className="flex h-[60vh] flex-col rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex-1 overflow-y-auto space-y-2 p-4">
          {messages.length === 0 ? <p className="text-center text-sm text-gray-400 py-8">No messages yet. Start the conversation!</p> : messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
              {msg.sender_id !== user?.id && <span className="mb-0.5 text-xs text-gray-400">{msg.sender?.full_name}</span>}
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${msg.sender_id === user?.id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>{msg.content}<span className="mt-0.5 block text-[10px] opacity-60">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 p-3 dark:border-gray-800"><div className="flex gap-2"><input className="input flex-1" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void handleSend(); }} placeholder="Type a message…" /><Button onClick={handleSend}><Send size={16} /></Button></div></div>
      </div>
    </AppShell>
  );
  return (
    <AppShell title="District Chat">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:underline dark:text-gray-300"><ArrowLeft size={16} /> Back</button>
        <Button onClick={() => setShowGroupForm(true)}><Plus size={18} /> New Group</Button>
      </div>
      {conversations.length === 0 ? <EmptyState title="No conversations" message="Start a group chat or join a meeting to begin messaging." /> : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <button key={conv.id} onClick={() => setActiveConv(conv)} className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-primary-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">{conv.type === 'meeting' ? <CalendarDays size={20} /> : conv.type === 'group' ? <Users size={20} /> : <MessageSquare size={20} />}</div>
              <div className="min-w-0 flex-1"><p className="truncate font-medium text-gray-900 dark:text-gray-100">{conv.name ?? 'Private Chat'}</p><p className="text-xs text-gray-400 capitalize">{conv.type}</p></div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          ))}
        </div>
      )}
      {showGroupForm && <CreateGroupChatModal onClose={() => setShowGroupForm(false)} onSaved={async () => { setShowGroupForm(false); await load(); }} />}
    </AppShell>
  );
}

function CreateGroupChatModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(''); const [officers, setOfficers] = useState<AppUser[]>([]); const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  useEffect(() => { (async () => { const o = await authApi.getDistrictOfficeUsers(user?.district_id ?? undefined); setOfficers(o.filter((u) => u.id !== user?.id)); })(); }, [user?.id, user?.district_id]);
  async function handleSave() { if (!name.trim()) { setError('Group name is required.'); return; } setLoading(true); try { await authApi.createDistrictGroupChat(name.trim(), selected); onSaved(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not create group.'); } finally { setLoading(false); } }
  return (
    <Modal open onClose={onClose} title="Create Group Chat">
      {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
      <div className="space-y-3">
        <Field label="Group Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Academic Group" /></Field>
        <Field label="Members">{officers.length === 0 ? <p className="text-sm text-gray-500">No other office users available.</p> : (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-800">
            {officers.map((o) => (<label key={o.id} className="flex items-center gap-2 rounded p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"><input type="checkbox" checked={selected.includes(o.id)} onChange={() => { setSelected((prev) => prev.includes(o.id) ? prev.filter((x) => x !== o.id) : [...prev, o.id]); }} /><span className="text-sm text-gray-700 dark:text-gray-300">{o.full_name} — {OFFICE_ROLE_LABELS[o.role] ?? ROLE_LABELS[o.role]}</span></label>))}
          </div>
        )}</Field>
        <div className="flex justify-end"><Button onClick={handleSave} loading={loading}>Create</Button></div>
      </div>
    </Modal>
  );
}

export function SchoolDataViewScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]); const [toggles, setToggles] = useState<Record<string, DistrictDataToggle[]>>({}); const [grants, setGrants] = useState<EmisSharingGrant[]>([]); const [loading, setLoading] = useState(true);
  const isEmisOrDirector = user && ['emis_officer', 'district_director'].includes(user.role);
  useEffect(() => { (async () => { try { const { data: sData } = await supabase.from('schools').select('*').eq('deleted', false).eq('is_active', true); const sList = (sData as School[]) ?? []; setSchools(sList); const toggleMap: Record<string, DistrictDataToggle[]> = {}; for (const s of sList) { const t = await authApi.getDistrictDataToggles(s.id); toggleMap[s.id] = t; } setToggles(toggleMap); if (user && !isEmisOrDirector) { const g = await authApi.getEmisSharingGrants(user.id); setGrants(g.filter((gr) => !gr.revoked)); } } catch { } finally { setLoading(false); } })(); }, [user?.id, isEmisOrDirector]);
  const hasAccess = (category: string): boolean => { if (isEmisOrDirector) return true; return grants.some((g) => (g.data_category === category || g.data_category === 'all') && !g.revoked); };
  if (loading) return (<AppShell title="School Data"><div className="flex justify-center py-12"><Spinner className="text-primary-600" /></div></AppShell>);
  return (
    <AppShell title="School Data">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-600 hover:underline dark:text-gray-300"><ArrowLeft size={16} /> Back</button>
      <div className="space-y-4">
        {schools.length === 0 ? <EmptyState title="No schools" message="No active schools found." /> : schools.map((school) => (
          <div key={school.id} className="card p-5">
            <div className="mb-3 flex items-center gap-2"><Building2 size={20} className="text-primary-600" /><h3 className="font-semibold text-gray-900 dark:text-gray-100">{school.name}</h3></div>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{[school.district, school.region].filter(Boolean).join(', ')}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DATA_SHARING_CATEGORIES.map((cat) => {
                const toggle = toggles[school.id]?.find((t) => t.category === cat.key); const enabled = toggle?.is_enabled ?? false; const accessible = hasAccess(cat.key);
                return (
                  <div key={cat.key} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{cat.label.replace('Share ', '').replace(' with District Office', '')}</p>
                    {!enabled ? <p className="mt-1 text-sm text-gray-400"><AlertCircle size={14} className="inline" /> Data sharing not enabled by school</p> : !accessible ? <p className="mt-1 text-sm text-gray-400"><AlertCircle size={14} className="inline" /> Data access not granted by EMIS Officer</p> : <p className="mt-1 text-sm text-green-600"><Eye size={14} className="inline" /> Available</p>}
                  </div>
                );
              })}
            </div>
            {isEmisOrDirector && (<div className="mt-3 flex gap-2"><Button variant="secondary" onClick={() => { void authApi.createExportRequest(school.id, 'Report Card Summary').then(() => { alert('Export request sent to headteacher for approval.'); }).catch((err) => alert(err instanceof Error ? err.message : 'Could not request export.')); }}><Download size={14} /> Request Export</Button></div>)}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
