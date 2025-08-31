import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import './HomeDefault.css';
import { useSelector } from 'react-redux';

const HomeDefault = () => {
  const navigate = useNavigate();
  const role = useSelector((state) => state.auth.role);

  const isAdmin = role === 'admin';

  const handleManageClick = () => {
    if (isAdmin) {
      navigate('/home/manage');
    }
  };

  const handleActivities = () => {
    if (isAdmin) {
      navigate('/home/manage_activities');
    }
  };

  const handleRubrics = () => {
    if (isAdmin) {
      navigate('/home/rubrics');
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%', 
        gap: 2 
      }}
    >
      {/* Manage Assistants */}
      <Box className="home-default-box">
        <Card 
          className="home-default-card" 
          onClick={handleManageClick} 
          sx={{ opacity: isAdmin ? 1 : 0.6, cursor: isAdmin ? 'pointer' : 'not-allowed' }}
        >
          <CardContent>
            <SettingsIcon className="home-default-icon" />
            <Typography variant="h5" gutterBottom>
              Manage Assistants
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your assistants here.
            </Typography>
            {!isAdmin && (
              <Typography variant="caption" color="error">
                Admin only
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Manage Activities */}
      <Box className="home-default-box">
        <Card 
          className="home-default-card" 
          onClick={handleActivities} 
          sx={{ opacity: isAdmin ? 1 : 0.6, cursor: isAdmin ? 'pointer' : 'not-allowed' }}
        >
          <CardContent>
            <SettingsIcon className="home-default-icon" />
            <Typography variant="h5" gutterBottom>
              Manage Activities
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your activities here.
            </Typography>
            {!isAdmin && (
              <Typography variant="caption" color="error">
                Admin only
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Manage Rubrics */}
      <Box className="home-default-box">
        <Card 
          className="home-default-card" 
          onClick={handleRubrics} 
          sx={{ opacity: isAdmin ? 1 : 0.6, cursor: isAdmin ? 'pointer' : 'not-allowed' }}
        >
          <CardContent>
            <SettingsIcon className="home-default-icon" />
            <Typography variant="h5" gutterBottom>
              Manage Rubrics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your rubrics here.
            </Typography>
            {!isAdmin && (
              <Typography variant="caption" color="error">
                Admin only
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Talk to Assistants (always allowed) */}
      <Box className="home-default-box">
        <Card 
          className="home-default-card" 
          onClick={() => navigate('/home/talk')} 
          sx={{ cursor: 'pointer' }}
        >
          <CardContent>
            <ChatIcon className="home-default-icon" />
            <Typography variant="h5" gutterBottom>
              Talk to Assistants
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Talk to your assistants here.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default HomeDefault;
