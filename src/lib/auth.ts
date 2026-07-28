import { supabase } from './supabase';
import type { AppUser, UserRole, ExportRequest, DistrictDataToggle, EmisSharingGrant, DistrictMeeting, DistrictMeetingInvitation, DataToggleAuditLog, DistrictChatConversation } from './types';

function authEmail(phone: string): string {
  return `${phone.trim()}@schoolportal-ges.local`;
}
function authPassword(pin: string): string {
  return `ges:${pin}`;
}

const AUTH_OPS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-ops`;

async function callAuthOps(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  const res = await fetch(AUTH_OPS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Auth operation failed.');
  return data;
}

export interface LoginResult {
  user: AppUser;
  needsProfile: boolean;
  needsPinChange: boolean;
  role: UserRole;
}

export async function loginWithPhonePin(phone: string, pin: string): Promise<LoginResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail(phone),
    password: authPassword(pin),
  });
  if (error) throw mapAuthError(error);
  const { data: profile, error: pErr } = await supabase.from('users').select('*').eq('id', data.user.id).maybeSingle();
  if (pErr) throw new Error('Could not load your profile. Please try again.');
  if (!profile) throw new Error('Your account record was not found. Please contact support.');
  if (!profile.is_active) { await supabase.auth.signOut(); throw new Error('Your account has been deactivated. Please contact your school administrator.'); }
  return { user: profile as AppUser, needsProfile: !profile.profile_completed, needsPinChange: !!profile.must_change_pin, role: profile.role as UserRole };
}

export async function logout(): Promise<void> { await supabase.auth.signOut(); }

export async function getCurrentProfile(): Promise<AppUser | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) return null;
  const { data, error } = await supabase.from('users').select('*').eq('id', session.session.user.id).maybeSingle();
  if (error || !data) return null;
  return data as AppUser;
}

export interface CompleteProfileInput { fullName: string; phone: string; newPin: string; securityQuestion1: string; securityAnswer1: string; securityQuestion2: string; securityAnswer2: string; }

export async function completeFirstLoginProfile(input: CompleteProfileInput): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) throw new Error('Not authenticated.');
  await callAuthOps({ action: 'complete_profile', user_id: session.session.user.id, phone: input.phone, new_pin: input.newPin, full_name: input.fullName });
  const { error } = await supabase.rpc('complete_first_login_profile', { p_name: input.fullName, p_phone: input.phone, p_new_pin: input.newPin, p_sq1: input.securityQuestion1, p_sa1: input.securityAnswer1, p_sq2: input.securityQuestion2, p_sa2: input.securityAnswer2 });
  if (error) throw new Error(extractRpcMessage(error.message));
}

export async function changeOwnPin(newPin: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) throw new Error('Not authenticated.');
  await callAuthOps({ action: 'update_password', user_id: session.session.user.id, new_pin: newPin });
  const { error } = await supabase.rpc('change_own_pin', { p_new_pin: newPin });
  if (error) throw new Error(extractRpcMessage(error.message));
}

export interface RegisterSchoolInput { name: string; district: string; region: string; location: string; contact: string; logoUrl: string; requirePersonalRecords: boolean; autoGenerateAdmission: boolean; htName: string; htPhone: string; htPin: string; }

export async function registerSchool(input: RegisterSchoolInput): Promise<{ schoolId: string; headteacherId: string }> {
  const { data: authData } = await callAuthOps({ action: 'create_user', phone: input.htPhone, pin: input.htPin, role: 'headteacher', full_name: input.htName });
  const authId = (authData as { id: string }).id;
  const { data, error } = await supabase.rpc('superadmin_register_school', { p_auth_id: authId, p_name: input.name, p_district: input.district, p_region: input.region, p_location: input.location, p_contact: input.contact, p_logo_url: input.logoUrl, p_require_personal_records: input.requirePersonalRecords, p_auto_generate_admission: input.autoGenerateAdmission, p_ht_name: input.htName, p_ht_phone: input.htPhone, p_ht_pin: input.htPin });
  if (error) { await callAuthOps({ action: 'delete_user', user_id: authId }).catch(() => {}); throw new Error(extractRpcMessage(error.message)); }
  const rows = data as { school_id: string; headteacher_id: string }[] | null;
  const row = rows?.[0] ?? null;
  if (!row) throw new Error('Registration failed. Please try again.');
  return { schoolId: row.school_id, headteacherId: row.headteacher_id };
}

export async function setSchoolActive(schoolId: string, active: boolean): Promise<void> { const { error } = await supabase.rpc('set_school_active', { p_school: schoolId, p_active: active }); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function softDeleteSchool(schoolId: string): Promise<void> { const { error } = await supabase.rpc('soft_delete_school', { p_school: schoolId }); if (error) throw new Error(extractRpcMessage(error.message)); }

export interface RegisterStaffInput { name: string; phone: string; pin: string; position: string; schoolId: string; }
export async function registerStaff(input: RegisterStaffInput): Promise<string> {
  const { data: authData } = await callAuthOps({ action: 'create_user', phone: input.phone, pin: input.pin, role: 'staff', full_name: input.name, school_id: input.schoolId });
  const authId = (authData as { id: string }).id;
  const { data, error } = await supabase.rpc('headteacher_register_staff', { p_auth_id: authId, p_name: input.name, p_phone: input.phone, p_pin: input.pin, p_position: input.position, p_school_id: input.schoolId });
  if (error) { await callAuthOps({ action: 'delete_user', user_id: authId }).catch(() => {}); throw new Error(extractRpcMessage(error.message)); }
  return data as string;
}

export async function setUserActive(targetId: string, active: boolean, action: string, note?: string): Promise<void> { const { error } = await supabase.rpc('set_user_active', { p_target: targetId, p_active: active, p_action: action, p_note: note ?? null }); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function softDeleteUser(targetId: string, note?: string): Promise<void> { const { error } = await supabase.rpc('soft_delete_user', { p_target: targetId, p_note: note ?? null }); if (error) throw new Error(extractRpcMessage(error.message)); }

export interface ParentRegisterInput { name: string; phone: string; pin: string; securityQuestion1: string; securityAnswer1: string; securityQuestion2: string; securityAnswer2: string; }
export async function parentSelfRegister(input: ParentRegisterInput): Promise<void> {
  const { data: authData } = await callAuthOps({ action: 'create_user', phone: input.phone, pin: input.pin, role: 'parent', full_name: input.name, is_parent: true });
  const authId = (authData as { id: string }).id;
  const { error } = await supabase.rpc('parent_self_register', { p_auth_id: authId, p_name: input.name, p_phone: input.phone, p_pin: input.pin, p_sq1: input.securityQuestion1, p_sa1: input.securityAnswer1, p_sq2: input.securityQuestion2, p_sa2: input.securityAnswer2 });
  if (error) { await callAuthOps({ action: 'delete_user', user_id: authId }).catch(() => {}); throw new Error(extractRpcMessage(error.message)); }
}

export async function verifySecurityAnswers(phone: string, ans1: string, ans2: string): Promise<void> { const { error } = await supabase.rpc('verify_security_answers', { p_phone: phone, p_ans1: ans1, p_ans2: ans2 }); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function resetPinViaSecurity(phone: string, ans1: string, ans2: string, newPin: string): Promise<void> {
  const { data } = await supabase.from('users').select('id').eq('phone', phone.trim()).eq('deleted', false).maybeSingle();
  if (!data?.id) throw new Error('No account found with that phone number.');
  await callAuthOps({ action: 'update_password', user_id: data.id, new_pin: newPin });
  const { error } = await supabase.rpc('reset_pin_via_security', { p_phone: phone, p_ans1: ans1, p_ans2: ans2, p_new_pin: newPin });
  if (error) throw new Error(extractRpcMessage(error.message));
}
export async function createPinResetRequest(phone: string, type: 'manual_reset' | 'pin_view'): Promise<void> { const { error } = await supabase.rpc('create_pin_reset_request', { p_phone: phone, p_type: type }); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function adminResetPin(targetId: string): Promise<string> { const { data: tempPin, error } = await supabase.rpc('admin_reset_pin', { p_target: targetId }); if (error) throw new Error(extractRpcMessage(error.message)); await callAuthOps({ action: 'update_password', user_id: targetId, new_pin: tempPin as string }); return tempPin as string; }
export async function adminGenerateViewablePin(targetId: string): Promise<string> { const { data: tempPin, error } = await supabase.rpc('admin_generate_viewable_pin', { p_target: targetId }); if (error) throw new Error(extractRpcMessage(error.message)); await callAuthOps({ action: 'update_password', user_id: targetId, new_pin: tempPin as string }); return tempPin as string; }
export async function resolvePinResetRequest(requestId: string, status: 'fulfilled' | 'revoked' | 'rejected'): Promise<void> { const { error } = await supabase.rpc('resolve_pin_reset_request', { p_request: requestId, p_status: status }); if (error) throw new Error(extractRpcMessage(error.message)); }

export interface RegisterOfficeUserInput { name: string; phone: string; pin: string; role: string; officeDesignation: string; districtId: string; }
export async function registerOfficeUser(input: RegisterOfficeUserInput): Promise<string> {
  const { data: authData } = await callAuthOps({ action: 'create_user', phone: input.phone, pin: input.pin, role: input.role, full_name: input.name, office_designation: input.officeDesignation, district_id: input.districtId });
  const authId = (authData as { id: string }).id;
  const { error } = await supabase.from('users').insert({ id: authId, created_by: null, phone: input.phone, full_name: input.name, role: input.role, profile_completed: false, is_active: true, must_change_pin: true, office_designation: input.officeDesignation, district_id: input.districtId, sync_status: 'confirmed', deleted: false });
  if (error) { await callAuthOps({ action: 'delete_user', user_id: authId }).catch(() => {}); throw new Error(extractRpcMessage(error.message)); }
  return authId;
}

export async function getDistrictDataToggles(schoolId: string): Promise<DistrictDataToggle[]> { const { data, error } = await supabase.from('district_data_toggles').select('*').eq('school_id', schoolId); if (error) throw new Error(extractRpcMessage(error.message)); return (data as DistrictDataToggle[]) ?? []; }
export async function toggleDistrictDataSharing(category: string, enabled: boolean): Promise<void> { const { error } = await supabase.rpc('toggle_district_data_sharing', { p_category: category, p_enabled: enabled }); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function getDataToggleAuditLog(): Promise<DataToggleAuditLog[]> { const { data, error } = await supabase.from('data_toggle_audit_log').select('*').order('changed_at', { ascending: false }).limit(100); if (error) throw new Error(extractRpcMessage(error.message)); return (data as DataToggleAuditLog[]) ?? []; }
export async function createExportRequest(schoolId: string, documentType: string, reason?: string): Promise<void> { const { data: htId } = await supabase.rpc('get_school_headteacher', { p_school_id: schoolId }); const { error } = await supabase.from('export_requests').insert({ school_id: schoolId, requester_id: (await supabase.auth.getUser()).data.user?.id, headteacher_id: htId, document_type: documentType, reason: reason ?? null }); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function getExportRequestsForHeadteacher(headteacherId: string): Promise<ExportRequest[]> { const { data, error } = await supabase.from('export_requests').select('*, requester:requester_id(full_name, role, office_designation), school:school_id(name)').eq('headteacher_id', headteacherId).order('created_at', { ascending: false }); if (error) throw new Error(extractRpcMessage(error.message)); return (data as ExportRequest[]) ?? []; }
export async function getExportRequestsForRequester(requesterId: string): Promise<ExportRequest[]> { const { data, error } = await supabase.from('export_requests').select('*, school:school_id(name)').eq('requester_id', requesterId).order('created_at', { ascending: false }); if (error) throw new Error(extractRpcMessage(error.message)); return (data as ExportRequest[]) ?? []; }
export async function respondToExportRequest(requestId: string, approve: boolean): Promise<void> { const { error } = await supabase.rpc('respond_to_export_request', { p_request_id: requestId, p_approve: approve }); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function getEmisSharingGrants(grantedTo?: string): Promise<EmisSharingGrant[]> { let query = supabase.from('emis_sharing_grants').select('*, granted_to_user:granted_to(id, full_name, role, office_designation)'); if (grantedTo) query = query.eq('granted_to', grantedTo); const { data, error } = await query.order('created_at', { ascending: false }); if (error) throw new Error(extractRpcMessage(error.message)); return (data as EmisSharingGrant[]) ?? []; }
export async function createEmisSharingGrant(grantedTo: string, dataCategory: string, isPermanent: boolean, expiresAt?: string): Promise<void> { const { error } = await supabase.from('emis_sharing_grants').insert({ granted_by: (await supabase.auth.getUser()).data.user?.id, granted_to: grantedTo, data_category: dataCategory, is_permanent: isPermanent, expires_at: expiresAt ?? null }); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function revokeEmisSharingGrant(grantId: string): Promise<void> { const { error } = await supabase.from('emis_sharing_grants').update({ revoked: true, revoked_at: new Date().toISOString() }).eq('id', grantId); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function getDistrictMeetings(): Promise<DistrictMeeting[]> { const { data, error } = await supabase.from('district_meetings').select('*, creator:created_by(full_name, role, office_designation)').order('meeting_date', { ascending: true }); if (error) throw new Error(extractRpcMessage(error.message)); return (data as DistrictMeeting[]) ?? []; }
export async function createDistrictMeeting(title: string, meetingDate: string, duration: number, agenda: string, meetingType: string, participantIds: string[]): Promise<string> { const { data, error } = await supabase.rpc('create_district_meeting', { p_title: title, p_meeting_date: meetingDate, p_duration: duration, p_agenda: agenda, p_meeting_type: meetingType, p_participant_ids: participantIds }); if (error) throw new Error(extractRpcMessage(error.message)); return data as string; }
export async function inviteHeadteachersToMeeting(meetingId: string, headteacherIds: string[]): Promise<void> { const { error } = await supabase.rpc('invite_headteachers_to_meeting', { p_meeting_id: meetingId, p_headteacher_ids: headteacherIds }); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function getMeetingInvitationsForHeadteacher(headteacherId: string): Promise<DistrictMeetingInvitation[]> { const { data, error } = await supabase.from('district_meeting_invitations').select('*, meeting:meeting_id(*), inviter:invited_by(full_name, role, office_designation)').eq('headteacher_id', headteacherId).order('created_at', { ascending: false }); if (error) throw new Error(extractRpcMessage(error.message)); return (data as DistrictMeetingInvitation[]) ?? []; }
export async function respondToMeetingInvitation(invitationId: string, accept: boolean): Promise<void> { const { error } = await supabase.rpc('respond_to_meeting_invitation', { p_invitation_id: invitationId, p_accept: accept }); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function respondToMeetingRsvp(meetingId: string, accept: boolean): Promise<void> { const { error } = await supabase.rpc('respond_to_meeting_rsvp', { p_meeting_id: meetingId, p_accept: accept }); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function getDistrictChatConversations(): Promise<DistrictChatConversation[]> { const { data: session } = await supabase.auth.getSession(); const userId = session.session?.user.id; if (!userId) return []; const { data: parts } = await supabase.from('district_chat_participants').select('conversation_id').eq('user_id', userId); if (!parts || parts.length === 0) return []; const ids = parts.map((p) => p.conversation_id); const { data, error } = await supabase.from('district_chat_conversations').select('*').in('id', ids).order('created_at', { ascending: false }); if (error) throw new Error(extractRpcMessage(error.message)); return (data as DistrictChatConversation[]) ?? []; }
export async function getDistrictChatMessages(conversationId: string): Promise<unknown[]> { const { data, error } = await supabase.from('district_chat_messages').select('*, sender:sender_id(full_name, role, office_designation)').eq('conversation_id', conversationId).order('created_at', { ascending: true }); if (error) throw new Error(extractRpcMessage(error.message)); return data ?? []; }
export async function sendDistrictChatMessage(conversationId: string, content: string): Promise<void> { const { error } = await supabase.from('district_chat_messages').insert({ conversation_id: conversationId, sender_id: (await supabase.auth.getUser()).data.user?.id, content }); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function createDistrictGroupChat(name: string, participantIds: string[]): Promise<void> { const userId = (await supabase.auth.getUser()).data.user?.id; const { data: conv } = await supabase.from('district_chat_conversations').insert({ type: 'group', name, created_by: userId }).select().single(); if (!conv) throw new Error('Could not create group chat.'); const allIds = [userId, ...participantIds.filter((id) => id !== userId)]; const inserts = allIds.map((id) => ({ conversation_id: conv.id, user_id: id, is_admin: id === userId })); const { error } = await supabase.from('district_chat_participants').insert(inserts); if (error) throw new Error(extractRpcMessage(error.message)); }
export async function getDistrictOfficeUsers(districtId?: string): Promise<AppUser[]> { let query = supabase.from('users').select('*').in('role', ['emis_officer', 'district_director', 'director_admin', 'director_hr', 'circuit_supervisor', 'district_education_officer']).eq('deleted', false).eq('is_active', true); if (districtId) query = query.eq('district_id', districtId); const { data, error } = await query.order('full_name', { ascending: true }); if (error) throw new Error(extractRpcMessage(error.message)); return (data as AppUser[]) ?? []; }
export async function getHeadteachersInDistrict(districtId?: string): Promise<AppUser[]> { let query = supabase.from('users').select('*').eq('role', 'headteacher').eq('deleted', false).eq('is_active', true); if (districtId) { const { data: schools } = await supabase.from('schools').select('id').eq('district', districtId).eq('deleted', false); if (schools && schools.length > 0) query = query.in('school_id', schools.map((s) => s.id)); } const { data, error } = await query.order('full_name', { ascending: true }); if (error) throw new Error(extractRpcMessage(error.message)); return (data as AppUser[]) ?? []; }

function mapAuthError(error: { message: string }): Error {
  const m = error.message.toLowerCase();
  if (m.includes('invalid login credentials')) return new Error('Incorrect phone number or PIN. Please try again.');
  if (m.includes('too many')) return new Error('Too many failed attempts. Please try again in 30 minutes.');
  if (m.includes('email not confirmed')) return new Error('Your account is not confirmed. Please contact your school administrator.');
  return new Error(error.message || 'Login failed. Please try again.');
}
function extractRpcMessage(msg: string): string { const match = msg.match(/^(?:ERROR:\s*)?([^\n]+)/); return match ? match[1].replace(/^["']|["']$/g, '') : msg; }
