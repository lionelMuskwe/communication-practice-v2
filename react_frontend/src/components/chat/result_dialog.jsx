// result_dialog.jsx
import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Paper,
  Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const bubble = (isUser, highlight) => ({
  bgcolor: isUser ? '#1976d2' : '#fff',
  color: isUser ? '#fff' : '#000',
  borderRadius: 2,
  px: { xs: 1.5, md: 2 },
  py: { xs: 1, md: 1.5 },
  textAlign: isUser ? 'right' : 'left',
  border: highlight ? '2px solid #ff9800' : '1px solid #e0e0e0',
  boxShadow: highlight ? '0 2px 8px rgba(255, 152, 0, 0.3)' : '0 1px 3px rgba(0,0,0,0.12)',
});

export default function ChatResultsDialog({ assessment, messages }) {
  // New payload fields - memoized to prevent unnecessary re-renders
  const cats = useMemo(() => assessment?.categories || [], [assessment]);
  const overall = assessment?.overall || null;

  // Build a set of message indices (within the last 40) that were cited as evidence
  const evidenceIdxSet = useMemo(() => {
    const s = new Set();
    for (const c of cats) {
      for (const cr of (c.criteria || [])) {
        for (const i of (cr?.evidence?.message_indices || [])) {
          s.add(Number(i));
        }
      }
    }
    return s;
  }, [cats]);

  // Backend indexed only the last 40 messages: [0..n) in that window
  const startIndex = Math.max(0, messages.length - 40);

  return (
    <Box sx={{ p: { xs: 0.5, md: 1 } }}>
      {/* Conversation History */}
      <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' }, fontWeight: 600 }}>
        Conversation History
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          maxHeight: { xs: 400, sm: 500, md: 600 },
          overflowY: 'auto',
          mb: { xs: 2, md: 3 },
          p: { xs: 1, md: 2 },
          bgcolor: '#f5f5f5',
        }}
      >
        <List sx={{ m: 0, p: 0 }}>
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            // evidence indices refer to the trimmed [last 40] window
            const idxInTrim = i - startIndex;
            const isEvidence = idxInTrim >= 0 && evidenceIdxSet.has(idxInTrim) && isUser;
            const time = (() => {
              try { return new Date(msg.created_at).toLocaleTimeString(); }
              catch { return ''; }
            })();

            return (
              <ListItem key={i} disableGutters sx={{ justifyContent: isUser ? 'flex-end' : 'flex-start', px: 0, py: 0.5 }}>
                <Box sx={{ width: '100%', display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                  <Box sx={{ ...bubble(isUser, isEvidence), maxWidth: { xs: '90%', sm: '80%', md: '75%' } }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: { xs: '0.875rem', md: '0.9375rem' },
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        fontWeight: isEvidence ? 600 : 400,
                      }}
                    >
                      {msg.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: { xs: '0.7rem', md: '0.75rem' },
                        color: isUser ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                        mt: 0.5,
                        display: 'block',
                      }}
                    >
                      {time}
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      <Divider sx={{ my: { xs: 2, md: 3 } }} />

      {/* Rubric Evaluation */}
      <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' }, fontWeight: 600 }}>
        GPT Rubric Evaluation
      </Typography>

      {overall && (
        <Box sx={{ mb: { xs: 2, md: 3 }, display: 'flex', gap: { xs: 0.5, md: 1 }, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={`Overall Score: ${overall.total_score}`}
            variant="outlined"
            sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
          />
          <Chip
            icon={overall.passed ? <CheckCircleIcon /> : <CancelIcon />}
            color={overall.passed ? 'success' : 'error'}
            label={overall.passed ? 'Pass' : 'Fail'}
            variant="filled"
            sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
          />
        </Box>
      )}

      {cats.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No rubric results to display.
        </Typography>
      )}

      {cats.map((cat) => (
        <Accordion key={cat.category_id} defaultExpanded sx={{ mb: { xs: 1, md: 1.5 } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 1.5, md: 2 } }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, md: 1 }, alignItems: 'center' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  mr: { xs: 0.5, md: 1 },
                  fontWeight: 600,
                  fontSize: { xs: '0.95rem', md: '1rem' },
                }}
              >
                {cat.name}
              </Typography>
              <Chip
                label={`Score: ${cat.score}${
                  typeof cat.required_to_pass === 'number' ? ` / req ${cat.required_to_pass}` : ''
                }`}
                size="small"
                sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
              />
              <Chip
                icon={cat.passed ? <CheckCircleIcon /> : <CancelIcon />}
                color={cat.passed ? 'success' : 'error'}
                label={cat.passed ? 'Pass' : 'Fail'}
                size="small"
                sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, md: 2 }, py: { xs: 1, md: 2 } }}>
            <List dense>
              {(cat.criteria || []).map((cr) => {
                const idxs = cr?.evidence?.message_indices || [];
                const quotes = cr?.evidence?.quotes || [];
                const hasEvidence = idxs.length > 0;

                return (
                  <ListItem key={cr.subcategory_id} alignItems="flex-start" sx={{ display: 'block', mb: { xs: 1.5, md: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1 }, mb: { xs: 0.5, md: 1 }, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', md: '1rem' } }}>{cr.name}</Typography>
                      <Chip
                        label={`Score: ${cr.score}`}
                        size="small"
                        sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                      />
                      <Tooltip title="Model looked only at DOCTOR (student) messages">
                        <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                      </Tooltip>
                    </Box>

                    {hasEvidence ? (
                      <Box sx={{ pl: { xs: 1, md: 2 }, mt: { xs: 0.5, md: 1 } }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: { xs: '0.75rem', md: '0.8125rem' } }}>
                          Evidence (message index → quote):
                        </Typography>
                        <List dense sx={{ mt: 0.5 }}>
                          {idxs.map((idx, k) => (
                            <ListItem key={k} sx={{ py: 0, px: 0 }}>
                              <ListItemText
                                primary={`[#${idx}] ${quotes[k] || ''}`}
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  sx: { fontSize: { xs: '0.8125rem', md: '0.875rem' } },
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    ) : (
                      <Box sx={{ pl: { xs: 1, md: 2 }, mt: { xs: 0.5, md: 1 } }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: { xs: '0.75rem', md: '0.8125rem' } }}>
                          No supporting message found from the DOCTOR.
                        </Typography>
                      </Box>
                    )}

                    {cr.rewrite_if_missing && (
                      <Box sx={{ pl: { xs: 1, md: 2 }, mt: { xs: 0.5, md: 1 } }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: { xs: '0.75rem', md: '0.8125rem' } }}>
                          Suggested rewrite:
                        </Typography>
                        <Paper variant="outlined" sx={{ p: { xs: 1, md: 1.5 }, mt: 0.5, bgcolor: '#fff' }}>
                          <Typography variant="body2" sx={{ fontSize: { xs: '0.8125rem', md: '0.875rem' } }}>
                            {cr.rewrite_if_missing}
                          </Typography>
                        </Paper>
                      </Box>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
