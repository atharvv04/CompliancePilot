import axios from 'axios';
import { DashboardStats, ControlSummary, ExceptionSummary } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    // Mock data for now - replace with actual API call
    return {
      total_controls: 42,
      passed_controls: 38,
      failed_controls: 4,
      pending_controls: 2,
      surveillance_cases: 7,
      open_exceptions: 12,
      recent_reports: 5,
    };
  },

  async getRecentControls(): Promise<ControlSummary[]> {
    // Mock data for now - replace with actual API call
    return [
      {
        id: '1',
        title: 'Client Funds Segregation (T+0)',
        category: 'segregation',
        last_run: '2 hours ago',
        status: 'completed',
        passed: true,
        result_count: 0,
      },
      {
        id: '2',
        title: 'UCC Completeness Check',
        category: 'ucc',
        last_run: '3 hours ago',
        status: 'completed',
        passed: false,
        result_count: 3,
      },
      {
        id: '3',
        title: 'Margin Reporting Sanity',
        category: 'margin',
        last_run: '4 hours ago',
        status: 'running',
        passed: false,
        result_count: 0,
      },
    ];
  },

  async getRecentExceptions(): Promise<ExceptionSummary[]> {
    // Mock data for now - replace with actual API call
    return [
      {
        id: '1',
        title: 'Segregation Break - Client CL001',
        type: 'segregation_break',
        severity: 'high',
        status: 'open',
        due_date: '2024-01-15',
        owner: 'John Doe',
      },
      {
        id: '2',
        title: 'Bank Reconciliation Mismatch',
        type: 'reconciliation_mismatch',
        severity: 'medium',
        status: 'in_progress',
        due_date: '2024-01-20',
        owner: 'Jane Smith',
      },
      {
        id: '3',
        title: 'Capital Adequacy Below Threshold',
        type: 'capital_adequacy',
        severity: 'critical',
        status: 'open',
        due_date: '2024-01-10',
        owner: 'Mike Johnson',
      },
    ];
  },
};
