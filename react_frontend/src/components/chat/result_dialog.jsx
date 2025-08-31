import React from 'react';
import {
  Paper,
  Grid,
  Box,
  Divider,
  Typography,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const ChatResultsPanel = ({ evaluations = [], messages = [] }) => {
  return (
    <Box sx={{ padding: 2 }}>
      {/* Conversation Panel */}
      <Typography variant="h6" gutterBottom>
        Conversation History
      </Typography>
      <Paper variant="outlined" sx={{ maxHeight: '300px', overflowY: 'auto', mb: 3 }}>
        <List>
          {messages.slice().reverse().map((msg, idx) => (
            <ListItem key={idx}>
              <Grid container justifyContent={msg.role === 'user' ? 'flex-end' : 'flex-start'}>
                <Grid item xs={12} sm={msg.role === 'user' ? 6 : 8}>
                  <Box
                    sx={{
                      bgcolor: msg.role === 'user' ? '#E1F5FE' : '#F5F5F5',
                      borderRadius: 2,
                      p: 1.5,
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                      boxShadow: 1,
                    }}
                  >
                    <ListItemText
                      primary={msg.message}
                      secondary={new Date(msg.created_at).toLocaleTimeString()}
                    />
                  </Box>
                </Grid>
              </Grid>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* Rubric Evaluation Section */}
      <Typography variant="h6" gutterBottom>
        GPT Rubric Evaluation
      </Typography>
      <Grid container spacing={2}>
        {evaluations.map((category, index) => (
          <Grid item xs={12} key={index}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {category.category}
                </Typography>
                <Chip
                  label={category.passed ? 'Passed' : 'Failed'}
                  color={category.passed ? 'success' : 'error'}
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {`Passed ${category.passed_count} out of ${category.required_to_pass} required`}
              </Typography>
              {category.subcategories.map((subcat, subIndex) => (
                <Accordion key={subIndex}>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`panel${index}-${subIndex}-content`}
                    id={`panel${index}-${subIndex}-header`}
                  >
                    <Typography sx={{ fontWeight: 500 }}>
                      {subcat.question}
                    </Typography>
                    <Chip
                      label={subcat.passed ? 'Pass' : 'Fail'}
                      color={subcat.passed ? 'success' : 'error'}
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      <strong>Instruction:</strong> {subcat.instruction}
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                      {subcat.response}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ChatResultsPanel;
