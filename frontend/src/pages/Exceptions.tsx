import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Add as AddIcon, Warning as WarningIcon } from '@mui/icons-material';

const Exceptions: React.FC = () => {
  // Mock data - replace with actual API calls
  const exceptions = [
    {
      id: '1',
      title: 'Segregation Break - Client CL001',
      type: 'segregation_break',
      description: 'Client funds mixed with proprietary funds',
      severity: 'high',
      status: 'open',
      dueDate: '2024-01-15',
      owner: 'John Doe',
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      id: '2',
      title: 'Bank Reconciliation Mismatch',
      type: 'reconciliation_mismatch',
      description: 'Bank statement shows different balance than system',
      severity: 'medium',
      status: 'in_progress',
      dueDate: '2024-01-20',
      owner: 'Jane Smith',
      createdAt: '2024-01-12T14:30:00Z',
    },
    {
      id: '3',
      title: 'Capital Adequacy Below Threshold',
      type: 'capital_adequacy',
      description: 'Net worth below minimum required threshold',
      severity: 'critical',
      status: 'open',
      dueDate: '2024-01-10',
      owner: 'Mike Johnson',
      createdAt: '2024-01-08T09:15:00Z',
    },
  ];

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'error';
      case 'in_progress':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Exceptions
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Create Exception
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Total Exceptions
              </Typography>
              <Typography variant="h4" color="primary">
                {exceptions.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Open
              </Typography>
              <Typography variant="h4" color="error">
                {exceptions.filter(e => e.status === 'open').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                In Progress
              </Typography>
              <Typography variant="h4" color="warning.main">
                {exceptions.filter(e => e.status === 'in_progress').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Critical
              </Typography>
              <Typography variant="h4" color="error">
                {exceptions.filter(e => e.severity === 'critical').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Exceptions Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
            All Exceptions
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Exception ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exceptions.map((exception) => (
                  <TableRow key={exception.id}>
                    <TableCell>{exception.id}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {exception.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {exception.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeLabel(exception.type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={exception.severity.toUpperCase()}
                        size="small"
                        color={getSeverityColor(exception.severity) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={exception.status.replace('_', ' ').toUpperCase()}
                        size="small"
                        color={getStatusColor(exception.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      {exception.dueDate ? (
                        <Typography
                          variant="body2"
                          color={new Date(exception.dueDate) < new Date() ? 'error' : 'text.primary'}
                        >
                          {exception.dueDate}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No due date
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{exception.owner || 'Unassigned'}</TableCell>
                    <TableCell>{new Date(exception.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<WarningIcon />}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Exceptions;
