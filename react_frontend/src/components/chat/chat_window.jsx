import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Paper, TextField, Typography, List, ListItem, ListItemText, Divider,
  Avatar, Fab, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import ChatResultsDialog from './result_dialog';

import {
  createThread,
  addMessage,
  runThread,
  getRunStatus,
  get, // generic GET
  post, // new
} from '../../services/apiService';

const ChatWindow = ({ selectedAssistantID, scenarioName, scenarioRole, selectedActivityId }) => {
  const [threadID, setThreadID] = useState(null);
  const [messages, setMessages] = useState([]); // ALWAYS oldest -> newest
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [resultsRubrics, setResultsRubrics] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState('');

  const recognitionRef = useRef(null);
  const endOfMessagesRef = useRef(null);
  const lastSpokenRef = useRef(null); // remember last spoken assistant message

  // Create a fresh thread on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await createThread(); // POST /api/threads
        if ((res.status === 201 || res.status === 200) && res.data?.thread_id) {
          setThreadID(res.data.thread_id);
        } else {
          console.warn('Failed to create thread', res);
        }
      } catch (err) {
        console.error('Error creating thread:', err);
      }
    })();
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Normalise server messages (ensure ms timestamp; sort oldest -> newest)
  const normalise = (arr) => {
    const toMs = (t) =>
      typeof t === 'number' ? (t > 1e12 ? t : t * 1000) : Date.parse(t || 0);
    return [...arr]
      .map((m) => ({ ...m, created_at: toMs(m.created_at) || Date.now() }))
      .sort((a, b) => a.created_at - b.created_at);
  };

  // Fetch & set messages for the thread
  const refreshMessages = async (tid) => {
    try {
      const res = await get(`/threads/${encodeURIComponent(tid)}/messages`);
      if (Array.isArray(res?.data)) {
        const sorted = normalise(res.data);
        setMessages(sorted);
        return sorted;
      }
    } catch (err) {
      console.error('Failed to refresh messages:', err);
    }
    return [];
  };

  // Speak latest assistant reply, but only once
  const speakLatestAssistant = (arr) => {
    const lastAssistant = [...arr].reverse().find((m) => m.role !== 'user' && m.message);
    if (!lastAssistant) return;

    const key = `${lastAssistant.created_at}|${lastAssistant.message}`;
    if (lastSpokenRef.current === key) return; // already spoken

    lastSpokenRef.current = key;
    try {
      const utter = new window.SpeechSynthesisUtterance(lastAssistant.message);
      utter.lang = 'en-GB';
      window.speechSynthesis.cancel(); // stop any ongoing speech
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('SpeechSynthesis failed:', e);
    }
  };

  // Mic handler
  const handleMicClick = () => {
    setMicError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError('Speech recognition not supported in this browser.');
      alert('Speech recognition not supported in this browser.');
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
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setNewMessage(transcript);
      };
      recognition.onerror = (event) => {
        console.error('Mic error:', event.error);
        setMicError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
      };
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setMicError('Mic could not be started. See console.');
      console.error('Mic: Could not start:', err);
      setIsRecording(false);
    }
  };

  // Send message and run the assistant with full Activity + Scenario context
  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !threadID) return;

    try {
      // Optimistic APPEND at the END (oldest -> newest)
      setMessages((prev) => [
        ...prev,
        { role: 'user', message: text, created_at: Date.now() },
      ]);
      setNewMessage('');
      setIsTyping(true);

      // 1) Add the user message to the OpenAI thread
      await addMessage({ thread_id: threadID, role: 'user', content: text });

      // 2) Start a run with BOTH IDs so the server injects full context
      const runRes = await runThread({
        thread_id: threadID,
        activity_id: selectedActivityId,
        scenario_id: selectedAssistantID,
      });

      const runId = runRes?.data?.run_id;
      if (!runId) {
        console.warn('No run_id returned', runRes);
        setIsTyping(false);
        return;
      }

      // 3) Poll run status until completed, then refresh and speak
      const poll = async () => {
        try {
          const statusRes = await getRunStatus({ run_id: runId, thread_id: threadID });
          const status = statusRes?.data?.status;
          if (status === 'completed') {
            const arr = await refreshMessages(threadID);
            speakLatestAssistant(arr);
            setIsTyping(false);
          } else if (status === 'queued' || status === 'in_progress') {
            setTimeout(poll, 1000);
          } else {
            setIsTyping(false);
          }
        } catch (e) {
          console.error('Status polling error:', e);
          setIsTyping(false);
        }
      };
      poll();
    } catch (err) {
      console.error('Send/run failed:', err);
      setIsTyping(false);
    }
  };

  // Assessment dialog (unchanged API path for now)
const openDialog = async () => {
   try {
     const cleaned = messages.map(({ role, message, created_at }) => ({ role, message, created_at }));
   const idForEndpoint = selectedAssistantID ?? selectedActivityId;

     const rubricsRes = await post(`/scenarios/${idForEndpoint}/rubric_responses`, { messages: cleaned });
     if (rubricsRes.status === 200) {
       setResultsRubrics(rubricsRes.data.evaluations || []);
       setDialogOpen(true);
     }
   } catch (err) {
      console.error('Rubric fetch failed:', err);
   }
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
                <ListItem key={idx}>
                  <Grid container justifyContent={isUser ? 'flex-end' : 'flex-start'}>
                    <Grid item xs={12} sm={isUser ? 6 : 8}>
                      <Box
                        sx={{
                          bgcolor: isUser ? '#E1F5FE' : '#F1F1F1',
                          borderRadius: 2,
                          px: 2,
                          py: 1,
                          textAlign: isUser ? 'right' : 'left',
                        }}
                      >
                        <ListItemText primary={msg.message} secondary={time} />
                      </Box>
                    </Grid>
                  </Grid>
                </ListItem>
              );
            })}
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
                        color: 'grey',
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
                label={micError ? micError : 'Type something or use the mic...'}
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
          <ChatResultsDialog evaluations={resultsRubrics} messages={messages} />
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
