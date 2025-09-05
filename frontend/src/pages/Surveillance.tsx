import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Search as SearchIcon, Visibility as ViewIcon } from '@mui/icons-material';

const Surveillance: React.FC = () => {
  // Mock data - replace with actual API calls
  const cases = [
    {
      id: '1',
      title: 'Layering Detection - Client CL001',
      detectionType: 'layering',
      status: 'open',
      severity: 'high',
      clientId: 'CL001',
      symbol: 'RELIANCE',
      detectionDate: '2024-01-15T14:30:00Z',
      assignedTo: 'John Doe',
    },
    {
      id: '2',
      title: 'Wash Trading Pattern - Client CL002',
      detectionType: 'wash_trading',
      status: 'under_review',
      severity: 'critical',
      clientId: 'CL002',
      symbol: 'TCS',
      detectionDate: '2024-01-15T13:45:00Z',
      assignedTo: 'Jane Smith',
    },
    {
      id: '3',
      title: 'Excessive OTR - Client CL003',
      detectionType: 'excessive_otr',
      status: 'closed',
      severity: 'medium',
      clientId: 'CL003',
      symbol: 'INFY',
      detectionDate: '2024-01-15T12:15:00Z',
      assignedTo: 'Mike Johnson',
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
      case 'under_review':
        return 'warning';
      case 'closed':
        return 'success';
      case 'false_positive':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Surveillance Cases
        </Typography>
        <Button variant="contained" startIcon={<SearchIcon />}>
          Run Surveillance Scan
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Total Cases
              </Typography>
              <Typography variant="h4" color="primary">
                {cases.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Open Cases
              </Typography>
              <Typography variant="h4" color="error">
                {cases.filter(c => c.status === 'open').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Under Review
              </Typography>
              <Typography variant="h4" color="warning.main">
                {cases.filter(c => c.status === 'under_review').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Closed Cases
              </Typography>
              <Typography variant="h4" color="success.main">
                {cases.filter(c => c.status === 'closed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cases Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Recent Cases
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Case ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Detection Type</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Client ID</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Detection Date</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell>{caseItem.id}</TableCell>
                    <TableCell>{caseItem.title}</TableCell>
                    <TableCell>
                      <Chip
                        label={caseItem.detectionType.replace('_', ' ').toUpperCase()}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={caseItem.severity}
                        size="small"
                        color={getSeverityColor(caseItem.severity) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={caseItem.status.replace('_', ' ').toUpperCase()}
                        size="small"
                        color={getStatusColor(caseItem.status) as any}
                      />
                    </TableCell>
                    <TableCell>{caseItem.clientId}</TableCell>
                    <TableCell>{caseItem.symbol}</TableCell>
                    <TableCell>{new Date(caseItem.detectionDate).toLocaleString()}</TableCell>
                    <TableCell>{caseItem.assignedTo}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ViewIcon />}
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

export default Surveillance;
