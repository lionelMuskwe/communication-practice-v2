import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Paper, TextField, Typography, List, ListItem, ListItemText, Divider,
  Avatar, Fab, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import ChatResultsDialog from './result_dialog';
import { post } from '../../services/apiService';

const ChatWindow = ({ selectedAssistantID, scenarioName, scenarioRole, selectedActivityId }) => {
  const [threadID, setThreadID] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [resultsRubrics, setResultsRubrics] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState('');
  const recognitionRef = useRef(null);
  const endOfMessagesRef = useRef(null);

  // Create thread on mount
  useEffect(() => {
    const createThread = async () => {
      try {
        const payload = {};
        const res = await post('/create_thread', payload);
        if (res.status === 200 && res.data?.thread_id) {
          setThreadID(res.data.thread_id);
        } else {
          console.warn('Failed to create thread', res);
        }
      } catch (err) {
        console.error('Error creating thread:', err);
      }
    };
    createThread();
  }, []);

  // Scroll to bottom on messages change
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice to text: mic handler
  const handleMicClick = () => {
    setMicError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError('Speech recognition not supported in this browser.');
      alert('Speech recognition not supported in this browser.');
      return;
    }
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-GB';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('Mic: Recording started');
        setIsRecording(true);
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setNewMessage(transcript);
        console.log('Mic: Transcription:', transcript);
      };
      recognition.onerror = (event) => {
        console.error('Mic error:', event.error);
        setMicError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
      };
      recognition.onend = () => {
        console.log('Mic: Recording ended');
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setMicError('Mic could not be started. See console.');
      console.error('Mic: Could not start:', err);
      setIsRecording(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const payload = {
      assistant_id: selectedAssistantID,
      thread_id: threadID,
      role: 'user',
      content: newMessage,
    };

    try {
      setMessages(prev => [
        { role: 'user', message: newMessage, created_at: new Date() },
        ...prev,
      ]);
      setNewMessage('');
      setIsTyping(true);

      await post('/threads/send_message', payload);

      const runRes = await post('/threads/run', {
        assistant_id: selectedAssistantID,
        thread_id: threadID,
      });

      if (runRes.status === 200 && runRes.data?.id) {
        const runId = runRes.data.id;
        const pollStatus = async () => {
          try {
            const statusRes = await post('/threads/check_run_status', {
              thread_id: threadID,
              run_id: runId,
            });
            const status = statusRes.data.status;
            if (status === 'completed') {
              const messagesRes = await post('/threads/get_all_messages', {
                thread_id: threadID,
              });
              setMessages(messagesRes.data);
              setIsTyping(false);

              // Read the assistant reply aloud (text-to-speech)
              const latestMsg = messagesRes.data.find(m => m.role !== 'user');
              if (latestMsg && latestMsg.message) {
                try {
                  const utter = new window.SpeechSynthesisUtterance(latestMsg.message);
                  utter.lang = 'en-GB';
                  window.speechSynthesis.speak(utter);
                } catch (ttsErr) {
                  console.warn('SpeechSynthesis failed:', ttsErr);
                }
              }
            } else if (status === 'queued' || status === 'in_progress') {
              setTimeout(pollStatus, 1000); // Retry in 1 second
            } else {
              setIsTyping(false);
            }
          } catch (err) {
            setIsTyping(false);
          }
        };
        pollStatus();
      }
    } catch (err) {
      setIsTyping(false);
    }
  };

  // Open assessment dialog
  const openDialog = async () => {
    try {
      const payload = { messages };
      const rubricsRes = await post(`/scenarios/${selectedActivityId}/rubric_responses`, payload);
      if (rubricsRes.status === 200) {
        setResultsRubrics(rubricsRes.data.evaluations || []);
        setDialogOpen(true);
      }
    } catch (err) { /* handle error */ }
  };

  return (
    <Box>
      <Grid container component={Paper} sx={{ width: '100%' }}>
        {/* Header */}
        <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar src={`${process.env.PUBLIC_URL}/avatars/${scenarioRole}.webp`}>
              <PersonIcon />
            </Avatar>
            <Typography sx={{ pl: 2 }}>{scenarioName}</Typography>
          </Box>
          <Button onClick={openDialog} variant="contained" sx={{ backgroundColor: '#1976d2', color: 'white' }}>
            GPT Assessment
          </Button>
        </Grid>
        <Divider sx={{ width: '100%' }} />

        {/* Messages */}
        <Grid item xs={12}>
          <List sx={{ height: '60vh', overflowY: 'auto', px: 2 }}>
            {messages.slice().reverse().map((msg, idx) => (
              <ListItem key={idx}>
                <Grid container justifyContent={msg.role === 'user' ? 'flex-end' : 'flex-start'}>
                  <Grid item xs={12} sm={msg.role === 'user' ? 6 : 8}>
                    <Box
                      sx={{
                        bgcolor: msg.role === 'user' ? '#E1F5FE' : '#F1F1F1',
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                        textAlign: msg.role === 'user' ? 'right' : 'left',
                      }}
                    >
                      <ListItemText
                        primary={msg.message}
                        secondary={new Date(msg.created_at).toLocaleTimeString()}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </ListItem>
            ))}
            {isTyping && (
              <ListItem>
                <Grid container justifyContent="flex-start">
                  <Grid item xs={12} sm={8}>
                    <Box
                      sx={{
                        bgcolor: '#F1F1F1',
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                        fontStyle: 'italic',
                        color: 'gray',
                      }}
                    >
                      GPT is typing...
                    </Box>
                  </Grid>
                </Grid>
              </ListItem>
            )}
            <div ref={endOfMessagesRef} />
          </List>
          <Divider />

          {/* Input Box */}
          <Grid container spacing={2} sx={{ p: 2 }} alignItems="center">
            <Grid item xs={10}>
              <TextField
                fullWidth
                label={micError ? micError : "Type something or use the mic..."}
                value={newMessage}
                disabled={!threadID}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                error={!!micError}
                helperText={micError}
              />
            </Grid>
            <Grid item xs={1} align="right">
              <IconButton
                onClick={handleMicClick}
                color={isRecording ? 'secondary' : 'primary'}
                disabled={!threadID}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                <MicIcon />
              </IconButton>
            </Grid>
            <Grid item xs={1} align="right">
              <Fab color="primary" onClick={handleSendMessage} disabled={!threadID}>
                <SendIcon />
              </Fab>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      {/* Assessment Modal */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth>
        <DialogTitle>GPT Assessment</DialogTitle>
        <DialogContent>
          <ChatResultsDialog
            evaluations={resultsRubrics}
            messages={messages}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          <Button onClick={() => window.print()}>Print</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatWindow;
