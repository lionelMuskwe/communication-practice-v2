import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import './HomeDefault.css'; // Import the CSS file
import { useSelector } from 'react-redux';

const HomeDefault = () => {
  const navigate = useNavigate();
  const role = useSelector((state) => state.auth.role); // Adjust according to your state structure
  
  const handleManageClick = () => {
    if (role === 'admin') {
      navigate('/home/manage');
    }
  };

  const handleActvities = () => {
    if (role === 'admin') {
      navigate('/home/manage_activities');
    }
  };

  const handleRubrics = () => {
    if (role === 'admin') {
      navigate('/home/rubrics');
    }
  };

  

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 2 }}>
      <Box className="home-default-box">
        <Card className="home-default-card" onClick={handleManageClick}>
          <CardContent>
            <SettingsIcon className="home-default-icon" />
            <Typography variant="h5" component="div" gutterBottom>
              Manage Assistants
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your assistants here.
            </Typography>
            {role !== 'admin' && (
              <Typography variant="caption" color="error">
                Admin only
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
      <Box className="home-default-box">
        <Card className="home-default-card" onClick={handleActvities} >
          <CardContent>
            <SettingsIcon className="home-default-icon" />
            <Typography variant="h5" component="div" gutterBottom>
              Manage Activities
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your Activities here.
            </Typography>
            {role !== 'admin' && (
              <Typography variant="caption" color="error">
                Admin only
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      <Box className="home-default-box">
        <Card className="home-default-card" onClick={handleRubrics} >
          <CardContent>
            <SettingsIcon className="home-default-icon" />
            <Typography variant="h5" component="div" gutterBottom>
              Manage Rubrics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your Rubrics here.
            </Typography>
            {role !== 'admin' && (
              <Typography variant="caption" color="error">
                Admin only
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      <Box className="home-default-box">
        <Card className="home-default-card" onClick={() => navigate('/home/talk')}>
          <CardContent>
            <ChatIcon className="home-default-icon" />
            <Typography variant="h5" component="div" gutterBottom>
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
