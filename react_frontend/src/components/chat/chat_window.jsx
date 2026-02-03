import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, TextField, Typography, List, ListItem, ListItemText,
  Avatar, Fab, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, CircularProgress, Tooltip, Paper
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ChatResultsDialog from './result_dialog';

import {
  createConversation,
  getConversation,
  streamMessage,
  rubricAssessmentByConversation,
} from '../../services/apiService';
import useAudioQueue from '../../hooks/useAudioQueue';

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
  const recognitionRef = useRef(null);
  const endOfMessagesRef = useRef(null);
  const streamingContentRef = useRef('');
  const textInputRef = useRef(null);
  const shouldAutoSendRef = useRef(false);
  const transcribedTextRef = useRef('');
  const pendingMessageIdRef = useRef(null);

  const {
    isPlaying: isAudioPlaying,
    isLoading: isAudioQueueLoading,
    startPlayback,
    stopPlayback,
    reset: resetAudioQueue,
    playFullMessageAudio,
  } = useAudioQueue(conversationId);

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

  const handleAudioReady = useCallback((messageId, pendingId, totalChunks) => {
    console.log('[TTS] Audio ready:', { messageId, pendingId, totalChunks });

    if (totalChunks && totalChunks > 0 && pendingId) {
      startPlayback(pendingId, totalChunks);
    } else if (messageId) {
      playFullMessageAudio(messageId);
    }
  }, [startPlayback, playFullMessageAudio]);

  const handleAudioChunkReady = useCallback((chunkIndex, pendingId) => {
    console.log('[TTS] Chunk ready:', { chunkIndex, pendingId });
    pendingMessageIdRef.current = pendingId;
  }, []);

  const startRecording = () => {
    if (isRecording || !conversationId || isStreaming) return;

    setMicError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError('Speech recognition not supported.');
      return;
    }

    try {
      // Mark that we should auto-send after transcription
      shouldAutoSendRef.current = true;
      transcribedTextRef.current = '';

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-GB';
      recognition.interimResults = false;
      recognition.continuous = true;

      recognition.onstart = () => setIsRecording(true);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        transcribedTextRef.current = transcript;
        setNewMessage(transcript);
      };

      recognition.onerror = (event) => {
        setMicError(`Speech error: ${event.error}`);
        setIsRecording(false);
        shouldAutoSendRef.current = false;
      };

      recognition.onend = () => {
        setIsRecording(false);

        // After recording ends, if we should auto-send and we have text, send it
        const trimmedText = transcribedTextRef.current.trim();

        // Check if transcription has actual words (not empty or just whitespace)
        if (shouldAutoSendRef.current && trimmedText && trimmedText.length > 0) {
          // Small delay to ensure state is updated
          setTimeout(() => {
            sendMessageWithText(transcribedTextRef.current);
            shouldAutoSendRef.current = false;
            transcribedTextRef.current = '';
          }, 100);
        } else {
          // If empty, just clear everything without sending
          setNewMessage('');
          shouldAutoSendRef.current = false;
          transcribedTextRef.current = '';
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setMicError('Mic failed to start.');
      setIsRecording(false);
      shouldAutoSendRef.current = false;
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    recognitionRef.current?.stop();
  };

  const sendMessageWithText = async (text) => {
    const trimmedText = text.trim();
    if (!trimmedText || !conversationId) return;

    const optimisticMessage = {
      role: 'user',
      content: trimmedText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    setIsStreaming(true);
    setStreamingMessage('');
    streamingContentRef.current = '';
    setUserMessageCount((prev) => prev + 1);

    // Focus the text input after sending
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);

    resetAudioQueue();
    pendingMessageIdRef.current = null;

    streamMessage(
      conversationId,
      trimmedText,
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

        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
      },
      (error) => {
        console.error('Streaming error:', error);
        setIsStreaming(false);
        setStreamingMessage('');
        streamingContentRef.current = '';
        resetAudioQueue();
        alert(`Error: ${error.message}`);

        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
      },
      handleAudioReady,
      handleAudioChunkReady
    );
  };

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !conversationId) return;
    sendMessageWithText(text);
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
    resetAudioQueue();
    if (onConversationEnd) onConversationEnd();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Recording indicator - centered microphone icon */}
      {isRecording && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              backgroundColor: 'rgba(220, 38, 38, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(220, 38, 38, 0.4)',
              animation: 'micPulse 1.5s ease-in-out infinite',
              '@keyframes micPulse': {
                '0%, 100%': {
                  transform: 'scale(1)',
                  boxShadow: '0 8px 32px rgba(220, 38, 38, 0.4)',
                },
                '50%': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 12px 48px rgba(220, 38, 38, 0.6)',
                },
              },
            }}
          >
            <MicIcon sx={{ fontSize: 64, color: 'white' }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: 'white',
              fontWeight: 600,
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              px: 3,
              py: 1,
              borderRadius: 2,
            }}
          >
            Recording...
          </Typography>
        </Box>
      )}

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
            inputRef={textInputRef}
          />
          {isAudioPlaying && (
            <Tooltip title="Stop audio">
              <IconButton
                onClick={stopPlayback}
                color="secondary"
                size="small"
                sx={{
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  },
                }}
              >
                <VolumeUpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Hold to record">
            <span>
              <IconButton
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                color={isRecording ? 'secondary' : 'primary'}
                disabled={!conversationId || isStreaming}
                size="small"
              >
                <MicIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
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
            conversationId={conversationId}
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
    </Box>
  );
};

export default ChatWindow;
