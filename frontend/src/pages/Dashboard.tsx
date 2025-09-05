import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Description as DescriptionIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { dashboardService } from '../services/dashboardService';
import { ControlSummary, ExceptionSummary } from '../types';

const Dashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery('dashboard-stats', dashboardService.getStats);
  const { data: recentControls, isLoading: controlsLoading } = useQuery('recent-controls', dashboardService.getRecentControls);
  const { data: recentExceptions, isLoading: exceptionsLoading } = useQuery('recent-exceptions', dashboardService.getRecentExceptions);

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ color, mr: 2 }}>
            {icon}
          </Box>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'running':
        return <ScheduleIcon color="primary" />;
      default:
        return <ScheduleIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Controls"
            value={stats?.total_controls || 0}
            icon={<SecurityIcon sx={{ fontSize: 40 }} />}
            color="#1976d2"
            subtitle="Active compliance controls"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Passed Controls"
            value={stats?.passed_controls || 0}
            icon={<CheckCircleIcon sx={{ fontSize: 40 }} />}
            color="#4caf50"
            subtitle="Controls passed today"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Surveillance Cases"
            value={stats?.surveillance_cases || 0}
            icon={<SearchIcon sx={{ fontSize: 40 }} />}
            color="#ff9800"
            subtitle="Active cases"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Open Exceptions"
            value={stats?.open_exceptions || 0}
            icon={<WarningIcon sx={{ fontSize: 40 }} />}
            color="#f44336"
            subtitle="Requiring attention"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Controls */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              Recent Control Runs
            </Typography>
            {controlsLoading ? (
              <LinearProgress />
            ) : (
              <List>
                {recentControls?.map((control: ControlSummary) => (
                  <ListItem key={control.id} divider>
                    <ListItemIcon>
                      {getStatusIcon(control.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={control.title}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Chip
                            label={control.category}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={control.status}
                            size="small"
                            color={getStatusColor(control.status) as any}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {control.last_run}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Recent Exceptions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              Recent Exceptions
            </Typography>
            {exceptionsLoading ? (
              <LinearProgress />
            ) : (
              <List>
                {recentExceptions?.map((exception: ExceptionSummary) => (
                  <ListItem key={exception.id} divider>
                    <ListItemIcon>
                      <WarningIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={exception.title}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Chip
                            label={exception.type.replace('_', ' ')}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={exception.severity}
                            size="small"
                            color={getSeverityColor(exception.severity) as any}
                          />
                          {exception.due_date && (
                            <Typography variant="caption" color="text.secondary">
                              Due: {exception.due_date}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
