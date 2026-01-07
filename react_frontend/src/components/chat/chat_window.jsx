import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, TextField, Typography, List, ListItem, ListItemText,
  Avatar, Fab, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, CircularProgress, Tooltip, Paper, Divider
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import ChatResultsDialog from './result_dialog';

import {
  createConversation,
  getConversation,
  streamMessage,
  rubricAssessmentByConversation,
  API_BASE_URL,
} from '../../services/apiService';
import store from '../../store';

import {
  getCurrentConversationId,
  setCurrentConversationId,
  clearCurrentConversationId,
} from '../../utils/storage';

const ChatWindow = ({
  selectedAssistantID,
  scenarioName,
  scenarioRole,
  selectedActivityId,
  onConversationEnd,
}) => {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [resultsRubrics, setResultsRubrics] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState('');
  const [isAssessing, setIsAssessing] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const recognitionRef = useRef(null);
  const endOfMessagesRef = useRef(null);
  const streamingContentRef = useRef('');
  const audioRef = useRef(null);

  useEffect(() => {
    const initializeConversation = async () => {
      const savedId = getCurrentConversationId();

      if (savedId) {
        try {
          const res = await getConversation(savedId);
          if (res.status === 200 && res.data) {
            setConversationId(savedId);
            setMessages(res.data.messages || []);
            setUserMessageCount(res.data.user_message_count || 0);
            return;
          }
        } catch (error) {
          console.error('Failed to restore conversation:', error);
          clearCurrentConversationId();
        }
      }

      if (selectedActivityId && selectedAssistantID) {
        try {
          const res = await createConversation(selectedActivityId, selectedAssistantID);
          if ((res.status === 201 || res.status === 200) && res.data?.id) {
            const newId = res.data.id;
            setConversationId(newId);
            setCurrentConversationId(newId);
            setMessages([]);
            setUserMessageCount(0);
          }
        } catch (err) {
          console.error('Error creating conversation:', err);
        }
      }
    };

    initializeConversation();
  }, [selectedActivityId, selectedAssistantID]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const playMessageAudio = useCallback(async (messageId) => {
    console.log('[TTS] playMessageAudio called with:', { messageId, conversationId });

    if (!messageId || !conversationId) {
      console.warn('[TTS] Missing messageId or conversationId');
      return;
    }

    try {
      setIsAudioLoading(true);

      const state = store.getState();
      const token = state?.auth?.token;

      const url = `${API_BASE_URL}/conversations/${conversationId}/audio/${messageId}/`;
      console.log('[TTS] Fetching audio from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      console.log('[TTS] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TTS] Audio fetch failed:', { status: response.status, error: errorText });
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const audioBlob = await response.blob();
      console.log('[TTS] Audio blob size:', audioBlob.size);

      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('[TTS] Audio URL created:', audioUrl);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        console.log('[TTS] Playing audio...');
        await audioRef.current.play();
        console.log('[TTS] Audio playing!');
      }

    } catch (error) {
      console.error('[TTS] Audio playback error:', error);
      // Silent failure - text is still available
    } finally {
      setIsAudioLoading(false);
    }
  }, [conversationId]);

  const handleMicClick = () => {
    setMicError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError('Speech recognition not supported.');
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-GB';
      recognition.interimResults = false;
      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event) => setNewMessage(event.results[0][0].transcript);
      recognition.onerror = (event) => {
        setMicError(`Speech error: ${event.error}`);
        setIsRecording(false);
      };
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setMicError('Mic failed to start.');
      setIsRecording(false);
    }
  };

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !conversationId) return;

    const optimisticMessage = {
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    setIsStreaming(true);
    setStreamingMessage('');
    streamingContentRef.current = '';
    setUserMessageCount((prev) => prev + 1);

    streamMessage(
      conversationId,
      text,
      (token) => {
        streamingContentRef.current += token;
        setStreamingMessage(streamingContentRef.current);
      },
      () => {
        const finalContent = streamingContentRef.current;
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: finalContent,
          created_at: new Date().toISOString(),
        }]);
        setStreamingMessage('');
        streamingContentRef.current = '';
        setIsStreaming(false);
      },
      (error) => {
        console.error('Streaming error:', error);
        setIsStreaming(false);
        setStreamingMessage('');
        streamingContentRef.current = '';
        alert(`Error: ${error.message}`);
      },
      (messageId) => {
        // Audio ready handler - play OpenAI TTS audio
        console.log('[TTS] Message ID received:', messageId);
        playMessageAudio(messageId);
      }
    );
  };

  const openDialog = async () => {
    if (userMessageCount < 5) {
      alert('Please send at least 5 messages before requesting an assessment.');
      return;
    }
    try {
      setIsAssessing(true);

      // Fetch fresh conversation data to ensure messages are up to date
      const conversationRes = await getConversation(conversationId);
      if (conversationRes.status === 200 && conversationRes.data) {
        setMessages(conversationRes.data.messages || []);
      }

      const res = await rubricAssessmentByConversation({
        conversationId,
        activityId: selectedActivityId,
        scenarioId: selectedAssistantID,
      });
      if (res.status === 200) {
        setResultsRubrics(res.data);
        setDialogOpen(true);
      }
    } catch (err) {
      console.error('Assessment failed:', err);
      alert('Failed to fetch assessment.');
    } finally {
      setIsAssessing(false);
    }
  };

  const handleEndConversation = () => {
    clearCurrentConversationId();
    setConversationId(null);
    setMessages([]);
    setUserMessageCount(0);
    setStreamingMessage('');
    streamingContentRef.current = '';
    if (onConversationEnd) onConversationEnd();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Header with character name */}
      <Paper
        elevation={1}
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: 0,
          borderBottom: '1px solid #ddd',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={`${process.env.PUBLIC_URL}/avatars/${scenarioRole}.webp`}
              sx={{ width: { xs: 36, md: 44 }, height: { xs: 36, md: 44 } }}
            >
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.125rem' }, fontWeight: 600 }}>
                {scenarioName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                {scenarioRole}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Tooltip title={userMessageCount < 5 ? 'Send 5+ messages to assess' : ''}>
              <span>
                <Button
                  onClick={openDialog}
                  variant="contained"
                  disabled={userMessageCount < 5 || isAssessing}
                  size="small"
                  sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                >
                  {isAssessing ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Assessment'}
                </Button>
              </span>
            </Tooltip>
            <Button
              onClick={handleEndConversation}
              variant="outlined"
              color="error"
              size="small"
              sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
            >
              End Chat
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Messages area */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
        <List sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 1, md: 2 } }}>
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const time = (() => {
              try {
                return new Date(msg.created_at).toLocaleTimeString();
              } catch {
                return '';
              }
            })();
            return (
              <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                <Box sx={{ width: '100%', display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                  <Paper
                    elevation={1}
                    sx={{
                      maxWidth: { xs: '85%', sm: '75%', md: '65%' },
                      bgcolor: isUser ? '#1976d2' : '#fff',
                      color: isUser ? '#fff' : '#000',
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                    }}
                  >
                    <ListItemText
                      primary={msg.content}
                      secondary={time}
                      primaryTypographyProps={{
                        sx: { fontSize: { xs: '0.875rem', md: '0.9375rem' }, wordBreak: 'break-word' }
                      }}
                      secondaryTypographyProps={{
                        sx: { fontSize: { xs: '0.7rem', md: '0.75rem' }, color: isUser ? 'rgba(255,255,255,0.7)' : 'text.secondary' }
                      }}
                    />
                  </Paper>
                </Box>
              </ListItem>
            );
          })}
          {isStreaming && (
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                <Paper
                  elevation={1}
                  sx={{
                    maxWidth: { xs: '85%', sm: '75%', md: '65%' },
                    bgcolor: '#fff',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                    {scenarioName} is replying...
                  </Typography>
                  <ListItemText
                    primary={streamingMessage || '...'}
                    primaryTypographyProps={{
                      sx: { fontSize: { xs: '0.875rem', md: '0.9375rem' }, wordBreak: 'break-word' }
                    }}
                  />
                </Paper>
              </Box>
            </ListItem>
          )}
          <div ref={endOfMessagesRef} />
        </List>
      </Box>

      {/* Input area */}
      <Paper elevation={3} sx={{ p: { xs: 1, md: 1.5 }, borderRadius: 0, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            size="small"
            multiline
            maxRows={3}
            placeholder="Type a message..."
            value={newMessage}
            disabled={!conversationId || isStreaming}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            error={!!micError}
            helperText={micError}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: { xs: '0.875rem', md: '1rem' } } }}
          />
          <IconButton
            onClick={handleMicClick}
            color={isRecording ? 'secondary' : 'primary'}
            disabled={!conversationId || isStreaming}
            size="small"
          >
            <MicIcon fontSize="small" />
          </IconButton>
          <Fab
            color="primary"
            onClick={handleSendMessage}
            disabled={!conversationId || isStreaming || !newMessage.trim()}
            size="small"
            sx={{ minWidth: 40, width: 40, height: 40 }}
          >
            <SendIcon fontSize="small" />
          </Fab>
        </Box>
      </Paper>

      {/* Assessment Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xl"
        PaperProps={{
          sx: {
            height: { xs: '100vh', sm: '95vh' },
            maxHeight: { xs: '100vh', sm: '95vh' },
            maxWidth: { xs: '100%', sm: '95vw' },
            m: { xs: 0, sm: 2 },
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <DialogTitle sx={{ p: 3, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Assessment Results
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Detailed evaluation and conversation analysis
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, overflow: 'auto' }}>
          <ChatResultsDialog
            assessment={resultsRubrics}
            evaluations={resultsRubrics?.evaluations || []}
            messages={messages}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid #e0e0e0', gap: 1 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            color="inherit"
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Close
          </Button>
          <Button
            onClick={() => window.print()}
            variant="contained"
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 2px 4px rgba(25, 118, 210, 0.25)',
              '&:hover': {
                boxShadow: '0 4px 8px rgba(25, 118, 210, 0.35)',
              },
            }}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hidden audio player for OpenAI TTS */}
      <audio
        ref={audioRef}
        style={{ display: 'none' }}
        onError={(e) => console.error('Audio playback error:', e)}
      />
    </Box>
  );
};

export default ChatWindow;
