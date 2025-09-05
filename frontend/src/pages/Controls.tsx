import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, Button } from '@mui/material';
import { Add as AddIcon, PlayArrow as PlayIcon } from '@mui/icons-material';

const Controls: React.FC = () => {
  // Mock data - replace with actual API calls
  const controls = [
    {
      id: '1',
      title: 'Client Funds Segregation (T+0)',
      category: 'segregation',
      status: 'completed',
      passed: true,
      lastRun: '2 hours ago',
      resultCount: 0,
    },
    {
      id: '2',
      title: 'UCC Completeness Check',
      category: 'ucc',
      status: 'completed',
      passed: false,
      lastRun: '3 hours ago',
      resultCount: 3,
    },
    {
      id: '3',
      title: 'Margin Reporting Sanity',
      category: 'margin',
      status: 'running',
      passed: false,
      lastRun: '4 hours ago',
      resultCount: 0,
    },
  ];

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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      segregation: '#1976d2',
      ucc: '#4caf50',
      margin: '#ff9800',
      networth: '#9c27b0',
      reconciliation: '#f44336',
      dormant: '#00bcd4',
    };
    return colors[category] || '#666';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Compliance Controls
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Create Control
        </Button>
      </Box>

      <Grid container spacing={3}>
        {controls.map((control) => (
          <Grid item xs={12} md={6} lg={4} key={control.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                    {control.title}
                  </Typography>
                  <Chip
                    label={control.status}
                    size="small"
                    color={getStatusColor(control.status) as any}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={control.category.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: getCategoryColor(control.category),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Last Run:</strong> {control.lastRun}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Result:</strong> {control.passed ? 'PASSED' : 'FAILED'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  <strong>Violations:</strong> {control.resultCount}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PlayIcon />}
                    disabled={control.status === 'running'}
                  >
                    Run Now
                  </Button>
                  <Button variant="text" size="small">
                    View Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Controls;
