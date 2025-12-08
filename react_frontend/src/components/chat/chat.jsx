import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChatWindow from './chat_window';
import { get } from '../../services/apiService';
import { useDispatch } from 'react-redux';
import { showSnackbar } from '../../features/snackbarSlice';

const ChatPage = () => {
  const dispatch_global = useDispatch();
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [activities, setActivities] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const activitiesRes = await get('/activities');
      const charactersRes = await get('/scenarios');
      setActivities(activitiesRes.data);
      setCharacters(charactersRes.data);
    } catch (error) {
      dispatch_global(showSnackbar({ message: 'Failed to load data', severity: 'error' }));
    }
  }, [dispatch_global]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActivitySelect = (activity) => {
    if (isConversationActive) {
      dispatch_global(
        showSnackbar({
          message: 'Please end your current conversation before selecting a new activity.',
          severity: 'warning',
        })
      );
      return;
    }

    const character = characters.find(c => c.id === activity.character_id);

    setSelectedActivity({
      ...activity,
      character_name: character?.scenario_text || 'Unknown Character',
      character_role: character?.role || 'Unknown',
    });
    setSelectedCharacter({
      ...character
    });
    setIsConversationActive(true);
  };

  const handleConversationEnd = () => {
    setIsConversationActive(false);
    setSelectedActivity(null);
    setSelectedCharacter(null);
  };

  const togglePanel = () => {
    setIsPanelCollapsed(!isPanelCollapsed);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 64px)',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Left Panel - Activities */}
      <Box
        sx={{
          width: isPanelCollapsed ? 0 : { xs: '100%', sm: '250px', md: '280px', lg: '300px' },
          minWidth: isPanelCollapsed ? 0 : { xs: 0, sm: '250px', md: '280px', lg: '300px' },
          maxWidth: isPanelCollapsed ? 0 : { xs: '100%', sm: '250px', md: '280px', lg: '300px' },
          height: '100%',
          bgcolor: '#fff',
          borderRight: isPanelCollapsed ? 'none' : '1px solid #ddd',
          transition: 'all 0.3s ease-in-out',
          overflow: 'hidden',
          position: { xs: 'absolute', sm: 'relative' },
          zIndex: { xs: 999, sm: 1 },
          boxShadow: { xs: isPanelCollapsed ? 'none' : 3, sm: 'none' },
        }}
      >
        {!isPanelCollapsed && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #ddd', flexShrink: 0 }}>
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                Activities
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              {activities.map((activity) => (
                <Box
                  key={activity.id}
                  onClick={() => handleActivitySelect(activity)}
                  sx={{
                    p: 2,
                    borderBottom: '1px solid #eee',
                    cursor: isConversationActive ? 'not-allowed' : 'pointer',
                    backgroundColor: selectedActivity?.id === activity.id ? '#e3f2fd' : 'transparent',
                    opacity: isConversationActive ? 0.5 : 1,
                    '&:hover': {
                      backgroundColor: isConversationActive ? 'transparent' : '#f5f5f5'
                    },
                    pointerEvents: isConversationActive ? 'none' : 'auto',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontSize: { xs: '0.875rem', md: '0.9375rem' },
                      fontWeight: 500,
                      mb: 0.5,
                      wordBreak: 'break-word',
                    }}
                  >
                    {activity.pre_brief}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: { xs: '0.7rem', md: '0.75rem' },
                      color: 'text.secondary'
                    }}
                  >
                    ID: {activity.character_id}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Toggle Button */}
      <IconButton
        onClick={togglePanel}
        sx={{
          position: 'absolute',
          left: isPanelCollapsed ? 8 : { xs: 8, sm: 242, md: 272, lg: 292 },
          top: 16,
          zIndex: 1100,
          bgcolor: '#1976d2',
          color: 'white',
          width: { xs: 36, md: 40 },
          height: { xs: 36, md: 40 },
          '&:hover': {
            bgcolor: '#1565c0',
          },
          boxShadow: 2,
          transition: 'left 0.3s ease-in-out',
        }}
      >
        {isPanelCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </IconButton>

      {/* Right Panel - Chat */}
      <Box
        sx={{
          flexGrow: 1,
          height: '100%',
          width: {
            xs: '100%',
            sm: isPanelCollapsed ? '100%' : 'calc(100% - 250px)',
            md: isPanelCollapsed ? '100%' : 'calc(100% - 280px)',
            lg: isPanelCollapsed ? '100%' : 'calc(100% - 300px)',
          },
          overflow: 'hidden',
          bgcolor: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {selectedActivity && selectedCharacter ? (
          <ChatWindow
            selectedAssistantID={selectedCharacter.id}
            scenarioName={selectedCharacter.scenario_text}
            scenarioRole={selectedCharacter.role}
            selectedActivityId={selectedActivity.id}
            onConversationEnd={handleConversationEnd}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 3,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: '1rem', md: '1.25rem' },
                color: 'text.secondary',
                textAlign: 'center',
              }}
            >
              Select an activity to begin chatting
            </Typography>
          </Box>
        )}
      </Box>

      {/* Overlay for mobile when panel is open */}
      {!isPanelCollapsed && (
        <Box
          onClick={togglePanel}
          sx={{
            display: { xs: 'block', sm: 'none' },
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998,
          }}
        />
      )}
    </Box>
  );
};

export default ChatPage;
