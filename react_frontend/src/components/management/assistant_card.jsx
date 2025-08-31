import React from 'react';
import { Card, CardContent, Typography, IconButton, Switch, Box } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import './assistant_card.css';

const AssistantCard = ({ id, role, tagline, description, enabled, onEdit, onDelete, onToggle }) => {
  const truncateText = (text, length) => {
    if (text.length > length) {
      return text.substring(0, length) + '...';
    }
    return text;
  };

  return (
    <Card className="assistant-card">
      
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          {tagline}
        </Typography>
        <Typography variant="body2" className="assistant-card-description">
          {truncateText(description, 100)}
        </Typography>
      </CardContent>
      <Box className="assistant-card-content">
        <Box>
          <IconButton onClick={() => onEdit(id)}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => onDelete(id)}>
            <DeleteIcon />
          </IconButton>
        </Box>
        <Switch checked={enabled} onChange={() => onToggle(id)} />
      </Box>
    </Card>
  );
};

export default AssistantCard;
