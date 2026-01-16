import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Paper, Chip, Tooltip, Grid, List, ListItem,
  ListItemText, ListItemSecondaryAction, Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InventoryIcon from '@mui/icons-material/Inventory';
import DescriptionIcon from '@mui/icons-material/Description';
import {
  getPacks, createPack, updatePack, deletePack,
  getTemplates, addPackTemplate, removePackTemplate,
} from '../../services/apiService';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../../features/snackbarSlice';
import { commonStyles } from '../../theme/managementTheme';

const PacksHome = () => {
  const [packs, setPacks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTemplatesDialog, setOpenTemplatesDialog] = useState(false);
  const [currentPack, setCurrentPack] = useState(null);
  const [form, setForm] = useState({ id: null, name: '', description: '' });
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const dispatch = useDispatch();

  const fetchPacks = useCallback(async () => {
    try {
      const response = await getPacks();
      setPacks(response.data || []);
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to load packs', severity: 'error' }));
    }
  }, [dispatch]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await getTemplates();
      // Only published templates can be added to packs
      const templateData = response.data || [];
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

  const handleOpenTemplatesDialog = (pack) => {
    setCurrentPack(pack);
    setSelectedTemplateIds((pack.templates || []).map(t => t.template_id || t.id));
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
      const currentIds = (currentPack.templates || []).map(t => t.template_id || t.id);
      const toAdd = selectedTemplateIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !selectedTemplateIds.includes(id));

      for (const id of toAdd) {
        await addPackTemplate(currentPack.id, { template_id: id });
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

      <Grid container spacing={3}>
        {packs.map((pack) => (
          <Grid item xs={12} md={6} lg={4} key={pack.id}>
            <Paper elevation={0} sx={{ ...commonStyles.paperCard, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ backgroundColor: 'secondary.light', borderRadius: 2, p: 1, mr: 2 }}>
                  <InventoryIcon sx={{ color: 'white' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{pack.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {pack.description || 'No description'}
                  </Typography>
                </Box>
                <Chip label={pack.is_active ? 'Active' : 'Inactive'} size="small"
                  color={pack.is_active ? 'success' : 'default'} />
              </Box>

              <Box sx={{ flex: 1, mb: 2 }}>
                <Paper elevation={0} sx={{ ...commonStyles.paperElevated, p: 1.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                    Templates ({pack.template_count || 0}):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(pack.templates || []).slice(0, 3).map(t => (
                      <Chip key={t.template_id || t.id} label={t.display_label || t.name}
                        size="small" variant="outlined" icon={<DescriptionIcon />} />
                    ))}
                    {(pack.templates || []).length > 3 && (
                      <Chip label={`+${pack.templates.length - 3} more`} size="small" />
                    )}
                    {(pack.templates || []).length === 0 && (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        No templates assigned
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Box>

              <Box sx={{ ...commonStyles.actionButtons, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                <Tooltip title="Edit"><IconButton onClick={() => handleOpenDialog(pack)} size="small"><EditIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Manage Templates"><IconButton onClick={() => handleOpenTemplatesDialog(pack)} color="secondary" size="small"><DescriptionIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Delete"><IconButton onClick={() => handleDelete(pack.id)} color="error" size="small"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {packs.length === 0 && (
        <Paper elevation={0} sx={{ ...commonStyles.paperCard, textAlign: 'center', py: 8 }}>
          <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>No Packs Yet</Typography>
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
              {templates.map(template => (
                <ListItem key={template.id} divider>
                  <Checkbox checked={selectedTemplateIds.includes(template.id)}
                    onChange={() => handleToggleTemplate(template.id)} />
                  <ListItemText
                    primary={template.display_label}
                    secondary={`${template.framework?.name || 'No framework'} | ${template.criteria_count || 0} criteria`}
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
    </Box>
  );
};

export default PacksHome;
