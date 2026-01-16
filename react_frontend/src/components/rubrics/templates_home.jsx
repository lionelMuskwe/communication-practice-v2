import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Paper, Chip, Tooltip, Grid, Select, MenuItem,
  FormControl, InputLabel, OutlinedInput, Checkbox, ListItemText, Accordion,
  AccordionSummary, AccordionDetails,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PublishIcon from '@mui/icons-material/Publish';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DescriptionIcon from '@mui/icons-material/Description';
import RuleIcon from '@mui/icons-material/Rule';
import {
  getTemplates, createTemplate, updateTemplate, deleteTemplate, publishTemplate,
  getFrameworks, getFrameworkSections, getSectionCriteria,
  addTemplateCriterion, removeTemplateCriterion,
} from '../../services/apiService';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../../features/snackbarSlice';
import { commonStyles } from '../../theme/managementTheme';

const TRACK_TYPES = [
  { value: 'generic_comms', label: 'Generic Communication' },
  { value: 'clinical_content', label: 'Clinical Content' },
];

const STATUS_COLORS = { draft: 'warning', published: 'success', archived: 'default' };

const TemplatesHome = () => {
  const [templates, setTemplates] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCriteriaDialog, setOpenCriteriaDialog] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [form, setForm] = useState({
    id: null, display_label: '', internal_code: '', description: '',
    framework_id: '', track_type: 'generic_comms',
  });
  const [availableCriteria, setAvailableCriteria] = useState([]);
  const [selectedCriteriaIds, setSelectedCriteriaIds] = useState([]);
  const dispatch = useDispatch();

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await getTemplates();
      setTemplates(response.data?.results || response.data || []);
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to load templates', severity: 'error' }));
    }
  }, [dispatch]);

  const fetchFrameworks = useCallback(async () => {
    try {
      const response = await getFrameworks();
      setFrameworks(response.data?.results || response.data || []);
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to load frameworks', severity: 'error' }));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchTemplates();
    fetchFrameworks();
  }, [fetchTemplates, fetchFrameworks]);

  const handleOpenDialog = (template = null) => {
    if (template) {
      setForm({
        id: template.id,
        display_label: template.display_label,
        internal_code: template.internal_code,
        description: template.description || '',
        framework_id: template.framework?.id || '',
        track_type: template.track_type,
      });
    } else {
      setForm({
        id: null, display_label: '', internal_code: '', description: '',
        framework_id: '', track_type: 'generic_comms',
      });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (form.id) {
        await updateTemplate(form.id, form);
      } else {
        await createTemplate(form);
      }
      setOpenDialog(false);
      fetchTemplates();
      dispatch(showSnackbar({ message: 'Template saved', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to save template', severity: 'error' }));
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTemplate(id);
      fetchTemplates();
      dispatch(showSnackbar({ message: 'Template deleted', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to delete template', severity: 'error' }));
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishTemplate(id);
      fetchTemplates();
      dispatch(showSnackbar({ message: 'Template published', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: error.response?.data?.error || 'Failed to publish', severity: 'error' }));
    }
  };

  const handleOpenCriteriaDialog = async (template) => {
    setCurrentTemplate(template);
    setSelectedCriteriaIds((template.criteria || []).map(c => c.criterion_id || c.id));

    if (template.framework?.id) {
      try {
        const sectionsRes = await getFrameworkSections(template.framework.id);
        const sections = sectionsRes.data;
        const allCriteria = [];
        for (const section of sections) {
          const criteriaRes = await getSectionCriteria(section.id);
          allCriteria.push({ ...section, criteria: criteriaRes.data });
        }
        setAvailableCriteria(allCriteria);
      } catch (error) {
        dispatch(showSnackbar({ message: 'Failed to load criteria', severity: 'error' }));
      }
    }
    setOpenCriteriaDialog(true);
  };

  const handleToggleCriterion = (criterionId) => {
    setSelectedCriteriaIds(prev =>
      prev.includes(criterionId)
        ? prev.filter(id => id !== criterionId)
        : [...prev, criterionId]
    );
  };

  const handleSaveCriteria = async () => {
    try {
      const currentIds = (currentTemplate.criteria || []).map(c => c.criterion_id || c.id);
      const toAdd = selectedCriteriaIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !selectedCriteriaIds.includes(id));

      for (const id of toAdd) {
        await addTemplateCriterion(currentTemplate.id, { criterion_id: id });
      }
      for (const id of toRemove) {
        await removeTemplateCriterion(currentTemplate.id, id);
      }

      setOpenCriteriaDialog(false);
      fetchTemplates();
      dispatch(showSnackbar({ message: 'Criteria updated', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to update criteria', severity: 'error' }));
    }
  };

  return (
    <Box sx={{ ...commonStyles.pageContainer, minHeight: 'auto' }}>
      <Box sx={commonStyles.pageHeader}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            Rubric Templates
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Create templates by selecting criteria from frameworks
          </Typography>
        </Box>
        <Button variant="contained" color="primary" onClick={() => handleOpenDialog()}
          startIcon={<AddIcon />} sx={commonStyles.primaryButton}>
          Add Template
        </Button>
      </Box>

      <Grid container spacing={3}>
        {(templates || []).map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Paper elevation={0} sx={{ ...commonStyles.paperCard, height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #d0d0d0' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ backgroundColor: 'primary.light', borderRadius: 2, p: 1, mr: 2 }}>
                  <DescriptionIcon sx={{ color: 'white' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{template.display_label}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {template.internal_code}
                  </Typography>
                </Box>
                <Chip label={template.status} size="small" color={STATUS_COLORS[template.status]} />
              </Box>

              <Box sx={{ flex: 1, mb: 2 }}>
                <Paper elevation={0} sx={{ ...commonStyles.paperElevated, p: 1.5, mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Framework:</Typography>
                  <Typography variant="body2">{template.framework?.name || 'None'}</Typography>
                </Paper>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label={template.track_type === 'generic_comms' ? 'Generic' : 'Clinical'} size="small" variant="outlined" />
                  <Chip label={`${template.criteria_count || 0} criteria`} size="small" variant="outlined" />
                </Box>
              </Box>

              <Box sx={{ ...commonStyles.actionButtons, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                <Tooltip title="Edit"><IconButton onClick={() => handleOpenDialog(template)} size="small"><EditIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Manage Criteria"><IconButton onClick={() => handleOpenCriteriaDialog(template)} color="secondary" size="small"><RuleIcon fontSize="small" /></IconButton></Tooltip>
                {template.status === 'draft' && (
                  <Tooltip title="Publish"><IconButton onClick={() => handlePublish(template.id)} color="success" size="small"><PublishIcon fontSize="small" /></IconButton></Tooltip>
                )}
                <Tooltip title="Delete"><IconButton onClick={() => handleDelete(template.id)} color="error" size="small"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {templates.length === 0 && (
        <Paper elevation={0} sx={{ ...commonStyles.paperCard, textAlign: 'center', py: 8 }}>
          <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>No Templates Yet</Typography>
          <Button variant="contained" onClick={() => handleOpenDialog()} startIcon={<AddIcon />}>Add Template</Button>
        </Paper>
      )}

      {/* Template Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? 'Edit Template' : 'Add Template'}</DialogTitle>
        <DialogContent>
          <TextField label="Display Label" fullWidth value={form.display_label}
            onChange={(e) => setForm({ ...form, display_label: e.target.value })}
            sx={{ mt: 2, mb: 2 }} />
          <TextField label="Internal Code" fullWidth value={form.internal_code}
            onChange={(e) => setForm({ ...form, internal_code: e.target.value })} sx={{ mb: 2 }} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Framework</InputLabel>
            <Select value={form.framework_id} onChange={(e) => setForm({ ...form, framework_id: e.target.value })}
              input={<OutlinedInput label="Framework" />}>
              {(frameworks || []).map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Track Type</InputLabel>
            <Select value={form.track_type} onChange={(e) => setForm({ ...form, track_type: e.target.value })}
              input={<OutlinedInput label="Track Type" />}>
              {TRACK_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Description" fullWidth multiline rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>{form.id ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* Criteria Selection Dialog */}
      <Dialog open={openCriteriaDialog} onClose={() => setOpenCriteriaDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>Select Criteria for {currentTemplate?.display_label}</DialogTitle>
        <DialogContent>
          {availableCriteria.map(section => (
            <Accordion key={section.id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 600 }}>{section.code} - {section.name}</Typography>
                <Chip label={`${(section.criteria || []).filter(c => selectedCriteriaIds.includes(c.id)).length}/${(section.criteria || []).length}`} size="small" sx={{ ml: 2 }} />
              </AccordionSummary>
              <AccordionDetails>
                {(section.criteria || []).map(criterion => (
                  <Box key={criterion.id} sx={{ display: 'flex', alignItems: 'center', py: 1, borderBottom: '1px solid #eee' }}>
                    <Checkbox checked={selectedCriteriaIds.includes(criterion.id)}
                      onChange={() => handleToggleCriterion(criterion.id)} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">{criterion.criterion_text}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Weight: {criterion.weight} {criterion.is_required && '| Required'}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCriteriaDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCriteria}>Save Selection</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplatesHome;
