import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useDispatch, useSelector } from 'react-redux';
import { showSnackbar } from '../features/snackbarSlice';
import {
  getFeedback,
  getFeedbackDetail,
  adminUpdateFeedback,
  deleteFeedback
} from '../services/apiService';

const FeedbackManagementPage = () => {
  const dispatch = useDispatch();
  const userRole = useSelector((state) => state.auth.role);

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ status: '', admin_notes: '' });
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchFeedbacks();
  }, [statusFilter]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await getFeedback(params);

      if (res.status === 200) {
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        setFeedbacks(data);
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error);
      dispatch(showSnackbar({
        message: 'Failed to load feedbacks',
        severity: 'error'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleViewEdit = async (feedbackId) => {
    try {
      const res = await getFeedbackDetail(feedbackId);
      if (res.status === 200) {
        setSelectedFeedback(res.data);
        setEditData({
          status: res.data.status,
          admin_notes: res.data.admin_notes || ''
        });
        setDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch feedback detail:', error);
      dispatch(showSnackbar({
        message: 'Failed to load feedback details',
        severity: 'error'
      }));
    }
  };

  const handleSave = async () => {
    try {
      const res = await adminUpdateFeedback(selectedFeedback.id, editData);

      if (res.status === 200) {
        dispatch(showSnackbar({
          message: 'Feedback updated successfully',
          severity: 'success'
        }));
        setDialogOpen(false);
        fetchFeedbacks();
      }
    } catch (error) {
      console.error('Failed to update feedback:', error);
      dispatch(showSnackbar({
        message: 'Failed to update feedback',
        severity: 'error'
      }));
    }
  };

  const handleDelete = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    try {
      await deleteFeedback(feedbackId);
      dispatch(showSnackbar({
        message: 'Feedback deleted successfully',
        severity: 'success'
      }));
      fetchFeedbacks();
    } catch (error) {
      console.error('Failed to delete feedback:', error);
      dispatch(showSnackbar({
        message: 'Failed to delete feedback',
        severity: 'error'
      }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'info';
      case 'not-fit-to-merge': return 'error';
      case 'fit-to-merge': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const columns = [
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      minWidth: 200
    },
    {
      field: 'user_username',
      headerName: 'User',
      width: 150
    },
    {
      field: 'conversation_title',
      headerName: 'Conversation',
      flex: 1,
      minWidth: 200
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      )
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 150,
      renderCell: (params) => formatDate(params.value)
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleViewEdit(params.row.id)}
          >
            View/Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            Delete
          </Button>
        </Box>
      )
    }
  ];

  // Admin-only check
  if (userRole !== 'admin') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h6" color="error">
          Access Denied: Admin privileges required
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Feedback Management
        </Typography>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filter by Status"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="not-fit-to-merge">Not Fit to Merge</MenuItem>
            <MenuItem value="fit-to-merge">Fit to Merge</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Paper elevation={2} sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={feedbacks}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          disableSelectionOnClick
          getRowId={(row) => row.id}
        />
      </Paper>

      {/* Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Feedback Details
        </DialogTitle>
        <DialogContent>
          {selectedFeedback && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedFeedback.title}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                From: {selectedFeedback.user_username} ({selectedFeedback.user_email})
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Conversation: {selectedFeedback.conversation_title}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Submitted: {formatDate(selectedFeedback.created_at)}
              </Typography>

              <Box sx={{ my: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Feedback Content:
                </Typography>
                <Typography variant="body1">
                  {selectedFeedback.content}
                </Typography>
              </Box>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editData.status}
                  onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="submitted">Submitted</MenuItem>
                  <MenuItem value="not-fit-to-merge">Not Fit to Merge</MenuItem>
                  <MenuItem value="fit-to-merge">Fit to Merge</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Admin Notes"
                value={editData.admin_notes}
                onChange={(e) => setEditData(prev => ({ ...prev, admin_notes: e.target.value }))}
                multiline
                rows={4}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FeedbackManagementPage;
