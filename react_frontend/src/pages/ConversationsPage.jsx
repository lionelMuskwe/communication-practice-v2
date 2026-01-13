import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ChatIcon from '@mui/icons-material/Chat';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useNavigate } from 'react-router-dom';
import { getConversations } from '../services/apiService';
import { setCurrentConversationId } from '../utils/storage';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../features/snackbarSlice';
import ConversationModal from '../components/ConversationModal';

const ConversationsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    // Filter conversations based on search query
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = conversations.filter(
        (conv) =>
          conv.title?.toLowerCase().includes(query) ||
          conv.activity_title?.toLowerCase().includes(query) ||
          conv.scenario_role?.toLowerCase().includes(query)
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await getConversations({ is_archived: false });
      if (res.status === 200 && res.data) {
        // FIX: Handle paginated response with results key
        let conversationsData = [];
        if (Array.isArray(res.data)) {
          conversationsData = res.data;
        } else if (res.data.results && Array.isArray(res.data.results)) {
          conversationsData = res.data.results;
        }
        setConversations(conversationsData);
        setFilteredConversations(conversationsData);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);

      // Only show error toast if it's not a 401 (auth error)
      // 401 errors are handled silently by the API interceptor
      if (error?.response?.status !== 401) {
        dispatch(
          showSnackbar({
            message: 'Failed to load conversations',
            severity: 'error',
          })
        );
      }

      // FIX: Set empty arrays on error
      setConversations([]);
      setFilteredConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversationId) => {
    setSelectedConversationId(conversationId);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedConversationId(null);
  };

  const handleConversationDeleted = () => {
    // Refresh the conversation list after deletion
    fetchConversations();
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Conversation History
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and resume your past conversations
        </Typography>
      </Box>

      {/* Search Bar */}
      <TextField
        fullWidth
        placeholder="Search conversations..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredConversations.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ChatIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {!searchQuery && 'Start a new conversation to see it here'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredConversations.map((conversation) => (
            <Grid item xs={12} sm={6} md={4} key={conversation.id}>
              <Card
                sx={{
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)',
                    transition: 'all 0.3s',
                  },
                }}
              >
                {/* Gradient Background Overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '120px',
                    background: 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)',
                    zIndex: 0,
                  }}
                />

                <CardActionArea
                  onClick={() => handleConversationClick(conversation.id)}
                  sx={{ height: '100%', position: 'relative', zIndex: 1 }}
                >
                  <CardContent>
                    {/* Assessment Badge */}
                    {conversation.latest_assessment && (
                      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                        <Chip
                          icon={<AssessmentIcon />}
                          label={conversation.latest_assessment.total_score}
                          size="small"
                          color={conversation.latest_assessment.passed ? 'success' : 'error'}
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    )}

                    <Typography variant="h6" gutterBottom noWrap>
                      {conversation.title}
                    </Typography>

                    <Box sx={{ mb: 2, pb: 2 }}>
                      {conversation.activity_title && (
                        <Chip
                          label={conversation.activity_title.substring(0, 30) + '...'}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mb: 1, mr: 1 }}
                        />
                      )}
                      {conversation.scenario_role && (
                        <Chip
                          label={conversation.scenario_role}
                          size="small"
                          color="secondary"
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {conversation.user_message_count} messages
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Last updated: {formatDate(conversation.updated_at)}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Conversation Modal */}
      <ConversationModal
        open={modalOpen}
        onClose={handleCloseModal}
        conversationId={selectedConversationId}
        onConversationDeleted={handleConversationDeleted}
      />
    </Container>
  );
};

export default ConversationsPage;
