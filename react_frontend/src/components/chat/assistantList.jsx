import React, { useState } from 'react';
import { List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, TextField, Box } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

const AssistantList = ({selectedAssistantId, assistants, onAssistantSelected }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Filter assistants based on the search term using scenario_text
  const filteredAssistants = assistants.filter((assistant) =>
    assistant.scenario_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
      <TextField
        label="Search"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={handleSearchChange}
        sx={{ mb: 2 }}
      />
      <List>
        {filteredAssistants.map((assistant) => (
          <React.Fragment key={assistant.id}>
            <ListItem button onClick={() => onAssistantSelected(assistant.id,assistant.scenario_text, assistant.role)}
              sx={{
                bgcolor: selectedAssistantId === assistant.id ? '#E3F2FD' : 'transparent',
                '&:hover': {
                  bgcolor: selectedAssistantId === assistant.id ? '#BBDEFB' : '#F5F5F5',
                },
              }}>
              <ListItemAvatar>
                <Avatar alt="User Avatar" src={`${process.env.PUBLIC_URL}/avatars/${assistant.role}.webp`}>
                  <PersonIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={assistant.scenario_text} />
            </ListItem>
            <Divider variant="inset" component="li" />
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default AssistantList;
