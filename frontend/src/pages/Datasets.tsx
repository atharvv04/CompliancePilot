import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Dataset, DatasetType } from '../types';

const Datasets: React.FC = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    name: '',
    type: '' as DatasetType,
    description: '',
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  const queryClient = useQueryClient();

  // Mock data - replace with actual API calls
  const { data: datasets, isLoading } = useQuery('datasets', async () => {
    // Mock datasets
    return [
      {
        id: '1',
        name: 'Daily Orders - 2024-01-15',
        type: 'orders' as DatasetType,
        row_count: 15420,
        uploaded_at: '2024-01-15T10:30:00Z',
        uploaded_by: 'John Doe',
        schema: {
          columns: [
            { name: 'order_id', type: 'string', nullable: false },
            { name: 'client_id', type: 'string', nullable: false },
            { name: 'symbol', type: 'string', nullable: false },
            { name: 'side', type: 'string', nullable: false },
            { name: 'price', type: 'number', nullable: false },
            { name: 'quantity', type: 'number', nullable: false },
          ],
          primary_key: ['order_id'],
          indexes: [],
        },
      },
      {
        id: '2',
        name: 'Daily Trades - 2024-01-15',
        type: 'trades' as DatasetType,
        row_count: 8932,
        uploaded_at: '2024-01-15T10:35:00Z',
        uploaded_by: 'Jane Smith',
        schema: {
          columns: [
            { name: 'trade_id', type: 'string', nullable: false },
            { name: 'order_id', type: 'string', nullable: false },
            { name: 'client_id', type: 'string', nullable: false },
            { name: 'symbol', type: 'string', nullable: false },
            { name: 'side', type: 'string', nullable: false },
            { name: 'price', type: 'number', nullable: false },
            { name: 'quantity', type: 'number', nullable: false },
          ],
          primary_key: ['trade_id'],
          indexes: [],
        },
      },
    ];
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadData(prev => ({
        ...prev,
        name: file.name.split('.')[0],
      }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadData.name || !uploadData.type) {
      return;
    }

    // Mock upload - replace with actual API call
    console.log('Uploading:', { file: selectedFile, data: uploadData });
    
    setUploadDialogOpen(false);
    setSelectedFile(null);
    setUploadData({ name: '', type: '' as DatasetType, description: '' });
    queryClient.invalidateQueries('datasets');
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, dataset: Dataset) => {
    setAnchorEl(event.currentTarget);
    setSelectedDataset(dataset);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDataset(null);
  };

  const handleDownload = () => {
    if (selectedDataset) {
      // Mock download - replace with actual API call
      console.log('Downloading dataset:', selectedDataset.id);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedDataset) {
      // Mock delete - replace with actual API call
      console.log('Deleting dataset:', selectedDataset.id);
      queryClient.invalidateQueries('datasets');
    }
    handleMenuClose();
  };

  const getTypeColor = (type: DatasetType) => {
    const colors: Record<DatasetType, string> = {
      orders: '#1976d2',
      trades: '#4caf50',
      ledger: '#ff9800',
      ucc: '#9c27b0',
      recon_bank: '#f44336',
      recon_dp: '#00bcd4',
      nbbo: '#795548',
    };
    return colors[type] || '#666';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Datasets
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Upload Dataset
        </Button>
      </Box>

      {isLoading ? (
        <Typography>Loading datasets...</Typography>
      ) : (
        <Grid container spacing={3}>
          {datasets?.map((dataset) => (
            <Grid item xs={12} md={6} lg={4} key={dataset.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                      {dataset.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, dataset)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={dataset.type.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: getTypeColor(dataset.type),
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Rows:</strong> {dataset.row_count.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Uploaded by:</strong> {dataset.uploaded_by}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Uploaded:</strong> {new Date(dataset.uploaded_at).toLocaleString()}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Schema:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {dataset.schema.columns.slice(0, 4).map((column) => (
                        <Chip
                          key={column.name}
                          label={column.name}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                      {dataset.schema.columns.length > 4 && (
                        <Chip
                          label={`+${dataset.schema.columns.length - 4} more`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Dataset</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              style={{ marginBottom: 16 }}
            />
            
            {selectedFile && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Selected file: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </Alert>
            )}

            <TextField
              fullWidth
              label="Dataset Name"
              value={uploadData.name}
              onChange={(e) => setUploadData(prev => ({ ...prev, name: e.target.value }))}
              margin="normal"
              required
            />

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Dataset Type</InputLabel>
              <Select
                value={uploadData.type}
                onChange={(e) => setUploadData(prev => ({ ...prev, type: e.target.value as DatasetType }))}
                label="Dataset Type"
              >
                <MenuItem value="orders">Orders</MenuItem>
                <MenuItem value="trades">Trades</MenuItem>
                <MenuItem value="ledger">Ledger</MenuItem>
                <MenuItem value="ucc">UCC</MenuItem>
                <MenuItem value="recon_bank">Bank Reconciliation</MenuItem>
                <MenuItem value="recon_dp">DP Reconciliation</MenuItem>
                <MenuItem value="nbbo">NBBO</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Description (Optional)"
              value={uploadData.description}
              onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || !uploadData.name || !uploadData.type}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDownload}>
          <DownloadIcon sx={{ mr: 1 }} />
          Download
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Datasets;
