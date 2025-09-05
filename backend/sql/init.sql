-- CompliancePilot Database Schema
-- PostgreSQL initialization script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'compliance_officer', 'surveillance_analyst', 'operations_head', 'auditor');
CREATE TYPE dataset_type AS ENUM ('orders', 'trades', 'ledger', 'ucc', 'recon_bank', 'recon_dp', 'nbbo');
CREATE TYPE control_category AS ENUM ('segregation', 'ucc', 'margin', 'networth', 'reconciliation', 'dormant');
CREATE TYPE control_frequency AS ENUM ('daily', 'weekly', 'monthly', 'on_demand');
CREATE TYPE control_severity AS ENUM ('high', 'medium', 'low');
CREATE TYPE run_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE detection_type AS ENUM ('wash_trading', 'layering', 'spoofing', 'excessive_otr', 'price_impact', 'front_running', 'momentum_ignition');
CREATE TYPE case_status AS ENUM ('open', 'under_review', 'closed', 'false_positive');
CREATE TYPE case_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE report_type AS ENUM ('exchange', 'board_mis', 'surveillance', 'compliance');
CREATE TYPE report_status AS ENUM ('generating', 'completed', 'failed');
CREATE TYPE output_format AS ENUM ('csv', 'excel', 'pdf', 'xml');
CREATE TYPE exception_type AS ENUM ('segregation_break', 'reconciliation_mismatch', 'capital_adequacy', 'control_failure', 'surveillance_alert');
CREATE TYPE exception_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE exception_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE job_type AS ENUM ('control_run', 'surveillance_scan', 'report_generation', 'data_ingestion');
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed', 'cancelled');

-- Tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Datasets table
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type dataset_type NOT NULL,
    schema JSONB NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    row_count INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID NOT NULL REFERENCES users(id)
);

-- Controls table
CREATE TABLE controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category control_category NOT NULL,
    dataset VARCHAR(255) NOT NULL,
    frequency control_frequency NOT NULL,
    severity control_severity NOT NULL,
    version INTEGER DEFAULT 1,
    yaml_config TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id)
);

-- Control runs table
CREATE TABLE control_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status run_status NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    results JSONB,
    evidence_hash VARCHAR(64),
    error_message TEXT,
    triggered_by UUID NOT NULL REFERENCES users(id)
);

-- Surveillance cases table
CREATE TABLE surveillance_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    detection_type detection_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    status case_status NOT NULL DEFAULT 'open',
    severity case_severity NOT NULL,
    client_id VARCHAR(100),
    symbol VARCHAR(50),
    detection_date TIMESTAMP WITH TIME ZONE NOT NULL,
    narrative TEXT,
    exhibits JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to UUID REFERENCES users(id)
);

-- Report templates table
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type report_type NOT NULL,
    description TEXT,
    template_path VARCHAR(500) NOT NULL,
    output_format output_format NOT NULL,
    parameters JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES report_templates(id),
    name VARCHAR(255) NOT NULL,
    type report_type NOT NULL,
    status report_status NOT NULL DEFAULT 'generating',
    generated_at TIMESTAMP WITH TIME ZONE,
    file_path VARCHAR(500),
    file_hash VARCHAR(64),
    signature TEXT,
    parameters JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id)
);

-- Exceptions table
CREATE TABLE exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type exception_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status exception_status NOT NULL DEFAULT 'open',
    severity exception_severity NOT NULL,
    owner UUID REFERENCES users(id),
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    remediation_notes TEXT,
    attachments JSONB DEFAULT '[]'
);

-- Jobs table for background processing
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type job_type NOT NULL,
    status job_status NOT NULL DEFAULT 'queued',
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parameters JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    result JSONB
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_datasets_tenant_id ON datasets(tenant_id);
CREATE INDEX idx_datasets_type ON datasets(type);
CREATE INDEX idx_controls_tenant_id ON controls(tenant_id);
CREATE INDEX idx_controls_category ON controls(category);
CREATE INDEX idx_control_runs_control_id ON control_runs(control_id);
CREATE INDEX idx_control_runs_tenant_id ON control_runs(tenant_id);
CREATE INDEX idx_control_runs_status ON control_runs(status);
CREATE INDEX idx_surveillance_cases_tenant_id ON surveillance_cases(tenant_id);
CREATE INDEX idx_surveillance_cases_detection_type ON surveillance_cases(detection_type);
CREATE INDEX idx_surveillance_cases_status ON surveillance_cases(status);
CREATE INDEX idx_reports_tenant_id ON reports(tenant_id);
CREATE INDEX idx_reports_template_id ON reports(template_id);
CREATE INDEX idx_exceptions_tenant_id ON exceptions(tenant_id);
CREATE INDEX idx_exceptions_status ON exceptions(status);
CREATE INDEX idx_exceptions_owner ON exceptions(owner);
CREATE INDEX idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_controls_updated_at BEFORE UPDATE ON controls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_surveillance_cases_updated_at BEFORE UPDATE ON surveillance_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exceptions_updated_at BEFORE UPDATE ON exceptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default report templates
INSERT INTO report_templates (name, type, description, template_path, output_format, parameters) VALUES
('Daily Compliance Summary', 'exchange', 'Daily compliance summary report for exchange submission', '/templates/exchange/daily_compliance.csv', 'csv', '[]'),
('Funds Segregation Exceptions', 'exchange', 'Funds segregation exceptions report', '/templates/exchange/segregation_exceptions.csv', 'csv', '[]'),
('Margin Reporting Exceptions', 'exchange', 'Margin reporting sanity exceptions', '/templates/exchange/margin_exceptions.csv', 'csv', '[]'),
('Surveillance Cases Register', 'exchange', 'Surveillance cases register for exchange', '/templates/exchange/surveillance_cases.xlsx', 'excel', '[]'),
('Board MIS Report', 'board_mis', 'Monthly board management information system report', '/templates/board/mis_report.pdf', 'pdf', '[]');

-- Insert sample tenant and admin user for development
INSERT INTO tenants (id, name, config) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Demo Broker', '{"column_mappings": {}, "thresholds": {}, "notification_settings": {"email": ["admin@demobroker.com"]}}');

INSERT INTO users (id, tenant_id, email, password_hash, role, name) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'admin@demobroker.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Demo Admin');
