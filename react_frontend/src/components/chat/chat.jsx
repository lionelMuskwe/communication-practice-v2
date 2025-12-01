import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
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

    const character = characters.find(c => c.id === activity.character_id);
    
    console.log(character)
    setSelectedActivity({
      ...activity,
      character_name: character?.scenario_text || 'Unknown Character',
      character_role: character?.role || 'Unknown',
    });
    setSelectedCharacter({
      ...character
    });
  };

  return (
    <Box sx={{ display: 'flex', height: '90vh', width: '100%', bgcolor: '#e5ddd5', flexDirection: 'row' }}>
      <Box sx={{
        width: '30vw',
        bgcolor: '#ffffff',
        borderRight: '1px solid #ddd',
        overflowY: 'auto',
      }}>
        <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid #ddd' }}>
          Activities
        </Typography>
        {activities.map((activity) => (
          <Box
            key={activity.id}
            onClick={() => handleActivitySelect(activity)}
            sx={{
              p: 2,
              borderBottom: '1px solid #eee',
              cursor: 'pointer',
              backgroundColor: selectedActivity?.id === activity.id ? '#f5f5f5' : 'transparent',
              '&:hover': { backgroundColor: '#f0f0f0' }
            }}
          >
            <Typography variant="subtitle1">{activity.pre_brief}</Typography>
            <Typography variant="caption">Character ID: {activity.character_id}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '70vw' }}>
        {selectedActivity ? (
          <ChatWindow
            selectedAssistantID={selectedCharacter.id}
            scenarioName={selectedCharacter.scenario_text}
            scenarioRole={selectedCharacter.role}
            threadID={selectedCharacter.openid}
            selectedActivityId={selectedActivity.id}
          />
        ) : (
          <Box sx={{ m: 'auto', textAlign: 'center' }}>
            <Typography variant="h6">Select an activity to begin the chat</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatPage;
