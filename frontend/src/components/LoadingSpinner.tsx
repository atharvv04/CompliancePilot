import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" color="text.secondary">
        Loading CompliancePilot...
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;
