import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../features/snackbarSlice';
import { createFeedback, getConversationDetail } from '../services/apiService';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const FeedbackFormPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const conversationId = searchParams.get('conversation_id');

  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (conversationId) {
      fetchConversation();
    } else {
      setLoading(false);
    }
  }, [conversationId]);

  const fetchConversation = async () => {
    try {
      const res = await getConversationDetail(conversationId);
      if (res.status === 200) {
        setConversation(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      dispatch(showSnackbar({
        message: 'Failed to load conversation details',
        severity: 'error'
      }));
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Feedback content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (!conversationId) {
      dispatch(showSnackbar({
        message: 'No conversation ID provided',
        severity: 'error'
      }));
      return;
    }

    try {
      setSubmitting(true);
      const res = await createFeedback({
        conversation_id: conversationId,
        title: formData.title.trim(),
        content: formData.content.trim()
      });

      if (res.status === 201) {
        dispatch(showSnackbar({
          message: 'Feedback submitted successfully!',
          severity: 'success'
        }));

        // Clear form
        setFormData({ title: '', content: '' });

        // Redirect after delay
        setTimeout(() => {
          navigate('/home/conversations');
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      dispatch(showSnackbar({
        message: error.response?.data?.message || 'Failed to submit feedback',
        severity: 'error'
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));

    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!conversationId) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">
          No conversation ID provided. Please access this page from a conversation.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/home/conversations')}
          sx={{ mt: 2 }}
        >
          Back to Conversations
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/home/conversations')}
        sx={{ mb: 3 }}
      >
        Back to Conversations
      </Button>

      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Submit Feedback
        </Typography>

        {conversation && (
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Conversation:
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {conversation.title}
            </Typography>
          </Box>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Feedback Title"
            value={formData.title}
            onChange={handleChange('title')}
            error={!!errors.title}
            helperText={errors.title}
            sx={{ mb: 3 }}
            required
          />

          <TextField
            fullWidth
            label="Feedback Content"
            value={formData.content}
            onChange={handleChange('content')}
            error={!!errors.content}
            helperText={errors.content}
            multiline
            rows={8}
            sx={{ mb: 3 }}
            required
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/home/conversations')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : 'Submit Feedback'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default FeedbackFormPage;
