import React, { useReducer, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Tooltip,
  Avatar,
  Tabs,
  Tab,
  Paper,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import { DataGrid } from '@mui/x-data-grid';
import { post, put, get, del } from '../../services/apiService';
import { showSnackbar } from '../../features/snackbarSlice';
import { useDispatch } from 'react-redux';
import { commonStyles } from '../../theme/managementTheme';
import './management.css';




const initialState = {
  id: '',
  openid: '',
  scenario_text: '',
  role: '',
  voice: 'nova',
  additional_instructions: '',
  enable: true,
  communication_preferences: '',
  rubrics: [],
  tags: [],
};

const roles = [
  'Toddler',
  'Boy',
  'Girl',
  'Adult Man',
  'Adult Woman',
  'Elderly Man',
  'Elderly Woman',
]; // Add more roles as needed

const voices = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'nova', label: 'Nova' },
  { value: 'shimmer', label: 'Shimmer' },
];

const reducer = (state, action) => {
  switch (action.type) {
    case 'Set_All':
      return { ...state, ...action.payload };
    case 'SET_ID':
      return { ...state, id: action.payload };
    case 'SET_NAME':
      return { ...state, scenario_text: action.payload };
    case 'SET_ROLE':
      return { ...state, role: action.payload };
    case 'SET_VOICE':
      return { ...state, voice: action.payload };
    case 'SET_DESCRIPTION':
      return { ...state, additional_instructions: action.payload };
    case 'SET_Communication_Preferences':
        return { ...state, communication_preferences: action.payload };
    case 'SET_OPENID':
      return { ...state, openid: action.payload };
    case 'ADD_RUBRIC':
      return { ...state, rubrics: [...state.rubrics, action.payload] };
    case 'REMOVE_RUBRIC':
      return {
        ...state,
        rubrics: state.rubrics.filter((rubric) => rubric !== action.payload),
      };
    case 'ADD_TAG':
      return { ...state, tags: [...state.tags, action.payload] };
    case 'REMOVE_TAG':
      return {
        ...state,
        tags: state.tags.filter((tag) => tag !== action.payload),
      };
    case 'RESET_FORM':
      return { ...initialState, id: '' }; // Ensure a new id is generated each time the form is reset
    default:
      return state;
  }
};


// Helper TabPanel component

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const Management = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const columns = [
    {
      field: 'scenario_text',
      headerName: 'Scenrio Name',
      flex: 2, // 20% relative share
      filterable: true, // Enable filtering (search) only on this column
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar alt="User Avatar" src={`${process.env.PUBLIC_URL}/avatars/${params.row.role}.webp`}>
            <PersonIcon />
          </Avatar>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'additional_instructions',
      headerName: 'Instructions Given',
      flex: 4, // 60% relative share
      filterable: false, // Disable filtering (search)
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      resizable: false,
      flex: 1,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Box sx={{ ...commonStyles.actionButtons, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Tooltip title="Edit Character" arrow>
            <IconButton
              onClick={() => handleEdit(params.row.id)}
              color="primary"
              size="small"
              sx={commonStyles.iconButton}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Character" arrow>
            <IconButton
              onClick={() => handleDelete(params.row.id)}
              color="error"
              size="small"
              sx={commonStyles.iconButton}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    }
  ];

  const [state, dispatch] = useReducer(reducer, initialState);
  const [open, setOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newTag, setNewTag] = useState('');
  const dispatch_global = useDispatch(); // Use Redux dispatch
  const [assistants, setAssistants] = useState([]);

  const fetchAssistants = useCallback(async () => {
    try {
      const response = await get('/scenarios');
      setAssistants(response.data);
    } catch (error) {
      console.error('Error fetching assistants:', error);
      dispatch_global(
        showSnackbar({ message: 'Failed to fetch assistants', severity: 'error' })
      );
    }
  }, [dispatch_global]);

  useEffect(() => {
    fetchAssistants();
  }, [fetchAssistants]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleEdit = (id) => {
    const assistant = assistants.find((a) => a.id === id);
    if (assistant) {

      dispatch({ type: 'Set_All', payload: assistant });
      setOpen(true);
    }
  };

  const handleDelete = async (id) => {
    try {
      await del(`/scenarios/${id}`); // Perform a hard delete
      dispatch_global(
        showSnackbar({ message: 'Assistant deleted successfully', severity: 'success' })
      );
      fetchAssistants(); // Fetch updated list of assistants
    } catch (error) {
      console.error('Error deleting assistant:', error);
      dispatch_global(
        showSnackbar({ message: 'Failed to delete assistant', severity: 'error' })
      );
    }
  };

  const handleClose = () => {
    setOpen(false);
    setNewQuestion('');
    setNewTag('');
    dispatch({ type: 'RESET_FORM' });
  };

  const handleSubmit = async () => {
    const payload = {
      id: state.id,
      scenario_text: state.scenario_text,
      role: state.role,
      voice: state.voice,
      additional_instructions: state.additional_instructions,
      communication_preferences: state.communication_preferences,
      enable: state.enable,
      rubrics: state.rubrics,
      tags: state.tags,
    };

    try {
      if (state.id) {
        await put(`/scenarios/${state.id}/`, payload);
      } else {
        await post('/scenarios/', payload);
      }
      dispatch_global(showSnackbar({ message: 'Task done successfully', severity: 'success' }));
      handleClose();
      fetchAssistants(); // Fetch updated list of assistants
    } catch (error) {
      dispatch_global(
        showSnackbar({ message: 'Something went wrong, please try again', severity: 'error' })
      );
      console.error('Error submitting form:', error);
    }
  };

  return (
    <Box sx={{ ...commonStyles.pageContainer, minHeight: 'auto' }}>
      {/* Page Header */}
      <Box sx={commonStyles.pageHeader}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            Character Management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Create and manage AI characters for your communication scenarios
          </Typography>
        </Box>
        <Tooltip title="Add New Character" arrow>
          <Button
            variant="contained"
            color="primary"
            onClick={handleClickOpen}
            startIcon={<AddIcon />}
            sx={commonStyles.primaryButton}
          >
            Add Character
          </Button>
        </Tooltip>
      </Box>

      {/* DataGrid wrapped in Paper */}
      <Paper elevation={0} sx={commonStyles.dataGridContainer}>
        <DataGrid
          autoHeight
          rows={assistants}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[5, 10, 20]}
          getRowId={(row) => row.id}
          disableColumnMenu
          disableSelectionOnClick
          rowHeight={80}
          sx={{
            '& .MuiDataGrid-cell': {
              display: 'flex',
              alignItems: 'center',
              py: 2,
            },
            '& .MuiDataGrid-row': {
              minHeight: '80px !important',
            },
          }}
        />
      </Paper>
      {/* Modern Dialog for adding/editing assistants */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        sx={commonStyles.modernDialog}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {state?.id ? 'Edit Character' : 'Add New Character'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {state?.id ? 'Update character details and preferences' : 'Configure your new AI character'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Tabs
            value={tabIndex}
            onChange={(e, newValue) => setTabIndex(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
            sx={commonStyles.modernTabs}
          >
            <Tab icon={<PersonIcon />} iconPosition="start" label="General" />
            <Tab icon={<SettingsIcon />} iconPosition="start" label="Configuration" />
            <Tab icon={<ChatIcon />} iconPosition="start" label="Communication" />
          </Tabs>

          <Box sx={{ mt: 3 }}>
            <TabPanel value={tabIndex} index={0}>
              <Paper elevation={0} sx={{ ...commonStyles.paperElevated, mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                  Character Profile
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <FormControl fullWidth variant="outlined" sx={commonStyles.formField}>
                    <InputLabel>Avatar</InputLabel>
                    <Select
                      value={state.role}
                      onChange={(e) => dispatch({ type: 'SET_ROLE', payload: e.target.value })}
                      label="Avatar"
                    >
                      {roles.map((role) => (
                        <MenuItem key={role} value={role}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              alt={role}
                              src={`${process.env.PUBLIC_URL}/avatars/${role}.webp`}
                              sx={{ width: 32, height: 32 }}
                            >
                              <PersonIcon />
                            </Avatar>
                            <Typography>{role}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Character Name"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={state.scenario_text}
                    onChange={(e) => dispatch({ type: 'SET_NAME', payload: e.target.value })}
                    sx={commonStyles.formField}
                    placeholder="e.g., Dr. Emily Chen"
                  />
                </Box>
              </Paper>

              <Paper elevation={0} sx={commonStyles.paperElevated}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RecordVoiceOverIcon fontSize="small" />
                  Voice Settings
                </Typography>
                <FormControl fullWidth variant="outlined" sx={commonStyles.formField}>
                  <InputLabel>Voice</InputLabel>
                  <Select
                    value={state.voice || 'nova'}
                    onChange={(e) => dispatch({ type: 'SET_VOICE', payload: e.target.value })}
                    label="Voice"
                  >
                    {voices.map((voice) => (
                      <MenuItem key={voice.value} value={voice.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={voice.label} size="small" color="primary" variant="outlined" />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Paper>
            </TabPanel>

            <TabPanel value={tabIndex} index={1}>
              <Paper elevation={0} sx={commonStyles.paperElevated}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                  Character Instructions
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
                  Define the character's behavior, personality, and specific instructions
                </Typography>
                <TextField
                  label="Configuration"
                  type="text"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={8}
                  value={state.additional_instructions}
                  onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', payload: e.target.value })}
                  sx={commonStyles.formField}
                  placeholder="Enter character instructions, personality traits, and behavioral guidelines..."
                />
              </Paper>
            </TabPanel>

            <TabPanel value={tabIndex} index={2}>
              <Paper elevation={0} sx={commonStyles.paperElevated}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                  Communication Style
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
                  Specify how the character should communicate and interact
                </Typography>
                <TextField
                  label="Communication Preferences"
                  type="text"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={8}
                  value={state.communication_preferences}
                  onChange={(e) => dispatch({ type: 'SET_Communication_Preferences', payload: e.target.value })}
                  sx={commonStyles.formField}
                  placeholder="Define communication patterns, tone, formality level, and interaction style..."
                />
              </Paper>
            </TabPanel>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button
            onClick={handleClose}
            color="inherit"
            sx={commonStyles.secondaryButton}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            sx={commonStyles.primaryButton}
          >
            {state?.id ? 'Update Character' : 'Create Character'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Management;
