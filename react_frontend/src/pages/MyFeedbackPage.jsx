import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../features/snackbarSlice';
import { getFeedback, getFeedbackDetail } from '../services/apiService';
import FeedbackIcon from '@mui/icons-material/Feedback';

const MyFeedbackPage = () => {
  const dispatch = useDispatch();

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await getFeedback();

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

  const handleViewDetail = async (feedbackId) => {
    try {
      const res = await getFeedbackDetail(feedbackId);
      if (res.status === 200) {
        setSelectedFeedback(res.data);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'info';
      case 'not-fit-to-merge': return 'error';
      case 'fit-to-merge': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Feedback
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View your submitted feedback and their status
        </Typography>
      </Box>

      {feedbacks.length === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <FeedbackIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No feedback submitted yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Submit feedback from your conversation history or results page
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {feedbacks.map((feedback) => (
            <Grid item xs={12} sm={6} md={4} key={feedback.id}>
              <Card
                elevation={2}
                sx={{
                  height: '100%',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  }
                }}
              >
                <CardActionArea
                  onClick={() => handleViewDetail(feedback.id)}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom noWrap>
                      {feedback.title}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={feedback.status}
                        color={getStatusColor(feedback.status)}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                      noWrap
                    >
                      Conversation: {feedback.conversation_title}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Submitted: {formatDate(feedback.created_at)}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Detail Dialog */}
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

              <Box sx={{ mb: 2 }}>
                <Chip
                  label={selectedFeedback.status}
                  color={getStatusColor(selectedFeedback.status)}
                  size="small"
                />
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Conversation: {selectedFeedback.conversation_title}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Submitted: {formatDate(selectedFeedback.created_at)}
              </Typography>

              <Box sx={{ my: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Your Feedback:
                </Typography>
                <Typography variant="body1">
                  {selectedFeedback.content}
                </Typography>
              </Box>

              {selectedFeedback.admin_notes && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom color="warning.dark">
                    Admin Notes:
                  </Typography>
                  <Typography variant="body2">
                    {selectedFeedback.admin_notes}
                  </Typography>
                </Box>
              )}

              {selectedFeedback.reviewed_at && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Reviewed by {selectedFeedback.reviewed_by_username} on{' '}
                  {formatDate(selectedFeedback.reviewed_at)}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyFeedbackPage;
