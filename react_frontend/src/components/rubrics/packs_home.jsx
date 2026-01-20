import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Paper, Chip, Tooltip, Grid, List, ListItem,
  ListItemText, ListItemButton, Checkbox, Divider, Pagination,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InventoryIcon from '@mui/icons-material/Inventory';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  getPacks, createPack, updatePack, deletePack,
  getTemplates, addPackTemplate, removePackTemplate,
  getPackTemplates, getTemplateCriteria,
} from '../../services/apiService';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { showSnackbar } from '../../features/snackbarSlice';
import { commonStyles } from '../../theme/managementTheme';

const ITEMS_PER_PAGE = 25;

const PacksHome = () => {
  const [packs, setPacks] = useState([]);
  const [packTemplatesMap, setPackTemplatesMap] = useState({});
  const [templates, setTemplates] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTemplatesDialog, setOpenTemplatesDialog] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [currentPack, setCurrentPack] = useState(null);
  const [viewTemplate, setViewTemplate] = useState(null);
  const [viewTemplateCriteria, setViewTemplateCriteria] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', description: '' });
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Pagination calculations
  const totalPages = Math.ceil(packs.length / ITEMS_PER_PAGE);
  const paginatedPacks = packs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchPackTemplates = useCallback(async (packId) => {
    try {
      const response = await getPackTemplates(packId);
      const templatesData = response.data?.results || response.data || [];
      return templatesData;
    } catch (error) {
      return [];
    }
  }, []);

  const fetchPacks = useCallback(async () => {
    try {
      const response = await getPacks();
      const packsData = response.data?.results || response.data || [];
      setPacks(packsData);

      // Fetch templates for each pack
      const templatesMap = {};
      for (const pack of packsData) {
        templatesMap[pack.id] = await fetchPackTemplates(pack.id);
      }
      setPackTemplatesMap(templatesMap);
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to load packs', severity: 'error' }));
    }
  }, [dispatch, fetchPackTemplates]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await getTemplates();
      // Only published templates can be added to packs
      const templateData = response.data?.results || response.data || [];
      setTemplates(templateData.filter(t => t.status === 'published'));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to load templates', severity: 'error' }));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchPacks();
    fetchTemplates();
  }, [fetchPacks, fetchTemplates]);

  const handleOpenDialog = (pack = null) => {
    if (pack) {
      setForm({ id: pack.id, name: pack.name, description: pack.description || '' });
    } else {
      setForm({ id: null, name: '', description: '' });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (form.id) {
        await updatePack(form.id, form);
      } else {
        await createPack(form);
      }
      setOpenDialog(false);
      fetchPacks();
      dispatch(showSnackbar({ message: 'Pack saved', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to save pack', severity: 'error' }));
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePack(id);
      fetchPacks();
      dispatch(showSnackbar({ message: 'Pack deleted', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to delete pack', severity: 'error' }));
    }
  };

  const handleOpenTemplatesDialog = async (pack) => {
    setCurrentPack(pack);
    // Fetch current templates for this pack
    const packTemplates = await fetchPackTemplates(pack.id);
    setSelectedTemplateIds(packTemplates.map(t => t.template || t.template_id || t.id));
    setOpenTemplatesDialog(true);
  };

  const handleToggleTemplate = (templateId) => {
    setSelectedTemplateIds(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSaveTemplates = async () => {
    try {
      // Fetch current templates from API
      const existingTemplates = await fetchPackTemplates(currentPack.id);
      const currentIds = existingTemplates.map(t => t.template || t.template_id || t.id);

      const toAdd = selectedTemplateIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !selectedTemplateIds.includes(id));

      for (const id of toAdd) {
        await addPackTemplate(currentPack.id, { template: id });
      }
      for (const id of toRemove) {
        await removePackTemplate(currentPack.id, id);
      }

      setOpenTemplatesDialog(false);
      fetchPacks();
      dispatch(showSnackbar({ message: 'Templates updated', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to update templates', severity: 'error' }));
    }
  };

  const handleViewTemplate = async (template) => {
    setViewTemplate(template);
    setViewTemplateCriteria([]);
    setOpenViewModal(true);

    try {
      const templateId = template.template || template.template_id || template.id;
      const response = await getTemplateCriteria(templateId);
      const criteria = response.data?.results || response.data || [];
      setViewTemplateCriteria(criteria);
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to load template criteria', severity: 'error' }));
    }
  };

  const handleEditTemplate = () => {
    setOpenViewModal(false);
    navigate('/home/rubrics/templates');
  };

  const getPackTemplatesList = (packId) => {
    return packTemplatesMap[packId] || [];
  };

  return (
    <Box sx={{ ...commonStyles.pageContainer, minHeight: 'auto' }}>
      <Box sx={commonStyles.pageHeader}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            Rubric Packs
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Bundle templates together for activities
          </Typography>
        </Box>
        <Button variant="contained" color="primary" onClick={() => handleOpenDialog()}
          startIcon={<AddIcon />} sx={commonStyles.primaryButton}>
          Add Pack
        </Button>
      </Box>

{packs.length > 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Pack Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Templates</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(paginatedPacks || []).map((pack) => {
                const packTemplates = getPackTemplatesList(pack.id);
                return (
                  <TableRow
                    key={pack.id}
                    sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {pack.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {pack.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {packTemplates.length === 0 ? (
                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                          None
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {packTemplates.slice(0, 3).map((t) => (
                            <Chip
                              key={t.template || t.template_id || t.id}
                              label={t.template_name || t.display_label || t.name}
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewTemplate(t)}
                              sx={{ cursor: 'pointer' }}
                            />
                          ))}
                          {packTemplates.length > 3 && (
                            <Chip
                              label={`+${packTemplates.length - 3} more`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pack.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={pack.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Edit">
                          <IconButton onClick={() => handleOpenDialog(pack)} size="small">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Manage Templates">
                          <IconButton onClick={() => handleOpenTemplatesDialog(pack)} color="secondary" size="small">
                            <DescriptionIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton onClick={() => handleDelete(pack.id)} color="error" size="small">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
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
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, packs.length)} of {packs.length}
          </Typography>
        </Box>
      )}

{packs.length === 0 && (
        <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', textAlign: 'center', py: 8, borderRadius: 2 }}>
          <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>No Packs Yet</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Create a pack to bundle templates together
          </Typography>
          <Button variant="contained" onClick={() => handleOpenDialog()} startIcon={<AddIcon />}>Add Pack</Button>
        </Paper>
      )}

      {/* Pack Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? 'Edit Pack' : 'Add Pack'}</DialogTitle>
        <DialogContent>
          <TextField label="Pack Name" fullWidth value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }} placeholder="e.g., Headache Assessment Pack" />
          <TextField label="Description" fullWidth multiline rows={3} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>{form.id ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* Templates Selection Dialog */}
      <Dialog open={openTemplatesDialog} onClose={() => setOpenTemplatesDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Select Templates for {currentPack?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
            Only published templates can be added to packs
          </Typography>
          {templates.length === 0 ? (
            <Paper elevation={0} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No published templates available. Publish a template first.
              </Typography>
            </Paper>
          ) : (
            <List>
              {(templates || []).map(template => (
                <ListItem key={template.id} divider>
                  <Checkbox checked={selectedTemplateIds.includes(template.id)}
                    onChange={() => handleToggleTemplate(template.id)} />
                  <ListItemText
                    primary={template.display_label}
                    secondary={`${template.framework_name || 'No framework'} | ${template.criteria_count || 0} criteria`}
                  />
                  <Chip label={template.track_type === 'generic_comms' ? 'Generic' : 'Clinical'}
                    size="small" variant="outlined" />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTemplatesDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTemplates}>Save Selection</Button>
        </DialogActions>
      </Dialog>

      {/* View Template Modal */}
      <Dialog open={openViewModal} onClose={() => setOpenViewModal(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon color="primary" />
            {viewTemplate?.template_name || viewTemplate?.display_label || viewTemplate?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              Framework: {viewTemplate?.framework_name || 'N/A'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Track Type: {viewTemplate?.template_track_type === 'generic_comms' || viewTemplate?.track_type === 'generic_comms' ? 'Generic Communication' : 'Clinical Content'}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Criteria ({viewTemplateCriteria.length})
          </Typography>

          {viewTemplateCriteria.length === 0 ? (
            <Paper elevation={0} sx={{ p: 3, textAlign: 'center', backgroundColor: 'grey.50' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No criteria assigned to this template
              </Typography>
            </Paper>
          ) : (
            <List>
              {viewTemplateCriteria.map((criterion, index) => (
                <ListItem key={criterion.id || criterion.criterion_id || index} divider>
                  <ListItemText
                    primary={criterion.criterion_text || criterion.criterion?.criterion_text}
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={`Weight: ${criterion.weight_override || criterion.weight || criterion.criterion?.weight || 1}`}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                        {(criterion.is_required || criterion.criterion?.is_required) && (
                          <Chip label="Required" size="small" color="error" variant="outlined" />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewModal(false)}>Close</Button>
          <Button variant="contained" onClick={handleEditTemplate} startIcon={<EditIcon />}>
            Edit Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PacksHome;
