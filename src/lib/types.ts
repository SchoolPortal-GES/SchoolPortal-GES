export type ApprovalStatus = 'approved' | 'pending' | 'rejected';

export type UserRole =
  | 'super_admin'
  | 'headteacher'
  | 'assistant_headteacher'
  | 'staff'
  | 'parent'
  | 'emis_officer'
  | 'district_director'
  | 'director_admin'
  | 'director_hr'
  | 'circuit_supervisor'
  | 'district_education_officer';

export type StaffPosition =
  | 'class_teacher'
  | 'subject_teacher'
  | 'teaching_assistant'
  | 'assistant_headteacher'
  | 'other';

export type SyncStatus = 'pending' | 'confirmed';

export interface BaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
  school_id: string | null;
  created_by: string | null;
  sync_status: SyncStatus;
  deleted: boolean;
}

export interface School extends BaseRecord {
  name: string;
  district: string | null;
  region: string | null;
  location: string | null;
  contact_number: string | null;
  logo_url: string | null;
  require_personal_records: boolean;
  auto_generate_admission: boolean;
  is_active: boolean;
  current_academic_year: string | null;
  current_term: number | null;
}

export interface UserSettings {
  theme?: 'green' | 'blue' | 'purple' | 'orange' | 'red';
  mode?: 'light' | 'dark' | 'system';
  fontSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  language?: 'en' | 'tw';
  wallpaper?: string;
}

export interface AppUser extends BaseRecord {
  phone: string;
  full_name: string | null;
  role: UserRole;
  position: StaffPosition | null;
  profile_completed: boolean;
  is_active: boolean;
  must_change_pin: boolean;
  security_question_1: string | null;
  security_answer_1_hash: string | null;
  security_question_2: string | null;
  security_answer_2_hash: string | null;
  avatar_url: string | null;
  settings: UserSettings;
  office_designation: string | null;
  district_id: string | null;
  portfolios: string[] | null;
  official_email: string | null;
  whatsapp_number: string | null;
  approval_status: ApprovalStatus | null;
  approved_by: string | null;
  approved_at: string | null;
}

export interface StaffSecondaryRole extends BaseRecord {
  user_id: string;
  secondary_position: StaffPosition;
}

export interface AuditLog extends BaseRecord {
  action: string;
  admin_name: string | null;
  target_user_id: string | null;
  target_school_id: string | null;
  details: Record<string, unknown>;
}

export interface PinResetRequest extends BaseRecord {
  user_id: string;
  request_type: 'manual_reset' | 'pin_view';
  status: 'pending' | 'approved' | 'fulfilled' | 'revoked' | 'rejected';
  resolved_by: string | null;
  resolved_at: string | null;
  note: string | null;
}

export interface DistrictDataToggle {
  id: string;
  school_id: string;
  category: 'report_card_count' | 'pending_approval_count' | 'academic_performance';
  is_enabled: boolean;
  updated_by: string;
  updated_at: string;
}

export interface ExportRequest {
  id: string;
  school_id: string;
  requester_id: string;
  headteacher_id: string | null;
  document_type: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'declined' | 'expired';
  created_at: string;
  responded_at: string | null;
  expires_at: string;
  requester?: AppUser;
  school?: School;
}

export interface EmisSharingGrant {
  id: string;
  granted_by: string;
  granted_to: string;
  data_category: 'report_card_count' | 'pending_approval_count' | 'academic_performance' | 'staff_data' | 'all';
  is_permanent: boolean;
  expires_at: string | null;
  revoked: boolean;
  revoked_at: string | null;
  created_at: string;
  granted_to_user?: AppUser;
}

export interface DistrictMeeting {
  id: string;
  title: string;
  meeting_date: string;
  duration_minutes: number;
  agenda: string | null;
  meeting_type: 'in_person' | 'virtual' | 'hybrid';
  created_by: string;
  district_id: string | null;
  created_at: string;
  creator?: AppUser;
  participants?: DistrictMeetingParticipant[];
}

export interface DistrictMeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  rsvp_status: 'pending' | 'accepted' | 'declined';
  responded_at: string | null;
  user?: AppUser;
}

export interface DistrictMeetingInvitation {
  id: string;
  meeting_id: string;
  headteacher_id: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  responded_at: string | null;
  created_at: string;
  meeting?: DistrictMeeting;
  inviter?: AppUser;
}

export interface DistrictChatConversation {
  id: string;
  type: 'private' | 'group' | 'meeting';
  name: string | null;
  meeting_id: string | null;
  created_by: string;
  district_id: string | null;
  created_at: string;
  participants?: DistrictChatParticipant[];
  last_message?: DistrictChatMessage;
}

export interface DistrictChatParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  is_admin: boolean;
  joined_at: string;
  user?: AppUser;
}

export interface DistrictChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  read_status: 'sent' | 'delivered' | 'read';
  created_at: string;
  sender?: AppUser;
}

export interface PendingOfficeRegistration {
  id: string;
  registered_by: string;
  full_name: string;
  phone: string;
  role: string;
  portfolios: string[];
  district_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  auto_approved_at: string | null;
}

export interface DataToggleAuditLog {
  id: string;
  school_id: string;
  headteacher_id: string;
  headteacher_name: string | null;
  school_name: string | null;
  category: string;
  old_status: boolean | null;
  new_status: boolean;
  changed_at: string;
}
