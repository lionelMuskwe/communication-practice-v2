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
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { get, post, del } from '../../services/apiService';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../../features/snackbarSlice';

const RubricsHome = () => {
  const [categories, setCategories] = useState([]);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [openRubricDialog, setOpenRubricDialog] = useState(false);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ id: null, name: '', total_required_to_pass: 0 });
  const dispatch = useDispatch();

  const fetchCategories = useCallback(async () => {
    try {
      const response = await get('/categories');
      const normalized = response.data.map(cat => ({
        ...cat,
        rubrics: cat.subcategories || []
      }));
      setCategories(normalized);
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to load categories', severity: 'error' }));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenCategoryDialog = (index = null) => {
    if (index !== null) {
      setCategoryForm({ ...categories[index] });
    } else {
      setCategoryForm({ id: null, name: '', total_required_to_pass: 0 });
    }
    setCurrentCategoryIndex(index);
    setOpenCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    try {
      await post('/categories/', categoryForm);
      setOpenCategoryDialog(false);
      fetchCategories();
      dispatch(showSnackbar({ message: 'Category saved successfully', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to save category', severity: 'error' }));
    }
  };

  const handleDeleteCategory = async (index) => {
    try {
      await del(`/categories/${categories[index].id}/`);
      fetchCategories();
      dispatch(showSnackbar({ message: 'Category deleted', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to delete category', severity: 'error' }));
    }
  };

  const handleOpenRubricDialog = async (index) => {
    try {
      const category = categories[index];
      const response = await get(`/categories/${category.id}/rubrics/`);
      const updated = [...categories];
      updated[index].rubrics = response.data;
      setCategories(updated);
      setCurrentCategoryIndex(index);
      setOpenRubricDialog(true);
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to load rubrics', severity: 'error' }));
    }
  };

  const handleRubricChange = (rubricIndex, key, value) => {
    const updated = [...categories];
    updated[currentCategoryIndex].rubrics[rubricIndex][key] = value;
    setCategories(updated);
  };

  const addRubric = async () => {
    const newRubric = {
      name: '',
      marking_instructions: '',
      category_id: categories[currentCategoryIndex].id,
    };
    const updated = [...categories];
    updated[currentCategoryIndex].rubrics.push(newRubric);
    setCategories(updated);
  };

  const saveRubric = async (rubric) => {
    try {
      await post('/rubrics/', rubric);
      fetchCategories();
      dispatch(showSnackbar({ message: 'Rubric saved successfully', severity: 'success' }));
    } catch (error) {
      dispatch(showSnackbar({ message: 'Failed to save rubric', severity: 'error' }));
    }
  };

  const deleteRubric = async (rubricIndex) => {
    const rubric = categories[currentCategoryIndex].rubrics[rubricIndex];
    if (rubric.id) {
      try {
        await del(`/rubrics/${rubric.id}/`);
        dispatch(showSnackbar({ message: 'Rubric deleted', severity: 'success' }));
      } catch (error) {
        dispatch(showSnackbar({ message: 'Failed to delete rubric', severity: 'error' }));
        return;
      }
    }
    const updated = [...categories];
    updated[currentCategoryIndex].rubrics.splice(rubricIndex, 1);
    setCategories(updated);
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Rubrics Management</Typography>

      <List>
        {categories.map((cat, index) => (
          <ListItem key={cat.id} divider>
            <ListItemText
              primary={cat.name}
              secondary={`Required to Pass: ${cat.total_required_to_pass}`}
            />
            <IconButton onClick={() => handleOpenCategoryDialog(index)}>
              <EditIcon />
            </IconButton>
            <IconButton onClick={() => handleOpenRubricDialog(index)}>
              <AddIcon />
            </IconButton>
            <IconButton onClick={() => handleDeleteCategory(index)} color="error">
              <DeleteIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>

      <Box mt={4}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => handleOpenCategoryDialog()}>
          Add Category
        </Button>
      </Box>

      {/* Category Dialog */}
      <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)} fullWidth>
        <DialogTitle>{categoryForm.id ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Category Name"
            fullWidth
            margin="normal"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
          />
          <TextField
            label="Total Required to Pass"
            type="number"
            fullWidth
            margin="normal"
            value={categoryForm.total_required_to_pass}
            onChange={(e) => setCategoryForm({ ...categoryForm, total_required_to_pass: Number(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCategoryDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCategory}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Rubric Dialog */}
      <Dialog open={openRubricDialog} onClose={() => setOpenRubricDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>Edit Rubrics</DialogTitle>
        <DialogContent>
          {(categories[currentCategoryIndex]?.rubrics || []).map((rubric, rubricIndex) => (
            <Box key={rubric.id || rubricIndex} mt={2} p={2} border={1} borderRadius={2}>
              <TextField
                label="Rubric Name"
                fullWidth
                margin="normal"
                value={rubric.name}
                onChange={(e) => handleRubricChange(rubricIndex, 'name', e.target.value)}
                onBlur={() => saveRubric(rubric)}
              />
              <TextField
                label="Marking Instructions"
                fullWidth
                margin="normal"
                value={rubric.marking_instructions}
                onChange={(e) => handleRubricChange(rubricIndex, 'marking_instructions', e.target.value)}
                onBlur={() => saveRubric(rubric)}
              />
              <Box mt={1} textAlign="right">
                <IconButton onClick={() => deleteRubric(rubricIndex)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Divider sx={{ my: 2 }} />
            </Box>
          ))}
          <Button onClick={addRubric} startIcon={<AddIcon />} variant="outlined" sx={{ mt: 2 }}>
            Add Rubric
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRubricDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RubricsHome;
