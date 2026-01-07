// result_dialog.jsx
import React, { useMemo, useState } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GradingIcon from '@mui/icons-material/Grading';
import ChatIcon from '@mui/icons-material/Chat';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { commonStyles } from '../../theme/managementTheme';

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

// TabPanel helper component
const TabPanel = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

export default function ChatResultsDialog({ assessment, messages }) {
  const [tabIndex, setTabIndex] = useState(0);

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
    <Box>
      {/* Modern Tabs */}
      <Tabs
        value={tabIndex}
        onChange={(e, newValue) => setTabIndex(newValue)}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        sx={{
          ...commonStyles.modernTabs,
          borderBottom: '2px solid #e0e0e0',
          mb: 0,
        }}
      >
        <Tab
          icon={<GradingIcon />}
          iconPosition="start"
          label="GPT Rubric Evaluation"
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9375rem',
          }}
        />
        <Tab
          icon={<ChatIcon />}
          iconPosition="start"
          label="Conversation History"
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9375rem',
          }}
        />
      </Tabs>

      {/* Tab 1: GPT Rubric Evaluation */}
      <TabPanel value={tabIndex} index={0}>
        {/* Overall Score Summary */}
        {overall && (
          <Paper elevation={0} sx={{ ...commonStyles.paperCard, mb: 3, p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{
                backgroundColor: overall.passed ? 'success.light' : 'error.light',
                borderRadius: 2,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AssessmentIcon sx={{ color: 'white', fontSize: 32 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Overall Assessment
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip
                    label={`Total Score: ${overall.total_score}`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: '0.9375rem' }}
                  />
                  <Chip
                    icon={overall.passed ? <CheckCircleIcon /> : <CancelIcon />}
                    color={overall.passed ? 'success' : 'error'}
                    label={overall.passed ? 'PASSED' : 'FAILED'}
                    sx={{ fontWeight: 600, fontSize: '0.9375rem' }}
                  />
                </Box>
              </Box>
            </Box>
          </Paper>
        )}

        {/* Categories */}
        {cats.length === 0 ? (
          <Paper elevation={0} sx={{ ...commonStyles.paperCard, textAlign: 'center', py: 6 }}>
            <GradingIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
              No Rubric Results
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              No evaluation criteria available to display
            </Typography>
          </Paper>
        ) : (
          cats.map((cat) => (
            <Accordion
              key={cat.category_id}
              defaultExpanded
              elevation={0}
              sx={{
                mb: 2,
                border: '1px solid #e0e0e0',
                borderRadius: '8px !important',
                '&:before': { display: 'none' },
                overflow: 'hidden',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  bgcolor: '#fafbfc',
                  borderBottom: '1px solid #e0e0e0',
                  '&:hover': { bgcolor: '#f5f7fa' },
                }}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', width: '100%' }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      fontSize: '1.125rem',
                      flex: 1,
                      minWidth: '150px',
                    }}
                  >
                    {cat.name}
                  </Typography>
                  <Chip
                    label={`Score: ${cat.score}${
                      typeof cat.required_to_pass === 'number' ? ` / ${cat.required_to_pass} required` : ''
                    }`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    icon={cat.passed ? <CheckCircleIcon /> : <CancelIcon />}
                    color={cat.passed ? 'success' : 'error'}
                    label={cat.passed ? 'Pass' : 'Fail'}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 3 }}>
                {(cat.criteria || []).map((cr, crIndex) => {
                  const idxs = cr?.evidence?.message_indices || [];
                  const quotes = cr?.evidence?.quotes || [];
                  const hasEvidence = idxs.length > 0;

                  return (
                    <Paper
                      key={cr.subcategory_id}
                      elevation={0}
                      sx={{
                        ...commonStyles.paperElevated,
                        mb: crIndex < cat.criteria.length - 1 ? 2 : 0,
                        p: 2.5,
                      }}
                    >
                      {/* Rubric Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1, minWidth: '150px' }}>
                          {cr.name}
                        </Typography>
                        <Chip
                          label={`Score: ${cr.score}`}
                          size="small"
                          color={cr.score > 0 ? 'success' : 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                        <Tooltip title="Model looked only at DOCTOR (student) messages" arrow>
                          <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                        </Tooltip>
                      </Box>

                      {/* Evidence Section */}
                      {hasEvidence ? (
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'success.main',
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                              display: 'block',
                              mb: 1,
                            }}
                          >
                            ✓ Evidence Found
                          </Typography>
                          <List dense sx={{ bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                            {idxs.map((idx, k) => (
                              <ListItem
                                key={k}
                                sx={{
                                  borderBottom: k < idxs.length - 1 ? '1px solid #f0f0f0' : 'none',
                                  py: 1.5,
                                }}
                              >
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                      <Chip
                                        label={`#${idx}`}
                                        size="small"
                                        sx={{
                                          bgcolor: 'primary.light',
                                          color: 'white',
                                          fontWeight: 600,
                                          minWidth: '48px',
                                        }}
                                      />
                                      <Typography variant="body2" sx={{ flex: 1 }}>
                                        {quotes[k] || 'No quote available'}
                                      </Typography>
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      ) : (
                        <Box sx={{ bgcolor: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 1, p: 2 }}>
                          <Typography
                            variant="caption"
                            sx={{ color: 'warning.dark', fontWeight: 600, fontSize: '0.8125rem' }}
                          >
                            ⚠ No supporting message found from the DOCTOR
                          </Typography>
                        </Box>
                      )}

                      {/* Suggested Rewrite */}
                      {cr.rewrite_if_missing && (
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'info.main',
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                              display: 'block',
                              mb: 1,
                            }}
                          >
                            💡 Suggested Rewrite
                          </Typography>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 2,
                              bgcolor: '#e3f2fd',
                              border: '1px solid #90caf9',
                              borderRadius: 1,
                            }}
                          >
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary' }}>
                              "{cr.rewrite_if_missing}"
                            </Typography>
                          </Paper>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </TabPanel>

      {/* Tab 2: Conversation History */}
      <TabPanel value={tabIndex} index={1}>
        <Paper
          elevation={0}
          sx={{
            ...commonStyles.paperCard,
            maxHeight: 600,
            overflowY: 'auto',
            p: 3,
            bgcolor: '#fafbfc',
          }}
        >
          <List sx={{ m: 0, p: 0 }}>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              // evidence indices refer to the trimmed [last 40] window
              const idxInTrim = i - startIndex;
              const isEvidence = idxInTrim >= 0 && evidenceIdxSet.has(idxInTrim) && isUser;
              const time = (() => {
                try {
                  return new Date(msg.created_at).toLocaleTimeString();
                } catch {
                  return '';
                }
              })();

              return (
                <ListItem
                  key={i}
                  disableGutters
                  sx={{ justifyContent: isUser ? 'flex-end' : 'flex-start', px: 0, py: 0.75 }}
                >
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                    <Box sx={{ ...bubble(isUser, isEvidence), maxWidth: '80%' }}>
                      {isEvidence && (
                        <Chip
                          label="Evidence"
                          size="small"
                          sx={{
                            bgcolor: '#ff9800',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: '20px',
                            mb: 1,
                          }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.9375rem',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6,
                        }}
                      >
                        {msg.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.75rem',
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
      </TabPanel>
    </Box>
  );
}
