// Core domain types for CompliancePilot

export interface Tenant {
  id: string;
  name: string;
  config: TenantConfig;
  created_at: Date;
  updated_at: Date;
}

export interface TenantConfig {
  column_mappings: Record<string, string>;
  thresholds: Record<string, number>;
  notification_settings: NotificationSettings;
}

export interface NotificationSettings {
  email: string[];
  webhook_url?: string;
  slack_channel?: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  name: string;
  created_at: Date;
  last_login?: Date;
  is_active: boolean;
}

export type UserRole = 'admin' | 'compliance_officer' | 'surveillance_analyst' | 'operations_head' | 'auditor';

export interface Dataset {
  id: string;
  tenant_id: string;
  name: string;
  type: DatasetType;
  schema: DatasetSchema;
  file_path: string;
  file_hash: string;
  row_count: number;
  uploaded_at: Date;
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

// Compliance Controls
export interface Control {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  category: ControlCategory;
  dataset: string;
  frequency: ControlFrequency;
  severity: ControlSeverity;
  version: number;
  yaml_config: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export type ControlCategory = 'segregation' | 'ucc' | 'margin' | 'networth' | 'reconciliation' | 'dormant';
export type ControlFrequency = 'daily' | 'weekly' | 'monthly' | 'on_demand';
export type ControlSeverity = 'high' | 'medium' | 'low';

export interface ControlRun {
  id: string;
  control_id: string;
  dataset_id: string;
  tenant_id: string;
  status: RunStatus;
  started_at: Date;
  completed_at?: Date;
  results: ControlResults;
  evidence_hash?: string;
  error_message?: string;
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

// Surveillance
export interface SurveillanceCase {
  id: string;
  tenant_id: string;
  detection_type: DetectionType;
  title: string;
  status: CaseStatus;
  severity: CaseSeverity;
  client_id: string;
  symbol: string;
  detection_date: Date;
  narrative: string;
  exhibits: CaseExhibit[];
  created_at: Date;
  updated_at: Date;
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

export interface DetectionRule {
  id: string;
  title: string;
  detection_type: DetectionType;
  inputs: string[];
  params: Record<string, any>;
  logic: DetectionLogic;
  flag_condition: string;
  case_bundle: CaseBundle;
}

export interface DetectionLogic {
  steps: string[];
  sql_query?: string;
  python_script?: string;
}

export interface CaseBundle {
  exhibits: string[];
  narrative_template: string;
  chart_configs: ChartConfig[];
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'scatter' | 'heatmap';
  title: string;
  data_source: string;
  x_axis: string;
  y_axis: string;
}

// Reports
export interface Report {
  id: string;
  tenant_id: string;
  template_id: string;
  name: string;
  type: ReportType;
  status: ReportStatus;
  generated_at: Date;
  file_path: string;
  file_hash: string;
  signature: string;
  parameters: Record<string, any>;
  created_by: string;
}

export type ReportType = 'exchange' | 'board_mis' | 'surveillance' | 'compliance';
export type ReportStatus = 'generating' | 'completed' | 'failed';

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  template_path: string;
  output_format: OutputFormat;
  parameters: TemplateParameter[];
  is_active: boolean;
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

// Operations Health
export interface Exception {
  id: string;
  tenant_id: string;
  type: ExceptionType;
  title: string;
  description: string;
  status: ExceptionStatus;
  severity: ExceptionSeverity;
  owner?: string;
  due_date?: Date;
  created_at: Date;
  updated_at: Date;
  attachments: ExceptionAttachment[];
  remediation_notes?: string;
}

export type ExceptionType = 'segregation_break' | 'reconciliation_mismatch' | 'capital_adequacy' | 'control_failure' | 'surveillance_alert';
export type ExceptionStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ExceptionSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ExceptionAttachment {
  name: string;
  path: string;
  hash: string;
  uploaded_at: Date;
}

export interface OperationalMetrics {
  tenant_id: string;
  date: Date;
  capital_adequacy: number;
  segregation_breaks: number;
  reconciliation_status: ReconciliationStatus;
  control_pass_rate: number;
  surveillance_cases: number;
  open_exceptions: number;
}

export interface ReconciliationStatus {
  bank: ReconciliationResult;
  dp: ReconciliationResult;
  client_prop: ReconciliationResult;
}

export interface ReconciliationResult {
  status: 'passed' | 'failed' | 'pending';
  expected_amount: number;
  actual_amount: number;
  difference: number;
  last_updated: Date;
}

// API Response types
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

// Authentication
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

// File Upload
export interface FileUploadResult {
  file_id: string;
  filename: string;
  size: number;
  hash: string;
  path: string;
  uploaded_at: Date;
}

// Job Processing
export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  tenant_id: string;
  parameters: Record<string, any>;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  error?: string;
  result?: any;
}

export type JobType = 'control_run' | 'surveillance_scan' | 'report_generation' | 'data_ingestion';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
