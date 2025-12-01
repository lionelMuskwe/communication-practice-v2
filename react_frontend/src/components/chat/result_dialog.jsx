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
  bgcolor: isUser ? '#E1F5FE' : '#F1F1F1',
  borderRadius: 2,
  px: 2,
  py: 1,
  textAlign: isUser ? 'right' : 'left',
  border: highlight ? '2px solid #1976d2' : '2px solid transparent',
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
    <Box sx={{ p: 0.5 }}>
      {/* Conversation History */}
      <Typography variant="h6" gutterBottom>
        Conversation History
      </Typography>
      <Paper variant="outlined" sx={{ maxHeight: 300, overflowY: 'auto', mb: 3, p: 2 }}>
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
              <ListItem key={i} disableGutters sx={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                <Grid container justifyContent={isUser ? 'flex-end' : 'flex-start'}>
                  <Grid item xs={12} sm={isUser ? 7 : 9}>
                    <Box sx={bubble(isUser, isEvidence)}>
                      <ListItemText
                        primary={msg.message}
                        secondary={time}
                        primaryTypographyProps={isEvidence ? { sx: { fontWeight: 600 } } : undefined}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* Rubric Evaluation */}
      <Typography variant="h6" gutterBottom>
        GPT Rubric Evaluation
      </Typography>

      {overall && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip label={`Overall Score: ${overall.total_score}`} variant="outlined" />
          <Chip
            icon={overall.passed ? <CheckCircleIcon /> : <CancelIcon />}
            color={overall.passed ? 'success' : 'error'}
            label={overall.passed ? 'Pass' : 'Fail'}
            variant="filled"
          />
        </Box>
      )}

      {cats.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No rubric results to display.
        </Typography>
      )}

      {cats.map((cat) => (
        <Accordion key={cat.category_id} defaultExpanded sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ mr: 1, fontWeight: 600 }}>
                {cat.name}
              </Typography>
              <Chip
                label={`Score: ${cat.score}${
                  typeof cat.required_to_pass === 'number' ? ` / req ${cat.required_to_pass}` : ''
                }`}
                size="small"
              />
              <Chip
                icon={cat.passed ? <CheckCircleIcon /> : <CancelIcon />}
                color={cat.passed ? 'success' : 'error'}
                label={cat.passed ? 'Pass' : 'Fail'}
                size="small"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {(cat.criteria || []).map((cr) => {
                const idxs = cr?.evidence?.message_indices || [];
                const quotes = cr?.evidence?.quotes || [];
                const hasEvidence = idxs.length > 0;

                return (
                  <ListItem key={cr.subcategory_id} alignItems="flex-start" sx={{ display: 'block' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 600 }}>{cr.name}</Typography>
                      <Chip label={`Score: ${cr.score}`} size="small" />
                      <Tooltip title="Model looked only at DOCTOR (student) messages">
                        <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                      </Tooltip>
                    </Box>

                    {hasEvidence ? (
                      <Box sx={{ pl: 2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Evidence (message index → quote):
                        </Typography>
                        <List dense sx={{ mt: 0.5 }}>
                          {idxs.map((idx, k) => (
                            <ListItem key={k} sx={{ py: 0 }}>
                              <ListItemText
                                primary={`[#${idx}] ${quotes[k] || ''}`}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    ) : (
                      <Box sx={{ pl: 2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          No supporting message found from the DOCTOR.
                        </Typography>
                      </Box>
                    )}

                    {cr.rewrite_if_missing && (
                      <Box sx={{ pl: 2, mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Suggested rewrite:
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 1, mt: 0.5, bgcolor: '#fff' }}>
                          <Typography variant="body2">{cr.rewrite_if_missing}</Typography>
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
