export const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Eastern',
  'Central',
  'Volta',
  'Northern',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
  'Oti',
  'Western North',
  'Savannah',
  'North East',
] as const;

export const CLASS_ORDER = [
  'Creche',
  'Nursery',
  'KG 1',
  'KG 2',
  'Primary 1',
  'Primary 2',
  'Primary 3',
  'Primary 4',
  'Primary 5',
  'Primary 6',
  'JHS 1',
  'JHS 2',
  'JHS 3',
] as const;

export const SECURITY_QUESTION_SUGGESTIONS = [
  'What was the name of your first pet?',
  'What is your mother\'s maiden name?',
  'What was the name of your primary school?',
  'What is your favourite food?',
  'In what town were you born?',
  'What is your father\s middle name?',
];

export const STAFF_POSITION_LABELS: Record<string, string> = {
  class_teacher: 'Class Teacher',
  subject_teacher: 'Subject Teacher',
  teaching_assistant: 'Teaching Assistant',
  assistant_headteacher: 'Assistant Headteacher',
  other: 'Other',
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  headteacher: 'Headteacher',
  assistant_headteacher: 'Assistant Headteacher',
  staff: 'Staff',
  parent: 'Parent',
  emis_officer: 'EMIS Officer',
  district_director: 'District Director (Education)',
  director_admin: 'Director (Administration)',
  director_hr: 'Director (Human Resource)',
  circuit_supervisor: 'Circuit Supervisor',
  district_education_officer: 'District Education Officer',
};

export const OFFICE_ROLE_LABELS: Record<string, string> = {
  emis_officer: 'EMIS Officer — DEO',
  district_director: 'District Director (Education) — DEO',
  director_admin: 'District Director (Administration) — DEO',
  director_hr: 'District Director (Human Resource) — DEO',
  circuit_supervisor: 'Circuit Supervisor — DEO',
  district_education_officer: 'District Education Officer — DEO',
};

export const OFFICE_ROLES = [
  'emis_officer',
  'district_director',
  'director_admin',
  'director_hr',
  'circuit_supervisor',
  'district_education_officer',
] as const;

export const SENIOR_OFFICE_ROLES = ['director_admin', 'director_hr'] as const;

export interface PortfolioDefinition {
  key: string;
  label: string;
}

export interface UnitDefinition {
  id: number;
  name: string;
  shortName: string;
  portfolios: PortfolioDefinition[];
}

export const DISTRICT_OFFICE_UNITS: UnitDefinition[] = [
  {
    id: 1,
    name: 'Human Resource Management and Development',
    shortName: 'Human Resource',
    portfolios: [
      { key: 'personnel_records', label: 'Personnel and Records' },
      { key: 'postings_transfers', label: 'Postings and Transfers' },
      { key: 'staff_development_training', label: 'Staff Development and Training (INSET)' },
      { key: 'ippd_payroll', label: 'IPPD and Payroll' },
      { key: 'welfare_pensions', label: 'Welfare and Pensions' },
    ],
  },
  {
    id: 2,
    name: 'Teaching and Learning (Supervision and Curriculum)',
    shortName: 'Teaching & Learning',
    portfolios: [
      { key: 'siso_circuit_supervisor', label: 'School Improvement Support Officer (SISO / Circuit Supervisor)' },
      { key: 'basic_education_desk', label: 'Basic Education Desk (Early Childhood, Primary, JHS)' },
      { key: 'secondary_tvet_desk', label: 'Secondary and TVET Desk' },
      { key: 'special_education', label: 'Special Education (SPED)' },
      { key: 'examination_unit', label: 'Examination Unit' },
    ],
  },
  {
    id: 3,
    name: 'Finance and Administration',
    shortName: 'Finance & Admin',
    portfolios: [
      { key: 'accounts', label: 'Accounts' },
      { key: 'budget', label: 'Budget' },
      { key: 'supply_chain_procurement', label: 'Supply Chain, Procurement, and Logistics' },
      { key: 'transport', label: 'Transport' },
      { key: 'registry_secretarial', label: 'Registry and Secretarial Services' },
    ],
  },
  {
    id: 4,
    name: 'Planning, Statistics, Monitoring, and Evaluation',
    shortName: 'Planning & Statistics',
    portfolios: [
      { key: 'statistics_emis', label: 'Statistics and EMIS' },
      { key: 'monitoring_evaluation_research', label: 'Monitoring, Evaluation, and Research' },
      { key: 'estate_infrastructure', label: 'Estate and Infrastructure' },
    ],
  },
  {
    id: 5,
    name: 'Specialized Focal Units',
    shortName: 'Focal Units',
    portfolios: [
      { key: 'girl_child_education', label: 'Girl-Child Education' },
      { key: 'shep', label: 'School Health Education Programme (SHEP)' },
      { key: 'guidance_counselling', label: 'Guidance and Counselling' },
      { key: 'pe_sports_culture', label: 'Physical Education, Sports, and Culture' },
      { key: 'stem_coordinator', label: 'STEM Coordinator' },
      { key: 'ict_support', label: 'ICT Support' },
    ],
  },
  {
    id: 6,
    name: 'Independent Oversight Units',
    shortName: 'Oversight',
    portfolios: [
      { key: 'internal_audit', label: 'Internal Audit' },
      { key: 'public_relations', label: 'Public Relations' },
    ],
  },
];

export const ALL_PORTFOLIOS: PortfolioDefinition[] = DISTRICT_OFFICE_UNITS.flatMap((u) => u.portfolios);

export const PORTFOLIO_LABELS: Record<string, string> = Object.fromEntries(
  ALL_PORTFOLIOS.map((p) => [p.key, p.label]),
);

export const PORTFOLIO_TO_UNIT: Record<string, number> = Object.fromEntries(
  DISTRICT_OFFICE_UNITS.flatMap((u) => u.portfolios.map((p) => [p.key, u.id])),
);

export const HR_PORTFOLIOS = ['personnel_records', 'postings_transfers', 'staff_development_training', 'ippd_payroll', 'welfare_pensions'];
export const FINANCE_PORTFOLIOS = ['accounts', 'budget', 'supply_chain_procurement', 'transport'];
export const CURRICULUM_PORTFOLIOS = ['basic_education_desk', 'secondary_tvet_desk', 'special_education', 'examination_unit'];
export const FOCAL_PORTFOLIOS = ['girl_child_education', 'shep', 'guidance_counselling', 'pe_sports_culture', 'stem_coordinator', 'ict_support'];

export const REGISTRAR_ROLES = ['super_admin', 'director_admin', 'director_hr', 'emis_officer'];

export function canRegisterOfficeUsers(role: string, portfolios: string[] = []): boolean {
  if (role === 'super_admin') return true;
  if (role === 'director_admin' || role === 'director_hr' || role === 'emis_officer') return true;
  if (portfolios.includes('registry_secretarial')) return true;
  return false;
}

export function getPortfoliosForUser(portfolios: string[] | null | undefined): string[] {
  if (!portfolios || portfolios.length === 0) return [];
  return portfolios;
}

export function hasPortfolio(user: { portfolios?: string[] | null; role: string }, portfolioKey: string): boolean {
  if (user.portfolios && user.portfolios.includes(portfolioKey)) return true;
  if (portfolioKey === 'statistics_emis' && user.role === 'emis_officer') return true;
  return false;
}

export const DATA_SHARING_CATEGORIES: { key: string; label: string }[] = [
  { key: 'report_card_count', label: 'Share Report Card Count with District Office' },
  { key: 'pending_approval_count', label: 'Share Pending Approval Count with District Office' },
  { key: 'academic_performance', label: 'Share Academic Performance Data with District Office' },
];

export const EMIS_SHARING_CATEGORIES: { key: string; label: string }[] = [
  { key: 'report_card_count', label: 'Report Card Count' },
  { key: 'pending_approval_count', label: 'Pending Approval Count' },
  { key: 'academic_performance', label: 'Academic Performance Data' },
  { key: 'staff_data', label: 'Staff Data (aggregate)' },
  { key: 'all', label: 'All Categories' },
];

export const DEFAULT_SUPER_ADMIN_PHONE = '0000000000';
export const DEFAULT_SUPER_ADMIN_PIN = '0000';
