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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { get, post, del } from '../../services/apiService';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../../features/snackbarSlice';

const ActivitiesHome = () => {
  const [activities, setActivities] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({ id: null, pre_brief: '', character_id: '', categories: [] });
  const dispatch = useDispatch();

  const fetchData = useCallback(async () => {
    try {
      const activitiesRes = await get('/activities');
      const charactersRes = await get('/scenarios');
      const categoriesRes = await get('/categories');

      setActivities(activitiesRes.data);
      setCharacters(charactersRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to fetch data', severity: 'error' }));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      await post('/activities/', form);
      dispatch(showSnackbar({ message: 'Activity saved', severity: 'success' }));
      setOpenDialog(false);
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
    });
    setOpenDialog(true);
  };

  return (
    <Box p={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Activities</Typography>
        <Button startIcon={<AddIcon />} onClick={() => setOpenDialog(true)} variant="contained">
          Add Activity
        </Button>
      </Box>

      <Box mt={3}>
        {activities.map((activity) => (
          <Box key={activity.id} mb={2} p={2} border={1} borderRadius={2}>
            <Typography variant="subtitle1">{activity.pre_brief}</Typography>
            <Typography variant="body2">
              Character: {characters.find(c => c.id === activity.character_id)?.scenario_text || 'N/A'}
            </Typography>
            <Typography variant="body2">
              Categories: {activity.categories.map(cid => categories.find(cat => cat.id === cid)?.name).join(', ')}
            </Typography>
            <Box mt={1}>
              <IconButton onClick={() => openEditDialog(activity)}><EditIcon /></IconButton>
              <IconButton onClick={() => handleDelete(activity.id)} color="error"><DeleteIcon /></IconButton>
            </Box>
          </Box>
        ))}
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Pre-Brief"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={form.pre_brief}
            onChange={(e) => setForm({ ...form, pre_brief: e.target.value })}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Character</InputLabel>
            <Select
              value={form.character_id}
              onChange={(e) => setForm({ ...form, character_id: e.target.value })}
              input={<OutlinedInput label="Character" />}
            >
              {characters.map((char) => (
                <MenuItem key={char.id} value={char.id}>{char.scenario_text}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Categories</InputLabel>
            <Select
              multiple
              value={form.categories}
              onChange={(e) => setForm({ ...form, categories: e.target.value })}
              input={<OutlinedInput label="Categories" />}
              renderValue={(selected) => selected.map(cid => categories.find(c => c.id === cid)?.name).join(', ')}
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  <Checkbox checked={form.categories.includes(cat.id)} />
                  <ListItemText primary={cat.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActivitiesHome;
