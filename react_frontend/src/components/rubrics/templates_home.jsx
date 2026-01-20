import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, TextField, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Paper, Chip, Tooltip, Grid, Select, MenuItem,
  FormControl, InputLabel, OutlinedInput, Checkbox, Accordion,
  AccordionSummary, AccordionDetails, Pagination, List, ListItem, ListItemButton,
  InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PublishIcon from '@mui/icons-material/Publish';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DescriptionIcon from '@mui/icons-material/Description';
import RuleIcon from '@mui/icons-material/Rule';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import {
  getTemplates, createTemplate, updateTemplate, deleteTemplate, publishTemplate,
  getFrameworks, getFrameworkSections, getSectionCriteria,
  addTemplateCriterion, removeTemplateCriterion, getTemplateCriteria,
} from '../../services/apiService';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../../features/snackbarSlice';
import { commonStyles } from '../../theme/managementTheme';

const TRACK_TYPES = [
  { value: 'generic_comms', label: 'Generic Communication' },
  { value: 'clinical_content', label: 'Clinical Content' },
];

const STATUS_COLORS = { draft: 'warning', published: 'success', archived: 'default' };
const ITEMS_PER_PAGE = 25;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [leftChecked, setLeftChecked] = useState([]);      // IDs checked in left panel
  const [searchQuery, setSearchQuery] = useState('');       // Search filter
  const [orderedSelection, setOrderedSelection] = useState([]); // Ordered selected criteria objects
  const dispatch = useDispatch();

  // Pagination calculations
  const totalPages = Math.ceil(templates.length / ITEMS_PER_PAGE);
  const paginatedTemplates = templates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        framework_id: template.framework || '',
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
      // Transform framework_id to framework for API
      const payload = {
        ...form,
        framework: form.framework_id,
      };
      delete payload.framework_id;

      if (form.id) {
        await updateTemplate(form.id, payload);
      } else {
        await createTemplate(payload);
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
    setSelectedCriteriaIds([]);
    setAvailableCriteria([]);
    setLeftChecked([]);
    setSearchQuery('');
    setOrderedSelection([]);

    try {
      // Fetch available criteria from framework sections first
      let allSections = [];
      if (template.framework) {
        const sectionsRes = await getFrameworkSections(template.framework);
        const sections = sectionsRes.data?.results || sectionsRes.data || [];
        for (const section of sections) {
          const criteriaRes = await getSectionCriteria(section.id);
          const criteria = criteriaRes.data?.results || criteriaRes.data || [];
          allSections.push({ ...section, criteria });
        }
        setAvailableCriteria(allSections);
      }

      // Fetch existing criteria for this template
      const existingCriteriaRes = await getTemplateCriteria(template.id);
      const existingCriteria = existingCriteriaRes.data?.results || existingCriteriaRes.data || [];

      // Build ordered selection from existing criteria, preserving order
      const sortedExisting = [...existingCriteria].sort((a, b) => (a.ordering || 0) - (b.ordering || 0));
      const orderedCriteria = [];

      for (const existing of sortedExisting) {
        const criterionId = existing.criterion_id || existing.criterion || existing.id;
        // Find this criterion in available sections
        for (const section of allSections) {
          const found = (section.criteria || []).find(c => c.id === criterionId);
          if (found) {
            orderedCriteria.push({
              ...found,
              sectionId: section.id,
              sectionCode: section.code,
              sectionName: section.name,
            });
            break;
          }
        }
      }
      setOrderedSelection(orderedCriteria);
      setSelectedCriteriaIds(orderedCriteria.map(c => c.id));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to load criteria', severity: 'error' }));
    }
    setOpenCriteriaDialog(true);
  };

  // Transfer list helper: get all criteria as flat list with section info
  const getAllCriteria = useMemo(() => {
    const result = [];
    availableCriteria.forEach(section => {
      (section.criteria || []).forEach(criterion => {
        result.push({
          ...criterion,
          sectionId: section.id,
          sectionCode: section.code,
          sectionName: section.name,
        });
      });
    });
    return result;
  }, [availableCriteria]);

  // Filter available criteria by search query and exclude already selected
  const filteredAvailableCriteria = useMemo(() => {
    const selectedIds = orderedSelection.map(c => c.id);
    return availableCriteria.map(section => {
      const filteredCriteria = (section.criteria || []).filter(criterion => {
        const matchesSearch = !searchQuery ||
          criterion.criterion_text.toLowerCase().includes(searchQuery.toLowerCase());
        const notSelected = !selectedIds.includes(criterion.id);
        return matchesSearch && notSelected;
      });
      return { ...section, criteria: filteredCriteria };
    }).filter(section => section.criteria.length > 0);
  }, [availableCriteria, searchQuery, orderedSelection]);

  // Toggle checkbox in left panel
  const handleToggleLeftCheck = (criterionId) => {
    setLeftChecked(prev =>
      prev.includes(criterionId)
        ? prev.filter(id => id !== criterionId)
        : [...prev, criterionId]
    );
  };

  // Move checked items from left to right
  const handleMoveRight = () => {
    const toMove = getAllCriteria.filter(c => leftChecked.includes(c.id));
    setOrderedSelection(prev => [...prev, ...toMove]);
    setLeftChecked([]);
  };

  // Move all available items to right
  const handleMoveAllRight = () => {
    const selectedIds = orderedSelection.map(c => c.id);
    const toMove = getAllCriteria.filter(c => !selectedIds.includes(c.id));
    setOrderedSelection(prev => [...prev, ...toMove]);
    setLeftChecked([]);
  };

  // Remove specific item from right panel
  const handleRemoveFromSelection = (criterionId) => {
    setOrderedSelection(prev => prev.filter(c => c.id !== criterionId));
  };

  // Remove all selected items (clear right panel)
  const handleMoveAllLeft = () => {
    setOrderedSelection([]);
    setLeftChecked([]);
  };

  // Move item up in the ordered list
  const handleMoveUp = (index) => {
    if (index === 0) return;
    setOrderedSelection(prev => {
      const newOrder = [...prev];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return newOrder;
    });
  };

  // Move item down in the ordered list
  const handleMoveDown = (index) => {
    setOrderedSelection(prev => {
      if (index === prev.length - 1) return prev;
      const newOrder = [...prev];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return newOrder;
    });
  };

  // Get section summary for selected criteria
  const getSectionSummary = useMemo(() => {
    const summary = {};
    orderedSelection.forEach(c => {
      const key = c.sectionCode || 'Unknown';
      if (!summary[key]) {
        summary[key] = { code: c.sectionCode, name: c.sectionName, count: 0 };
      }
      summary[key].count++;
    });
    return Object.values(summary);
  }, [orderedSelection]);

  const handleSaveCriteria = async () => {
    try {
      // Fetch current criteria from API to get all existing IDs
      const existingCriteriaRes = await getTemplateCriteria(currentTemplate.id);
      const existingCriteria = existingCriteriaRes.data?.results || existingCriteriaRes.data || [];
      const existingIds = existingCriteria.map(c => c.criterion_id || c.criterion || c.id);

      // Remove all existing criteria first to ensure clean ordering
      for (const id of existingIds) {
        await removeTemplateCriterion(currentTemplate.id, id);
      }

      // Add all selected criteria with correct ordering
      for (let i = 0; i < orderedSelection.length; i++) {
        await addTemplateCriterion(currentTemplate.id, {
          criterion: orderedSelection[i].id,
          ordering: i + 1,
        });
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

{templates.length > 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Template Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Framework</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Track Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Criteria</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(paginatedTemplates || []).map((template) => (
                <TableRow
                  key={template.id}
                  sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {template.display_label}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {template.internal_code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {template.framework_name || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.track_type === 'generic_comms' ? 'Generic' : 'Clinical'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={template.criteria_count || 0}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.status}
                      size="small"
                      color={STATUS_COLORS[template.status]}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleOpenDialog(template)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Manage Criteria">
                        <IconButton onClick={() => handleOpenCriteriaDialog(template)} color="secondary" size="small">
                          <RuleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {template.status === 'draft' && (
                        <Tooltip title="Publish">
                          <IconButton onClick={() => handlePublish(template.id)} color="success" size="small">
                            <PublishIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(template.id)} color="error" size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 4, mb: 2 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
            sx={{
              '& .MuiPaginationItem-root': {
                fontWeight: 500,
              },
            }}
          />
          <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, templates.length)} of {templates.length}
          </Typography>
        </Box>
      )}

{templates.length === 0 && (
        <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', textAlign: 'center', py: 8, borderRadius: 2 }}>
          <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>No Templates Yet</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Create a template to get started
          </Typography>
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

      {/* Criteria Selection Dialog - Transfer List Design */}
      <Dialog open={openCriteriaDialog} onClose={() => setOpenCriteriaDialog(false)} fullWidth maxWidth="lg">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Select Criteria for {currentTemplate?.display_label}</Typography>
          <IconButton onClick={() => setOpenCriteriaDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          {/* Search Input */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search criteria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Two-Panel Layout */}
          <Grid container spacing={2}>
            {/* Left Panel - Available Criteria */}
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  height: 450,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box sx={{ p: 1.5, borderBottom: '1px solid #e0e0e0', bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    AVAILABLE CRITERIA
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {filteredAvailableCriteria.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {searchQuery ? 'No criteria match your search' : 'All criteria have been selected'}
                      </Typography>
                    </Box>
                  ) : (
                    filteredAvailableCriteria.map(section => {
                      const selectedInSection = orderedSelection.filter(c => c.sectionId === section.id).length;
                      const totalInSection = availableCriteria.find(s => s.id === section.id)?.criteria?.length || 0;
                      return (
                        <Accordion key={section.id} disableGutters elevation={0}>
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ bgcolor: 'grey.50', minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                              {section.code} - {section.name}
                            </Typography>
                            <Chip
                              label={`${selectedInSection}/${totalInSection}`}
                              size="small"
                              color={selectedInSection > 0 ? 'primary' : 'default'}
                              sx={{ ml: 1, mr: 1, height: 22 }}
                            />
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 0 }}>
                            <List dense disablePadding>
                              {(section.criteria || []).map(criterion => (
                                <ListItem
                                  key={criterion.id}
                                  disablePadding
                                  sx={{ borderBottom: '1px solid #f0f0f0' }}
                                >
                                  <ListItemButton
                                    onClick={() => handleToggleLeftCheck(criterion.id)}
                                    selected={leftChecked.includes(criterion.id)}
                                    sx={{ py: 0.5 }}
                                  >
                                    <Checkbox
                                      checked={leftChecked.includes(criterion.id)}
                                      tabIndex={-1}
                                      disableRipple
                                      size="small"
                                    />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                        {criterion.criterion_text}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Weight: {criterion.weight} {criterion.is_required && '• Required'}
                                      </Typography>
                                    </Box>
                                  </ListItemButton>
                                </ListItem>
                              ))}
                            </List>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Center - Transfer Buttons */}
            <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Tooltip title="Move all to selected">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleMoveAllRight}
                    disabled={filteredAvailableCriteria.every(s => s.criteria.length === 0)}
                    sx={{ minWidth: 44 }}
                  >
                    <KeyboardDoubleArrowRightIcon />
                  </Button>
                </Tooltip>
                <Tooltip title="Move selected to right">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleMoveRight}
                    disabled={leftChecked.length === 0}
                    sx={{ minWidth: 44 }}
                  >
                    <ChevronRightIcon />
                  </Button>
                </Tooltip>
                <Tooltip title="Clear all selected">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleMoveAllLeft}
                    disabled={orderedSelection.length === 0}
                    sx={{ minWidth: 44 }}
                  >
                    <KeyboardDoubleArrowLeftIcon />
                  </Button>
                </Tooltip>
              </Box>
            </Grid>

            {/* Right Panel - Selected Criteria */}
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  height: 450,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box sx={{ p: 1.5, borderBottom: '1px solid #e0e0e0', bgcolor: 'primary.light' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white' }}>
                    SELECTED CRITERIA ({orderedSelection.length})
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {orderedSelection.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        No criteria selected yet
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Select criteria from the left panel
                      </Typography>
                    </Box>
                  ) : (
                    <List dense disablePadding>
                      {orderedSelection.map((criterion, index) => (
                        <ListItem
                          key={criterion.id}
                          sx={{
                            borderBottom: '1px solid #f0f0f0',
                            py: 0.5,
                            '&:hover': { bgcolor: 'grey.50' },
                          }}
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleMoveUp(index)}
                                disabled={index === 0}
                              >
                                <KeyboardArrowUpIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleMoveDown(index)}
                                disabled={index === orderedSelection.length - 1}
                              >
                                <KeyboardArrowDownIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveFromSelection(criterion.id)}
                                color="error"
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          }
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', minWidth: 0, pr: 12 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                fontWeight: 600,
                                minWidth: 28,
                                mr: 1,
                              }}
                            >
                              {index + 1}.
                            </Typography>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                {criterion.criterion_text}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {criterion.sectionCode}
                              </Typography>
                            </Box>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>

                {/* Section Summary */}
                {getSectionSummary.length > 0 && (
                  <Box sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', bgcolor: 'grey.50' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      Section Summary:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {getSectionSummary.map(s => (
                        <Chip
                          key={s.code}
                          label={`${s.code}: ${s.count}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 22 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenCriteriaDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCriteria}>
            Save Selection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplatesHome;
