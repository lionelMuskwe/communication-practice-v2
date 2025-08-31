import React, { useReducer, useState, useEffect } from 'react';
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
  Chip,
  Switch,
  Typography,
  Tooltip,
  Avatar,
  Tabs, 
  Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import CancelIcon from '@mui/icons-material/Cancel';
import { DataGrid } from '@mui/x-data-grid';
import { post, put, get, del } from '../../services/apiService'; // Ensure the correct path
import { showSnackbar } from '../../features/snackbarSlice';
import { useDispatch } from 'react-redux';
import './management.css'; // Ensure the CSS file path is correct



 
const initialState = {
  id: '',
  openid: '',
  scenario_text: '',
  role: '',
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
      filterable: false, // Disable filtering (search)
      resizable: false,
      flex: 1, // 10% relative share
      renderCell: (params) => (
        <>
          <IconButton onClick={() => handleEdit(params.row.id)}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row.id)}>
            <DeleteIcon />
          </IconButton>
         
        </>
      ),
    }
  ];
  
  const [state, dispatch] = useReducer(reducer, initialState);
  const [open, setOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newTag, setNewTag] = useState('');
  const dispatch_global = useDispatch(); // Use Redux dispatch
  const [assistants, setAssistants] = useState([]);

  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchAssistants = async () => {
    try {
      const response = await get('/scenarios');
      setAssistants(response.data);
    } catch (error) {
      console.error('Error fetching assistants:', error);
      dispatch_global(
        showSnackbar({ message: 'Failed to fetch assistants', severity: 'error' })
      );
    }
  };

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

  const handleToggle = async (id) => {
    const assistant = assistants.find((a) => a.id === id);
    if (assistant) {
      const endpoint = assistant.enable ? `/scenarios/${id}/disable` : `/scenarios/${id}/enable`;
      try {
        await put(endpoint);
        dispatch_global(
          showSnackbar({ message: 'Assistant updated successfully', severity: 'success' })
        );
        fetchAssistants(); // Fetch updated list of assistants
      } catch (error) {
        console.error('Error toggling assistant:', error);
        dispatch_global(
          showSnackbar({ message: 'Failed to update assistant', severity: 'error' })
        );
      }
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

  const handleAddQuestion = (e) => {
    if (e.key === 'Enter' && newQuestion.trim() !== '') {
      dispatch({ type: 'ADD_RUBRIC', payload: newQuestion });
      setNewQuestion('');
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && newTag.trim() !== '') {
      dispatch({ type: 'ADD_TAG', payload: newTag });
      setNewTag('');
    }
  };

  const handleSubmit = async () => {
    const payload = {
      id: state.id,
      scenario_text: state.scenario_text,
      role: state.role,
      additional_instructions: state.additional_instructions,
      communication_preferences: state.communication_preferences,
      enable: state.enable,
      rubrics: state.rubrics,
      tags: state.tags,
    };

    try {
      if (state.id) {
        await put(`/scenarios/${state.id}`, payload);
      } else {
        await post('/scenarios', payload);
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
    <Box sx={{ padding: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Characters </Typography>
        <Tooltip title="Add Assistant">
          <IconButton color="primary" onClick={handleClickOpen}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ height: '300px', width: '100%' }}>
      <DataGrid
        autoHeight
        rows={assistants}
        columns={columns} // Pass the columns here
        pageSize={10}
        rowsPerPageOptions={[5, 10, 20]}
        getRowId={(row) => row.id}
        disableColumnMenu 
        disableSelectionOnClick
      />
    </Box>
      {/* Dialog for adding/editing assistants */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{state?.id ? 'Edit Assistant' : 'Add Assistant'}</DialogTitle>
        <DialogContent>
            <Tabs
              value={tabIndex}
              onChange={(e, newValue) => setTabIndex(newValue)}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
              sx={{ mb: 2 }}
            >
              <Tab label="General" />
              <Tab label="Configuration" />
              <Tab label="Communication" />
            </Tabs>

            <form className="management-form">
            <TabPanel value={tabIndex} index={0}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Avatar</InputLabel>
                    <Select
                      value={state.role}
                      onChange={(e) => dispatch({ type: 'SET_ROLE', payload: e.target.value })}
                      label="Avatar"
                    >
                      {roles.map((role) => (
                        <MenuItem key={role} value={role}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              alt="User Avatar"
                              src={`${process.env.PUBLIC_URL}/avatars/${role}.webp`}
                            >
                              <PersonIcon />
                            </Avatar>
          
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
                  />
                </Box>
              </TabPanel>

              <TabPanel value={tabIndex} index={1}>
                <TextField
                  margin="dense"
                  label="Configuration"
                  type="text"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={4}
                  value={state.additional_instructions}
                  onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', payload: e.target.value })}
                />
              </TabPanel>

              <TabPanel value={tabIndex} index={2}>
                <TextField
                  margin="dense"
                  label="Communication Preferences"
                  type="text"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={4}
                  value={state.communication_preferences}
                  onChange={(e) => dispatch({ type: 'SET_Communication_Preferences', payload: e.target.value })}
                />
              </TabPanel>
            </form>
          </DialogContent>


        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Management;
