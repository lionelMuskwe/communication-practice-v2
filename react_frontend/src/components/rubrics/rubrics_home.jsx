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
  Paper,
  Chip,
  Tooltip,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GradingIcon from '@mui/icons-material/Grading';
import CategoryIcon from '@mui/icons-material/Category';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import RuleIcon from '@mui/icons-material/Rule';
import { get, post, del } from '../../services/apiService';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../../features/snackbarSlice';
import { commonStyles } from '../../theme/managementTheme';

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
    <Box sx={{ ...commonStyles.pageContainer, minHeight: 'auto' }}>
      {/* Page Header */}
      <Box sx={commonStyles.pageHeader}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            Rubrics Management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Create and manage evaluation categories and rubrics for assessments
          </Typography>
        </Box>
        <Tooltip title="Add New Category" arrow>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOpenCategoryDialog()}
            startIcon={<AddIcon />}
            sx={commonStyles.primaryButton}
          >
            Add Category
          </Button>
        </Tooltip>
      </Box>

      {/* Categories Grid */}
      <Grid container spacing={3}>
        {categories.map((cat, index) => (
          <Grid item xs={12} md={6} key={cat.id}>
            <Paper elevation={0} sx={{ ...commonStyles.paperCard, height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Category Header */}
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
                  <CategoryIcon sx={{ color: 'white' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                    {cat.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssignmentTurnedInIcon fontSize="small" sx={{ color: 'success.main' }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Pass Requirement: <strong>{cat.total_required_to_pass}</strong> rubrics
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Rubrics Count */}
              <Paper elevation={0} sx={{ ...commonStyles.paperElevated, mb: 2, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GradingIcon fontSize="small" sx={{ color: 'primary.main' }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Total Rubrics:
                  </Typography>
                  <Chip
                    label={cat.rubrics?.length || 0}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Paper>

              {/* Action Buttons */}
              <Box sx={{ ...commonStyles.actionButtons, pt: 2, borderTop: '1px solid #e0e0e0', mt: 'auto' }}>
                <Tooltip title="Edit Category" arrow>
                  <IconButton
                    onClick={() => handleOpenCategoryDialog(index)}
                    color="primary"
                    size="small"
                    sx={commonStyles.iconButton}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Manage Rubrics" arrow>
                  <IconButton
                    onClick={() => handleOpenRubricDialog(index)}
                    color="secondary"
                    size="small"
                    sx={commonStyles.iconButton}
                  >
                    <GradingIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Category" arrow>
                  <IconButton
                    onClick={() => handleDeleteCategory(index)}
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
      {categories.length === 0 && (
        <Paper elevation={0} sx={{ ...commonStyles.paperCard, textAlign: 'center', py: 8 }}>
          <CategoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
            No Categories Yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled', mb: 3 }}>
            Create your first category to start organizing rubrics
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOpenCategoryDialog()}
            startIcon={<AddIcon />}
            sx={commonStyles.primaryButton}
          >
            Add Category
          </Button>
        </Paper>
      )}

      {/* Category Dialog */}
      <Dialog
        open={openCategoryDialog}
        onClose={() => setOpenCategoryDialog(false)}
        fullWidth
        maxWidth="sm"
        sx={commonStyles.modernDialog}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {categoryForm.id ? 'Edit Category' : 'Add New Category'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {categoryForm.id ? 'Update category details' : 'Create a new evaluation category'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Paper elevation={0} sx={{ ...commonStyles.paperElevated, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CategoryIcon fontSize="small" />
              Category Information
            </Typography>
            <TextField
              label="Category Name"
              fullWidth
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              sx={{ ...commonStyles.formField, mb: 2 }}
              placeholder="e.g., Communication Skills"
            />
            <TextField
              label="Total Required to Pass"
              type="number"
              fullWidth
              value={categoryForm.total_required_to_pass}
              onChange={(e) => setCategoryForm({ ...categoryForm, total_required_to_pass: Number(e.target.value) })}
              sx={commonStyles.formField}
              helperText="Number of rubrics required to pass this category"
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Paper>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button
            onClick={() => setOpenCategoryDialog(false)}
            color="inherit"
            sx={commonStyles.secondaryButton}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveCategory}
            sx={commonStyles.primaryButton}
          >
            {categoryForm.id ? 'Update Category' : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rubric Dialog */}
      <Dialog
        open={openRubricDialog}
        onClose={() => setOpenRubricDialog(false)}
        fullWidth
        maxWidth="md"
        sx={commonStyles.modernDialog}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <GradingIcon />
            Manage Rubrics
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {categories[currentCategoryIndex]?.name && `Category: ${categories[currentCategoryIndex].name}`}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {(categories[currentCategoryIndex]?.rubrics || []).length === 0 ? (
            <Paper elevation={0} sx={{ ...commonStyles.paperCard, textAlign: 'center', py: 6 }}>
              <RuleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
                No rubrics in this category yet
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                Add your first rubric to get started
              </Typography>
            </Paper>
          ) : (
            (categories[currentCategoryIndex]?.rubrics || []).map((rubric, rubricIndex) => (
              <Paper
                key={rubric.id || rubricIndex}
                elevation={0}
                sx={{ ...commonStyles.paperCard, mb: 2, position: 'relative' }}
              >
                {/* Rubric Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{
                    backgroundColor: 'secondary.light',
                    borderRadius: 1.5,
                    p: 1,
                    mr: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <RuleIcon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Rubric {rubricIndex + 1}
                  </Typography>
                  <Box sx={{ ml: 'auto' }}>
                    <Tooltip title="Delete Rubric" arrow>
                      <IconButton
                        onClick={() => deleteRubric(rubricIndex)}
                        color="error"
                        size="small"
                        sx={commonStyles.iconButton}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Rubric Fields */}
                <Box sx={{ ...commonStyles.paperElevated, p: 2 }}>
                  <TextField
                    label="Rubric Name"
                    fullWidth
                    value={rubric.name}
                    onChange={(e) => handleRubricChange(rubricIndex, 'name', e.target.value)}
                    onBlur={() => saveRubric(rubric)}
                    sx={{ ...commonStyles.formField, mb: 2 }}
                    placeholder="e.g., Eye Contact"
                  />
                  <TextField
                    label="Marking Instructions"
                    fullWidth
                    multiline
                    rows={3}
                    value={rubric.marking_instructions}
                    onChange={(e) => handleRubricChange(rubricIndex, 'marking_instructions', e.target.value)}
                    onBlur={() => saveRubric(rubric)}
                    sx={commonStyles.formField}
                    placeholder="Describe how to evaluate this rubric..."
                  />
                </Box>
              </Paper>
            ))
          )}

          {/* Add Rubric Button */}
          <Button
            onClick={addRubric}
            startIcon={<AddIcon />}
            variant="outlined"
            fullWidth
            sx={{
              mt: 2,
              py: 1.5,
              borderRadius: 2,
              borderStyle: 'dashed',
              borderWidth: 2,
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                borderStyle: 'dashed',
                borderWidth: 2,
              }
            }}
          >
            Add New Rubric
          </Button>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button
            onClick={() => setOpenRubricDialog(false)}
            variant="contained"
            color="primary"
            sx={commonStyles.primaryButton}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RubricsHome;
