import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Chip,
  Tooltip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import RuleIcon from '@mui/icons-material/Rule';
import {
  getFrameworks,
  createFramework,
  updateFramework,
  deleteFramework,
  getFrameworkSections,
  createSection,
  updateSection,
  deleteSection,
  getSectionCriteria,
  createCriterion,
  updateCriterion,
  deleteCriterion,
} from '../../services/apiService';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../../features/snackbarSlice';
import { commonStyles } from '../../theme/managementTheme';

const FrameworksHome = () => {
  const [frameworks, setFrameworks] = useState([]);
  const [openFrameworkDialog, setOpenFrameworkDialog] = useState(false);
  const [openSectionDialog, setOpenSectionDialog] = useState(false);
  const [openCriterionDialog, setOpenCriterionDialog] = useState(false);
  const [currentFramework, setCurrentFramework] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);
  const [frameworkForm, setFrameworkForm] = useState({ id: null, name: '', code: '', description: '', is_active: true });
  const [sectionForm, setSectionForm] = useState({ id: null, name: '', code: '', description: '', ordering: 0 });
  const [criterionForm, setCriterionForm] = useState({
    id: null,
    criterion_text: '',
    marking_instructions: '',
    weight: 1.0,
    is_required: false,
    ordering: 0,
  });
  const [expandedFramework, setExpandedFramework] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const dispatch = useDispatch();

  const fetchFrameworks = useCallback(async () => {
    try {
      const response = await getFrameworks();
      setFrameworks(response.data?.results || response.data || []);
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to load frameworks', severity: 'error' }));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchFrameworks();
  }, [fetchFrameworks]);

  // Framework handlers
  const handleOpenFrameworkDialog = (framework = null) => {
    if (framework) {
      setFrameworkForm({ ...framework });
    } else {
      setFrameworkForm({ id: null, name: '', code: '', description: '', is_active: true });
    }
    setOpenFrameworkDialog(true);
  };

  const handleSaveFramework = async () => {
    try {
      if (frameworkForm.id) {
        await updateFramework(frameworkForm.id, frameworkForm);
      } else {
        await createFramework(frameworkForm);
      }
      setOpenFrameworkDialog(false);
      fetchFrameworks();
      dispatch(showSnackbar({ message: 'Framework saved successfully', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to save framework', severity: 'error' }));
    }
  };

  const handleDeleteFramework = async (id) => {
    try {
      await deleteFramework(id);
      fetchFrameworks();
      dispatch(showSnackbar({ message: 'Framework deleted', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to delete framework', severity: 'error' }));
    }
  };

  // Section handlers
  const handleExpandFramework = async (framework) => {
    if (expandedFramework === framework.id) {
      setExpandedFramework(null);
      return;
    }
    setExpandedFramework(framework.id);
    try {
      const response = await getFrameworkSections(framework.id);
      const updated = frameworks.map(f =>
        f.id === framework.id ? { ...f, sections: response.data?.results || response.data || [] } : f
      );
      setFrameworks(updated);
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to load sections', severity: 'error' }));
    }
  };

  const handleOpenSectionDialog = (framework, section = null) => {
    setCurrentFramework(framework);
    if (section) {
      setSectionForm({ ...section });
    } else {
      const maxOrder = Math.max(0, ...(framework.sections || []).map(s => s.ordering));
      setSectionForm({ id: null, name: '', code: '', description: '', ordering: maxOrder + 1 });
    }
    setOpenSectionDialog(true);
  };

  const handleSaveSection = async () => {
    try {
      if (sectionForm.id) {
        await updateSection(sectionForm.id, sectionForm);
      } else {
        await createSection(currentFramework.id, sectionForm);
      }
      setOpenSectionDialog(false);
      // Refresh sections
      const response = await getFrameworkSections(currentFramework.id);
      const updated = frameworks.map(f =>
        f.id === currentFramework.id ? { ...f, sections: response.data?.results || response.data || [] } : f
      );
      setFrameworks(updated);
      dispatch(showSnackbar({ message: 'Section saved successfully', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to save section', severity: 'error' }));
    }
  };

  const handleDeleteSection = async (sectionId) => {
    try {
      await deleteSection(sectionId);
      // Refresh sections
      const response = await getFrameworkSections(expandedFramework);
      const updated = frameworks.map(f =>
        f.id === expandedFramework ? { ...f, sections: response.data?.results || response.data || [] } : f
      );
      setFrameworks(updated);
      dispatch(showSnackbar({ message: 'Section deleted', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to delete section', severity: 'error' }));
    }
  };

  // Criterion handlers
  const handleExpandSection = async (framework, section) => {
    if (expandedSection === section.id) {
      setExpandedSection(null);
      return;
    }
    setExpandedSection(section.id);
    try {
      const response = await getSectionCriteria(section.id);
      const updated = frameworks.map(f => {
        if (f.id === framework.id) {
          return {
            ...f,
            sections: (f.sections || []).map(s =>
              s.id === section.id ? { ...s, criteria: response.data?.results || response.data || [] } : s
            ),
          };
        }
        return f;
      });
      setFrameworks(updated);
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to load criteria', severity: 'error' }));
    }
  };

  const handleOpenCriterionDialog = (framework, section, criterion = null) => {
    setCurrentFramework(framework);
    setCurrentSection(section);
    if (criterion) {
      setCriterionForm({ ...criterion });
    } else {
      const maxOrder = Math.max(0, ...(section.criteria || []).map(c => c.ordering));
      setCriterionForm({
        id: null,
        criterion_text: '',
        marking_instructions: '',
        weight: 1.0,
        is_required: false,
        ordering: maxOrder + 1,
      });
    }
    setOpenCriterionDialog(true);
  };

  const handleSaveCriterion = async () => {
    try {
      if (criterionForm.id) {
        await updateCriterion(criterionForm.id, criterionForm);
      } else {
        await createCriterion(currentSection.id, criterionForm);
      }
      setOpenCriterionDialog(false);
      // Refresh criteria
      const response = await getSectionCriteria(currentSection.id);
      const updated = frameworks.map(f => {
        if (f.id === currentFramework.id) {
          return {
            ...f,
            sections: (f.sections || []).map(s =>
              s.id === currentSection.id ? { ...s, criteria: response.data?.results || response.data || [] } : s
            ),
          };
        }
        return f;
      });
      setFrameworks(updated);
      dispatch(showSnackbar({ message: 'Criterion saved successfully', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to save criterion', severity: 'error' }));
    }
  };

  const handleDeleteCriterion = async (criterionId, sectionId, frameworkId) => {
    try {
      await deleteCriterion(criterionId);
      // Refresh criteria
      const response = await getSectionCriteria(sectionId);
      const updated = frameworks.map(f => {
        if (f.id === frameworkId) {
          return {
            ...f,
            sections: (f.sections || []).map(s =>
              s.id === sectionId ? { ...s, criteria: response.data?.results || response.data || [] } : s
            ),
          };
        }
        return f;
      });
      setFrameworks(updated);
      dispatch(showSnackbar({ message: 'Criterion deleted', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to delete criterion', severity: 'error' }));
    }
  };

  return (
    <Box sx={{ ...commonStyles.pageContainer, minHeight: 'auto' }}>
      {/* Page Header */}
      <Box sx={commonStyles.pageHeader}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            Rubric Frameworks
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Create and manage evaluation frameworks, sections, and criteria
          </Typography>
        </Box>
        <Tooltip title="Add New Framework" arrow>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOpenFrameworkDialog()}
            startIcon={<AddIcon />}
            sx={commonStyles.primaryButton}
          >
            Add Framework
          </Button>
        </Tooltip>
      </Box>

      {/* Frameworks List */}
      {(frameworks || []).map((framework) => (
        <Accordion
          key={framework.id}
          expanded={expandedFramework === framework.id}
          onChange={() => handleExpandFramework(framework)}
          sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <Box sx={{
                backgroundColor: 'primary.light',
                borderRadius: 2,
                p: 1,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AccountTreeIcon sx={{ color: 'white' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{framework.name}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Code: {framework.code} | Sections: {framework.section_count || 0}
                </Typography>
              </Box>
              <Box sx={{ mr: 2 }}>
                <Chip
                  label={framework.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  color={framework.is_active ? 'success' : 'default'}
                />
              </Box>
              <Tooltip title="Edit Framework" arrow>
                <IconButton
                  onClick={(e) => { e.stopPropagation(); handleOpenFrameworkDialog(framework); }}
                  size="small"
                  sx={commonStyles.iconButton}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Framework" arrow>
                <IconButton
                  onClick={(e) => { e.stopPropagation(); handleDeleteFramework(framework.id); }}
                  color="error"
                  size="small"
                  sx={commonStyles.iconButton}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ pl: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Sections
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenSectionDialog(framework)}
                >
                  Add Section
                </Button>
              </Box>

              {(framework.sections || []).length === 0 ? (
                <Paper elevation={0} sx={{ ...commonStyles.paperCard, textAlign: 'center', py: 4 }}>
                  <ViewModuleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No sections yet. Add your first section.
                  </Typography>
                </Paper>
              ) : (
                (framework.sections || []).map((section) => (
                  <Accordion
                    key={section.id}
                    expanded={expandedSection === section.id}
                    onChange={() => handleExpandSection(framework, section)}
                    sx={{ mb: 1 }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <Box sx={{
                          backgroundColor: 'secondary.light',
                          borderRadius: 1,
                          p: 0.5,
                          mr: 1.5,
                          minWidth: 32,
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ color: 'white', fontWeight: 700 }}>
                            {section.code}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {section.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Criteria: {section.criterion_count || 0}
                          </Typography>
                        </Box>
                        <Tooltip title="Edit Section" arrow>
                          <IconButton
                            onClick={(e) => { e.stopPropagation(); handleOpenSectionDialog(framework, section); }}
                            size="small"
                            sx={commonStyles.iconButton}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Section" arrow>
                          <IconButton
                            onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }}
                            color="error"
                            size="small"
                            sx={commonStyles.iconButton}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ pl: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Criteria
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenCriterionDialog(framework, section)}
                          >
                            Add Criterion
                          </Button>
                        </Box>

                        {(section.criteria || []).length === 0 ? (
                          <Paper elevation={0} sx={{ ...commonStyles.paperElevated, textAlign: 'center', py: 3 }}>
                            <RuleIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              No criteria yet
                            </Typography>
                          </Paper>
                        ) : (
                          <Grid container spacing={2}>
                            {(section.criteria || []).map((criterion) => (
                              <Grid item xs={12} md={6} key={criterion.id}>
                                <Paper elevation={0} sx={{ ...commonStyles.paperElevated, p: 2 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                                    <RuleIcon sx={{ color: 'primary.main', mr: 1, mt: 0.5 }} fontSize="small" />
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                        {criterion.criterion_text}
                                      </Typography>
                                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                        <Chip
                                          label={`Weight: ${criterion.weight}`}
                                          size="small"
                                          variant="outlined"
                                        />
                                        {criterion.is_required && (
                                          <Chip label="Required" size="small" color="error" />
                                        )}
                                      </Box>
                                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        {criterion.marking_instructions?.substring(0, 100)}
                                        {criterion.marking_instructions?.length > 100 && '...'}
                                      </Typography>
                                    </Box>
                                    <Box>
                                      <Tooltip title="Edit" arrow>
                                        <IconButton
                                          onClick={() => handleOpenCriterionDialog(framework, section, criterion)}
                                          size="small"
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete" arrow>
                                        <IconButton
                                          onClick={() => handleDeleteCriterion(criterion.id, section.id, framework.id)}
                                          color="error"
                                          size="small"
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </Box>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Empty State */}
      {frameworks.length === 0 && (
        <Paper elevation={0} sx={{ ...commonStyles.paperCard, textAlign: 'center', py: 8 }}>
          <AccountTreeIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
            No Frameworks Yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled', mb: 3 }}>
            Create your first framework to start organizing rubric criteria
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOpenFrameworkDialog()}
            startIcon={<AddIcon />}
            sx={commonStyles.primaryButton}
          >
            Add Framework
          </Button>
        </Paper>
      )}

      {/* Framework Dialog */}
      <Dialog
        open={openFrameworkDialog}
        onClose={() => setOpenFrameworkDialog(false)}
        fullWidth
        maxWidth="sm"
        sx={commonStyles.modernDialog}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {frameworkForm.id ? 'Edit Framework' : 'Add New Framework'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {frameworkForm.id ? 'Update framework details' : 'Create a new evaluation framework'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Paper elevation={0} sx={{ ...commonStyles.paperElevated, mb: 2 }}>
            <TextField
              label="Framework Name"
              fullWidth
              value={frameworkForm.name}
              onChange={(e) => setFrameworkForm({ ...frameworkForm, name: e.target.value })}
              sx={{ ...commonStyles.formField, mb: 2 }}
              placeholder="e.g., SPIKES"
            />
            <TextField
              label="Code"
              fullWidth
              value={frameworkForm.code}
              onChange={(e) => setFrameworkForm({ ...frameworkForm, code: e.target.value })}
              sx={{ ...commonStyles.formField, mb: 2 }}
              placeholder="e.g., SPIKES"
              helperText="A short unique identifier"
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={frameworkForm.description}
              onChange={(e) => setFrameworkForm({ ...frameworkForm, description: e.target.value })}
              sx={{ ...commonStyles.formField, mb: 2 }}
              placeholder="Describe the framework..."
            />
            <FormControlLabel
              control={
                <Switch
                  checked={frameworkForm.is_active}
                  onChange={(e) => setFrameworkForm({ ...frameworkForm, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={() => setOpenFrameworkDialog(false)} color="inherit" sx={commonStyles.secondaryButton}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleSaveFramework} sx={commonStyles.primaryButton}>
            {frameworkForm.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Section Dialog */}
      <Dialog
        open={openSectionDialog}
        onClose={() => setOpenSectionDialog(false)}
        fullWidth
        maxWidth="sm"
        sx={commonStyles.modernDialog}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {sectionForm.id ? 'Edit Section' : 'Add New Section'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {currentFramework?.name && `Framework: ${currentFramework.name}`}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Paper elevation={0} sx={{ ...commonStyles.paperElevated, mb: 2 }}>
            <TextField
              label="Section Name"
              fullWidth
              value={sectionForm.name}
              onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
              sx={{ ...commonStyles.formField, mb: 2 }}
              placeholder="e.g., Setting up the Interview"
            />
            <TextField
              label="Code"
              fullWidth
              value={sectionForm.code}
              onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })}
              sx={{ ...commonStyles.formField, mb: 2 }}
              placeholder="e.g., S"
              helperText="A short identifier (1-3 characters)"
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={sectionForm.description}
              onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
              sx={{ ...commonStyles.formField, mb: 2 }}
            />
            <TextField
              label="Order"
              type="number"
              fullWidth
              value={sectionForm.ordering}
              onChange={(e) => setSectionForm({ ...sectionForm, ordering: Number(e.target.value) })}
              sx={commonStyles.formField}
              helperText="Display order within the framework"
            />
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={() => setOpenSectionDialog(false)} color="inherit" sx={commonStyles.secondaryButton}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleSaveSection} sx={commonStyles.primaryButton}>
            {sectionForm.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Criterion Dialog */}
      <Dialog
        open={openCriterionDialog}
        onClose={() => setOpenCriterionDialog(false)}
        fullWidth
        maxWidth="md"
        sx={commonStyles.modernDialog}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {criterionForm.id ? 'Edit Criterion' : 'Add New Criterion'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {currentSection?.name && `Section: ${currentSection.name}`}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Paper elevation={0} sx={{ ...commonStyles.paperElevated, mb: 2 }}>
            <TextField
              label="Criterion Text"
              fullWidth
              value={criterionForm.criterion_text}
              onChange={(e) => setCriterionForm({ ...criterionForm, criterion_text: e.target.value })}
              sx={{ ...commonStyles.formField, mb: 2 }}
              placeholder="What should be evaluated?"
            />
            <TextField
              label="Marking Instructions"
              fullWidth
              multiline
              rows={4}
              value={criterionForm.marking_instructions}
              onChange={(e) => setCriterionForm({ ...criterionForm, marking_instructions: e.target.value })}
              sx={{ ...commonStyles.formField, mb: 2 }}
              placeholder="How should this criterion be scored?"
            />
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="Weight"
                  type="number"
                  fullWidth
                  value={criterionForm.weight}
                  onChange={(e) => setCriterionForm({ ...criterionForm, weight: parseFloat(e.target.value) || 1.0 })}
                  sx={commonStyles.formField}
                  inputProps={{ step: 0.1, min: 0.1, max: 5.0 }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Order"
                  type="number"
                  fullWidth
                  value={criterionForm.ordering}
                  onChange={(e) => setCriterionForm({ ...criterionForm, ordering: Number(e.target.value) })}
                  sx={commonStyles.formField}
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={criterionForm.is_required}
                      onChange={(e) => setCriterionForm({ ...criterionForm, is_required: e.target.checked })}
                    />
                  }
                  label="Required"
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={() => setOpenCriterionDialog(false)} color="inherit" sx={commonStyles.secondaryButton}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleSaveCriterion} sx={commonStyles.primaryButton}>
            {criterionForm.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FrameworksHome;
