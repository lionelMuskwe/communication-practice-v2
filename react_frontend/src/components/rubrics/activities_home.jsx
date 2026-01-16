import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Paper,
  Chip,
  Tooltip,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import InventoryIcon from '@mui/icons-material/Inventory';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { get, post, del, getPacks } from '../../services/apiService';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../../features/snackbarSlice';
import { commonStyles } from '../../theme/managementTheme';

const ActivitiesHome = () => {
  const [activities, setActivities] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [packs, setPacks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({ id: null, pre_brief: '', character_id: '', categories: [], rubric_pack_id: '', exclude_generic_comms: false });
  const dispatch = useDispatch();

  const fetchData = useCallback(async () => {
    try {
      const activitiesRes = await get('/activities');
      const charactersRes = await get('/scenarios');
      const categoriesRes = await get('/categories');
      const packsRes = await getPacks();

      setActivities(activitiesRes.data || []);
      setCharacters(charactersRes.data || []);
      setCategories(categoriesRes.data || []);
      setPacks(packsRes.data || []);
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to fetch data', severity: 'error' }));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    // Validate required fields
    if (!form.pre_brief.trim()) {
      dispatch(showSnackbar({ message: 'Pre-brief is required', severity: 'error' }));
      return;
    }

    if (!form.character_id) {
      dispatch(showSnackbar({ message: 'Please select a character', severity: 'error' }));
      return;
    }

    try {
      await post('/activities/', form);
      dispatch(showSnackbar({ message: 'Activity saved', severity: 'success' }));
      setOpenDialog(false);
      setForm({ id: null, pre_brief: '', character_id: '', categories: [], rubric_pack_id: '', exclude_generic_comms: false });
      fetchData();
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to save activity', severity: 'error' }));
    }
  };

  const handleDelete = async (id) => {
    try {
      await del(`/activities/${id}/`);
      dispatch(showSnackbar({ message: 'Activity deleted', severity: 'success' }));
      fetchData();
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to delete activity', severity: 'error' }));
    }
  };

  const openEditDialog = (activity) => {
    setForm({
      id: activity.id,
      pre_brief: activity.pre_brief,
      character_id: activity.character_id,
      categories: activity.categories,
      rubric_pack_id: activity.rubric_pack_id || '',
      exclude_generic_comms: activity.exclude_generic_comms || false,
    });
    setOpenDialog(true);
  };

  const openAddDialog = () => {
    setForm({ id: null, pre_brief: '', character_id: '', categories: [], rubric_pack_id: '', exclude_generic_comms: false });
    setOpenDialog(true);
  };

  return (
    <Box sx={{ ...commonStyles.pageContainer, minHeight: 'auto' }}>
      {/* Page Header */}
      <Box sx={commonStyles.pageHeader}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            Activity Management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Create and organize practice activities for communication scenarios
          </Typography>
        </Box>
        <Tooltip title="Add New Activity" arrow>
          <Button
            variant="contained"
            color="primary"
            onClick={openAddDialog}
            startIcon={<AddIcon />}
            sx={commonStyles.primaryButton}
          >
            Add Activity
          </Button>
        </Tooltip>
      </Box>

      {/* Activities Grid */}
      <Grid container spacing={3}>
        {activities.map((activity) => (
          <Grid item xs={12} md={6} lg={4} key={activity.id}>
            <Paper elevation={0} sx={{ ...commonStyles.paperCard, height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Activity Header */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{
                  backgroundColor: 'primary.light',
                  borderRadius: 2,
                  p: 1,
                  mr: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AssignmentIcon sx={{ color: 'white' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.4 }}>
                    Activity Brief
                  </Typography>
                </Box>
              </Box>

              {/* Activity Content */}
              <Box sx={{ flex: 1, mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.primary', mb: 2, lineHeight: 1.6 }}>
                  {activity.pre_brief}
                </Typography>

                {/* Character Info */}
                <Paper elevation={0} sx={{ ...commonStyles.paperElevated, mb: 1.5, p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" sx={{ color: 'primary.main' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      Character:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                      {characters.find(c => c.id === activity.character_id)?.scenario_text || 'N/A'}
                    </Typography>
                  </Box>
                </Paper>

                {/* Rubric Pack */}
                <Paper elevation={0} sx={{ ...commonStyles.paperElevated, mb: 1.5, p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InventoryIcon fontSize="small" sx={{ color: 'secondary.main' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      Rubric Pack:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                      {activity.rubric_pack_name || 'None'}
                    </Typography>
                    {activity.exclude_generic_comms && (
                      <Chip label="No Generic" size="small" color="warning" sx={{ ml: 'auto' }} />
                    )}
                  </Box>
                </Paper>

                {/* Categories */}
                <Paper elevation={0} sx={{ ...commonStyles.paperElevated, p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CategoryIcon fontSize="small" sx={{ color: 'primary.main' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      Categories (legacy):
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {activity.categories.length > 0 ? (
                      activity.categories.map(cid => {
                        const cat = categories.find(cat => cat.id === cid);
                        return cat ? (
                          <Chip
                            key={cid}
                            label={cat.name}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ) : null;
                      })
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                        No categories assigned
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ ...commonStyles.actionButtons, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                <Tooltip title="Edit Activity" arrow>
                  <IconButton
                    onClick={() => openEditDialog(activity)}
                    color="primary"
                    size="small"
                    sx={commonStyles.iconButton}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Activity" arrow>
                  <IconButton
                    onClick={() => handleDelete(activity.id)}
                    color="error"
                    size="small"
                    sx={commonStyles.iconButton}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {activities.length === 0 && (
        <Paper elevation={0} sx={{ ...commonStyles.paperCard, textAlign: 'center', py: 8 }}>
          <AssignmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
            No Activities Yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled', mb: 3 }}>
            Create your first activity to get started
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={openAddDialog}
            startIcon={<AddIcon />}
            sx={commonStyles.primaryButton}
          >
            Add Activity
          </Button>
        </Paper>
      )}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
        sx={commonStyles.modernDialog}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {form.id ? 'Edit Activity' : 'Add New Activity'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {form.id ? 'Update activity details' : 'Create a new practice activity'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Paper elevation={0} sx={{ ...commonStyles.paperElevated, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIcon fontSize="small" />
              Activity Brief
            </Typography>
            <TextField
              label="Pre-Brief"
              fullWidth
              multiline
              rows={4}
              value={form.pre_brief}
              onChange={(e) => setForm({ ...form, pre_brief: e.target.value })}
              sx={commonStyles.formField}
              placeholder="Describe the activity scenario and what the participant should expect..."
            />
          </Paper>

          <Paper elevation={0} sx={{ ...commonStyles.paperElevated, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon fontSize="small" />
              Associated Character
            </Typography>
            <FormControl fullWidth sx={commonStyles.formField}>
              <InputLabel>Character</InputLabel>
              <Select
                value={form.character_id}
                onChange={(e) => setForm({ ...form, character_id: e.target.value })}
                input={<OutlinedInput label="Character" />}
              >
                {characters.map((char) => (
                  <MenuItem key={char.id} value={char.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon fontSize="small" sx={{ color: 'primary.main' }} />
                      {char.scenario_text}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          <Paper elevation={0} sx={{ ...commonStyles.paperElevated, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <InventoryIcon fontSize="small" />
              Rubric Pack (v2.0)
            </Typography>
            <FormControl fullWidth sx={{ ...commonStyles.formField, mb: 2 }}>
              <InputLabel>Rubric Pack</InputLabel>
              <Select
                value={form.rubric_pack_id}
                onChange={(e) => setForm({ ...form, rubric_pack_id: e.target.value })}
                input={<OutlinedInput label="Rubric Pack" />}
              >
                <MenuItem value="">None</MenuItem>
                {packs.map((pack) => (
                  <MenuItem key={pack.id} value={pack.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InventoryIcon fontSize="small" sx={{ color: 'secondary.main' }} />
                      {pack.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={form.exclude_generic_comms}
                  onChange={(e) => setForm({ ...form, exclude_generic_comms: e.target.checked })}
                />
              }
              label="Exclude Generic Communication criteria"
            />
          </Paper>

          <Paper elevation={0} sx={commonStyles.paperElevated}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CategoryIcon fontSize="small" />
              Categories (Legacy)
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
              Legacy category system - use Rubric Pack above for new assessments
            </Typography>
            <FormControl fullWidth sx={commonStyles.formField}>
              <InputLabel>Categories</InputLabel>
              <Select
                multiple
                value={form.categories}
                onChange={(e) => setForm({ ...form, categories: e.target.value })}
                input={<OutlinedInput label="Categories" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map(cid => {
                      const cat = categories.find(c => c.id === cid);
                      return cat ? (
                        <Chip key={cid} label={cat.name} size="small" color="primary" variant="outlined" />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    <Checkbox checked={form.categories.includes(cat.id)} color="primary" />
                    <ListItemText primary={cat.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button
            onClick={() => setOpenDialog(false)}
            color="inherit"
            sx={commonStyles.secondaryButton}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            sx={commonStyles.primaryButton}
          >
            {form.id ? 'Update Activity' : 'Create Activity'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActivitiesHome;
