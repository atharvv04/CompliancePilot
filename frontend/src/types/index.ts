// Frontend types for CompliancePilot

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenant_id: string;
  tenant_name: string;
  created_at: string;
  last_login?: string;
}

export type UserRole = 'admin' | 'compliance_officer' | 'surveillance_analyst' | 'operations_head' | 'auditor';

export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  tenant_name: string;
  role: UserRole;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// Dataset types
export interface Dataset {
  id: string;
  name: string;
  type: DatasetType;
  schema: DatasetSchema;
  row_count: number;
  uploaded_at: string;
  uploaded_by: string;
}

export type DatasetType = 'orders' | 'trades' | 'ledger' | 'ucc' | 'recon_bank' | 'recon_dp' | 'nbbo';

export interface DatasetSchema {
  columns: ColumnDefinition[];
  primary_key: string[];
  indexes: string[];
}

export interface ColumnDefinition {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  description?: string;
}

// Control types
export interface Control {
  id: string;
  title: string;
  description: string;
  category: ControlCategory;
  dataset: string;
  frequency: ControlFrequency;
  severity: ControlSeverity;
  version: number;
  yaml_config: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type ControlCategory = 'segregation' | 'ucc' | 'margin' | 'networth' | 'reconciliation' | 'dormant';
export type ControlFrequency = 'daily' | 'weekly' | 'monthly' | 'on_demand';
export type ControlSeverity = 'high' | 'medium' | 'low';

export interface ControlRun {
  id: string;
  status: RunStatus;
  started_at: string;
  completed_at?: string;
  results?: ControlResults;
  evidence_hash?: string;
  error_message?: string;
  dataset_name: string;
  triggered_by: string;
}

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ControlResults {
  passed: boolean;
  result_count: number;
  evidence_count: number;
  execution_time_ms: number;
  evidence_files: EvidenceFile[];
  summary: string;
}

export interface EvidenceFile {
  name: string;
  path: string;
  hash: string;
  row_count: number;
  description: string;
}

// Surveillance types
export interface SurveillanceCase {
  id: string;
  detection_type: DetectionType;
  title: string;
  status: CaseStatus;
  severity: CaseSeverity;
  client_id: string;
  symbol: string;
  detection_date: string;
  narrative: string;
  exhibits: CaseExhibit[];
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

export type DetectionType = 'wash_trading' | 'layering' | 'spoofing' | 'excessive_otr' | 'price_impact' | 'front_running' | 'momentum_ignition';
export type CaseStatus = 'open' | 'under_review' | 'closed' | 'false_positive';
export type CaseSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface CaseExhibit {
  type: 'timeline' | 'blotter' | 'chart' | 'narrative' | 'data';
  name: string;
  path: string;
  hash: string;
  description: string;
}

// Report types
export interface Report {
  id: string;
  name: string;
  type: ReportType;
  status: ReportStatus;
  generated_at: string;
  file_hash: string;
  signature: string;
  template_name: string;
  created_by: string;
}

export type ReportType = 'exchange' | 'board_mis' | 'surveillance' | 'compliance';
export type ReportStatus = 'generating' | 'completed' | 'failed';

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  output_format: OutputFormat;
  parameters: TemplateParameter[];
}

export type OutputFormat = 'csv' | 'excel' | 'pdf' | 'xml';

export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  required: boolean;
  default_value?: any;
  options?: string[];
  description: string;
}

// Exception types
export interface Exception {
  id: string;
  type: ExceptionType;
  title: string;
  description: string;
  status: ExceptionStatus;
  severity: ExceptionSeverity;
  owner?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  remediation_notes?: string;
  attachments: ExceptionAttachment[];
}

export type ExceptionType = 'segregation_break' | 'reconciliation_mismatch' | 'capital_adequacy' | 'control_failure' | 'surveillance_alert';
export type ExceptionStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ExceptionSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ExceptionAttachment {
  name: string;
  path: string;
  hash: string;
  uploaded_at: string;
}

// Dashboard types
export interface DashboardStats {
  total_controls: number;
  passed_controls: number;
  failed_controls: number;
  pending_controls: number;
  surveillance_cases: number;
  open_exceptions: number;
  recent_reports: number;
}

export interface ControlSummary {
  id: string;
  title: string;
  category: ControlCategory;
  last_run: string;
  status: RunStatus;
  passed: boolean;
  result_count: number;
}

export interface ExceptionSummary {
  id: string;
  title: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  due_date?: string;
  owner?: string;
}

// File upload types
export interface FileUploadResult {
  file_id: string;
  filename: string;
  size: number;
  hash: string;
  path: string;
  uploaded_at: string;
}

// Form types
export interface ControlFormData {
  title: string;
  description: string;
  category: ControlCategory;
  dataset: string;
  frequency: ControlFrequency;
  severity: ControlSeverity;
  yaml_config: string;
}

export interface DatasetUploadData {
  name: string;
  type: DatasetType;
  description?: string;
  file: File;
}

export interface ExceptionFormData {
  type: ExceptionType;
  title: string;
  description: string;
  severity: ExceptionSeverity;
  due_date?: string;
  owner?: string;
}
