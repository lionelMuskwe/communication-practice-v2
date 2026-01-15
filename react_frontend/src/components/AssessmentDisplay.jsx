import React, { useMemo } from 'react';
import {
  Box, Typography, Chip, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, Tooltip, Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GradingIcon from '@mui/icons-material/Grading';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DescriptionIcon from '@mui/icons-material/Description';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { commonStyles } from '../theme/managementTheme';

const AssessmentDisplay = ({ assessment }) => {
  const isV2 = assessment?.version === '2.0';
  const cats = useMemo(() => assessment?.categories || [], [assessment]);
  const templates = useMemo(() => assessment?.templates || [], [assessment]);
  const overall = assessment?.overall || null;

  if (!assessment) {
    return (
      <Paper elevation={0} sx={{ ...commonStyles.paperCard, textAlign: 'center', py: 6 }}>
        <GradingIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>No Assessment Available</Typography>
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
          Complete a conversation and request an assessment to see results here
        </Typography>
      </Paper>
    );
  }

  // Evidence renderer - shared between v1 and v2
  const renderEvidence = (cr) => {
    const idxs = cr?.evidence?.message_indices || [];
    const quotes = cr?.evidence?.quotes || [];
    const hasEvidence = idxs.length > 0;

    return (
      <>
        {hasEvidence ? (
          <Box>
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, display: 'block', mb: 1 }}>
              ✓ Evidence Found
            </Typography>
            <List dense sx={{ bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              {idxs.map((idx, k) => (
                <ListItem key={k} sx={{ borderBottom: k < idxs.length - 1 ? '1px solid #f0f0f0' : 'none', py: 1.5 }}>
                  <ListItemText primary={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Chip label={`#${idx}`} size="small" sx={{ bgcolor: 'primary.light', color: 'white', fontWeight: 600 }} />
                      <Typography variant="body2" sx={{ flex: 1 }}>{quotes[k] || 'No quote available'}</Typography>
                    </Box>
                  } />
                </ListItem>
              ))}
            </List>
          </Box>
        ) : (
          <Box sx={{ bgcolor: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 1, p: 2 }}>
            <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 600 }}>
              ⚠ No supporting message found
            </Typography>
          </Box>
        )}
        {cr.rewrite_if_missing && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 600, display: 'block', mb: 1 }}>
              💡 Suggested Rewrite
            </Typography>
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>"{cr.rewrite_if_missing}"</Typography>
            </Paper>
          </Box>
        )}
      </>
    );
  };

  // Score chip color based on 0-2 scale
  const getScoreColor = (score) => {
    if (score === 2) return 'success';
    if (score === 1) return 'warning';
    return 'default';
  };

  return (
    <Box>
      {/* Overall Score Summary */}
      {overall && (
        <Paper elevation={0} sx={{ ...commonStyles.paperCard, mb: 3, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{
              backgroundColor: overall.passed ? 'success.light' : 'error.light',
              borderRadius: 2, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AssessmentIcon sx={{ color: 'white', fontSize: 32 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Overall Assessment</Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip label={`Score: ${overall.total_score}/${overall.max_score || '?'}`} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                {overall.percentage !== undefined && (
                  <Chip label={`${Math.round(overall.percentage)}%`} color="primary" sx={{ fontWeight: 600 }} />
                )}
                <Chip
                  icon={overall.passed ? <CheckCircleIcon /> : <CancelIcon />}
                  color={overall.passed ? 'success' : 'error'}
                  label={overall.passed ? 'PASSED' : 'FAILED'}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Box>
          </Box>
          {isV2 && assessment.pack && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Pack: <strong>{assessment.pack.name}</strong>
            </Typography>
          )}
        </Paper>
      )}

      {/* V2.0: Templates → Sections → Criteria */}
      {isV2 && templates.length > 0 && templates.map((template) => (
        <Accordion key={template.template_id} defaultExpanded elevation={0}
          sx={{ mb: 2, border: '1px solid #e0e0e0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fafbfc', borderBottom: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
              <DescriptionIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>{template.name}</Typography>
              <Chip label={template.track_type === 'generic_comms' ? 'Generic' : 'Clinical'} size="small" variant="outlined" />
              <Chip label={`${template.template_score}/${template.template_max_score}`} color="primary" sx={{ fontWeight: 600 }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 2 }}>
            {(template.sections || []).map((section) => (
              <Accordion key={section.section_id} defaultExpanded elevation={0}
                sx={{ mb: 1, border: '1px solid #eee', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f9f9f9' }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
                    <Chip label={section.code} size="small" sx={{ bgcolor: 'secondary.light', color: 'white', fontWeight: 700 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>{section.name}</Typography>
                    <Chip label={`${section.score}/${section.max_score}`} size="small" color="primary" variant="outlined" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {(section.criteria || []).map((cr, idx) => (
                    <Paper key={cr.criterion_id} elevation={0}
                      sx={{ ...commonStyles.paperElevated, mb: idx < section.criteria.length - 1 ? 2 : 0, p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>{cr.text}</Typography>
                        <Chip label={`${cr.score}/2`} size="small" color={getScoreColor(cr.score)} sx={{ fontWeight: 600 }} />
                        {cr.is_required && <Chip label="Required" size="small" color="error" variant="outlined" />}
                      </Box>
                      {renderEvidence(cr)}
                    </Paper>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Legacy V1: Categories → Criteria */}
      {!isV2 && cats.length > 0 && cats.map((cat) => (
        <Accordion key={cat.category_id} defaultExpanded elevation={0}
          sx={{ mb: 2, border: '1px solid #e0e0e0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fafbfc', borderBottom: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', width: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, flex: 1, minWidth: '150px' }}>{cat.name}</Typography>
              <Chip label={`Score: ${cat.score}${typeof cat.required_to_pass === 'number' ? ` / ${cat.required_to_pass} required` : ''}`}
                color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
              <Chip icon={cat.passed ? <CheckCircleIcon /> : <CancelIcon />} color={cat.passed ? 'success' : 'error'}
                label={cat.passed ? 'Pass' : 'Fail'} sx={{ fontWeight: 600 }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            {(cat.criteria || []).map((cr, crIndex) => (
              <Paper key={cr.subcategory_id} elevation={0}
                sx={{ ...commonStyles.paperElevated, mb: crIndex < cat.criteria.length - 1 ? 2 : 0, p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1, minWidth: '150px' }}>{cr.name}</Typography>
                  <Chip label={`Score: ${cr.score}`} size="small" color={cr.score > 0 ? 'success' : 'default'} sx={{ fontWeight: 600 }} />
                  <Tooltip title="Model looked only at DOCTOR (student) messages" arrow>
                    <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </Tooltip>
                </Box>
                {renderEvidence(cr)}
              </Paper>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Empty State */}
      {(isV2 ? templates.length === 0 : cats.length === 0) && (
        <Paper elevation={0} sx={{ ...commonStyles.paperCard, textAlign: 'center', py: 6 }}>
          <GradingIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>No Rubric Results</Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>No evaluation criteria available to display</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default AssessmentDisplay;
