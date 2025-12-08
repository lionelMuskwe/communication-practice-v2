import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Avatar,
  List,
  ListItem,
  Paper,
  Divider,
  TextField,
  Tooltip,
  CircularProgress,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonIcon from '@mui/icons-material/Person';
import CheckIcon from '@mui/icons-material/Check';
import { getConversation, updateConversation, deleteConversation } from '../services/apiService';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../features/snackbarSlice';
import jsPDF from 'jspdf';

const ConversationModal = ({ open, onClose, conversationId, onConversationDeleted }) => {
  const dispatch = useDispatch();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open && conversationId) {
      fetchConversation();
    }
  }, [open, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const fetchConversation = async () => {
    try {
      setLoading(true);
      const res = await getConversation(conversationId);
      if (res.status === 200 && res.data) {
        setConversation(res.data);
        setEditedTitle(res.data.title || '');
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      dispatch(showSnackbar({ message: 'Failed to load conversation', severity: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || editedTitle === conversation.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      const res = await updateConversation(conversationId, { title: editedTitle.trim() });
      if (res.status === 200) {
        setConversation({ ...conversation, title: editedTitle.trim() });
        dispatch(showSnackbar({ message: 'Title updated successfully', severity: 'success' }));
        setIsEditingTitle(false);
      }
    } catch (error) {
      console.error('Failed to update title:', error);
      dispatch(showSnackbar({ message: 'Failed to update title', severity: 'error' }));
    }
  };

  const handleDeleteConversation = async () => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      await deleteConversation(conversationId);
      dispatch(showSnackbar({ message: 'Conversation deleted successfully', severity: 'success' }));
      handleCloseMenu();
      onClose();
      if (onConversationDeleted) onConversationDeleted();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      dispatch(showSnackbar({ message: 'Failed to delete conversation', severity: 'error' }));
    }
  };

  const handleCopyToClipboard = () => {
    if (!conversation?.messages) return;

    const text = conversation.messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    navigator.clipboard.writeText(text).then(() => {
      dispatch(showSnackbar({ message: 'Conversation copied to clipboard', severity: 'success' }));
      handleCloseMenu();
    });
  };

  const handleDownloadPDF = () => {
    if (!conversation) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxLineWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(conversation.title || 'Conversation', margin, yPosition);
    yPosition += 10;

    // Metadata
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    const dateStr = new Date(conversation.created_at).toLocaleString('en-GB');
    doc.text(`Date: ${dateStr}`, margin, yPosition);
    yPosition += 6;
    if (conversation.activity) {
      doc.text(`Activity: ${conversation.activity}`, margin, yPosition);
      yPosition += 6;
    }
    if (conversation.scenario) {
      doc.text(`Scenario: ${conversation.scenario}`, margin, yPosition);
      yPosition += 6;
    }
    doc.text(`Messages: ${conversation.user_message_count} user messages`, margin, yPosition);
    yPosition += 12;

    doc.setTextColor(0);
    doc.setDrawColor(200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Messages
    conversation.messages.forEach((msg) => {
      const role = msg.role.toUpperCase();
      const content = msg.content;
      const timestamp = new Date(msg.created_at).toLocaleTimeString('en-GB');

      // Role header
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      const roleText = `${role} (${timestamp})`;
      doc.text(roleText, margin, yPosition);
      yPosition += 6;

      // Message content
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(content, maxLineWidth);

      lines.forEach((line) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });

      yPosition += 6;

      // Check if we need a new page
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    });

    doc.save(`conversation_${conversationId}.pdf`);
    dispatch(showSnackbar({ message: 'PDF downloaded successfully', severity: 'success' }));
    handleCloseMenu();
  };

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-GB', {
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

  const getFilteredMessages = () => {
    if (!conversation?.messages || !searchQuery.trim()) {
      return conversation?.messages || [];
    }

    const query = searchQuery.toLowerCase();
    return conversation.messages.filter((msg) =>
      msg.content.toLowerCase().includes(query)
    );
  };

  const highlightText = (text, query) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} style={{ backgroundColor: '#ffeb3b', padding: '2px 0' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const filteredMessages = getFilteredMessages();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: { xs: '100vh', sm: '90vh' },
          maxHeight: { xs: '100vh', sm: '90vh' },
          m: { xs: 0, sm: 2 },
          borderRadius: { xs: 0, sm: 2 },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #ddd',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
          {conversation?.scenario && (
            <Avatar
              src={`${process.env.PUBLIC_URL}/avatars/${conversation.scenario}.webp`}
              sx={{ width: 40, height: 40 }}
            >
              <PersonIcon />
            </Avatar>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {isEditingTitle ? (
              <TextField
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                autoFocus
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '1rem' } }}
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: { xs: '1rem', md: '1.125rem' },
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {conversation?.title || 'Conversation'}
                </Typography>
                <IconButton size="small" onClick={() => setIsEditingTitle(true)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            {conversation && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                {formatDate(conversation.created_at)} • {conversation.user_message_count} messages
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="More options">
            <IconButton onClick={handleOpenMenu} size="small">
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem onClick={handleDownloadPDF}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Download as PDF
        </MenuItem>
        <MenuItem onClick={handleCopyToClipboard}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
          Copy to Clipboard
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteConversation} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Conversation
        </MenuItem>
      </Menu>

      {/* Search Bar */}
      {conversation?.messages?.length > 0 && (
        <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
          />
          {searchQuery && (
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
              Found {filteredMessages.length} message(s)
            </Typography>
          )}
        </Box>
      )}

      {/* Content */}
      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: '#f5f5f5',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : conversation ? (
          <List sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {filteredMessages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {searchQuery ? 'No messages found matching your search' : 'No messages yet'}
                </Typography>
              </Box>
            ) : (
              filteredMessages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const time = formatDate(msg.created_at);

                return (
                  <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                      <Paper
                        elevation={1}
                        sx={{
                          maxWidth: { xs: '90%', sm: '75%' },
                          bgcolor: isUser ? '#1976d2' : '#fff',
                          color: isUser ? '#fff' : '#000',
                          px: 2,
                          py: 1,
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: { xs: '0.875rem', md: '0.9375rem' },
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {searchQuery ? highlightText(msg.content, searchQuery) : msg.content}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.7rem',
                            color: isUser ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                            mt: 0.5,
                            display: 'block',
                          }}
                        >
                          {time}
                        </Typography>
                      </Paper>
                    </Box>
                  </ListItem>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </List>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No conversation data available
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ p: 2, borderTop: '1px solid #ddd' }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConversationModal;
