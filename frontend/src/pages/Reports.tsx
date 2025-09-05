import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Add as AddIcon, Download as DownloadIcon, Description as DescriptionIcon } from '@mui/icons-material';

const Reports: React.FC = () => {
  // Mock data - replace with actual API calls
  const reports = [
    {
      id: '1',
      name: 'Daily Compliance Summary - 2024-01-15',
      type: 'exchange',
      status: 'completed',
      generatedAt: '2024-01-15T16:00:00Z',
      templateName: 'Daily Compliance Summary',
      createdBy: 'John Doe',
      fileHash: 'a1b2c3d4e5f6...',
    },
    {
      id: '2',
      name: 'Funds Segregation Exceptions - 2024-01-15',
      type: 'exchange',
      status: 'completed',
      generatedAt: '2024-01-15T15:30:00Z',
      templateName: 'Funds Segregation Exceptions',
      createdBy: 'Jane Smith',
      fileHash: 'b2c3d4e5f6a1...',
    },
    {
      id: '3',
      name: 'Board MIS Report - January 2024',
      type: 'board_mis',
      status: 'generating',
      generatedAt: '2024-01-15T17:00:00Z',
      templateName: 'Board MIS Report',
      createdBy: 'Mike Johnson',
      fileHash: 'c3d4e5f6a1b2...',
    },
  ];

  const templates = [
    {
      id: '1',
      name: 'Daily Compliance Summary',
      type: 'exchange',
      description: 'Daily compliance summary report for exchange submission',
      outputFormat: 'csv',
    },
    {
      id: '2',
      name: 'Funds Segregation Exceptions',
      type: 'exchange',
      description: 'Funds segregation exceptions report',
      outputFormat: 'csv',
    },
    {
      id: '3',
      name: 'Board MIS Report',
      type: 'board_mis',
      description: 'Monthly board management information system report',
      outputFormat: 'pdf',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'generating':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'exchange':
        return 'primary';
      case 'board_mis':
        return 'secondary';
      case 'surveillance':
        return 'warning';
      case 'compliance':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Reports
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Generate Report
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Total Reports
              </Typography>
              <Typography variant="h4" color="primary">
                {reports.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Completed
              </Typography>
              <Typography variant="h4" color="success.main">
                {reports.filter(r => r.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Generating
              </Typography>
              <Typography variant="h4" color="warning.main">
                {reports.filter(r => r.status === 'generating').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Templates
              </Typography>
              <Typography variant="h4" color="info.main">
                {templates.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Reports Table */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Recent Reports
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Report Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Template</TableCell>
                  <TableCell>Generated At</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>File Hash</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={report.type.toUpperCase()}
                        size="small"
                        color={getTypeColor(report.type) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.status.toUpperCase()}
                        size="small"
                        color={getStatusColor(report.status) as any}
                      />
                    </TableCell>
                    <TableCell>{report.templateName}</TableCell>
                    <TableCell>{new Date(report.generatedAt).toLocaleString()}</TableCell>
                    <TableCell>{report.createdBy}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {report.fileHash}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                        disabled={report.status !== 'completed'}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Available Templates
          </Typography>
          <Grid container spacing={2}>
            {templates.map((template) => (
              <Grid item xs={12} md={6} key={template.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                        {template.name}
                      </Typography>
                      <Chip
                        label={template.outputFormat.toUpperCase()}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {template.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={template.type.replace('_', ' ').toUpperCase()}
                        size="small"
                        color={getTypeColor(template.type) as any}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DescriptionIcon />}
                      >
                        Generate
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reports;
