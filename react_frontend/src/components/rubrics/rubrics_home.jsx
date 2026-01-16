import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Tooltip,
  CircularProgress,
  Chip,
  IconButton,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DescriptionIcon from '@mui/icons-material/Description';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EastIcon from '@mui/icons-material/East';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HistoryIcon from '@mui/icons-material/History';
import { useNavigate } from 'react-router-dom';
import { getFrameworks, getTemplates, getPacks } from '../../services/apiService';
import { commonStyles } from '../../theme/managementTheme';

const RubricsHome = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    frameworks: 0,
    templates: 0,
    publishedTemplates: 0,
    packs: 0,
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [frameworksRes, templatesRes, packsRes] = await Promise.all([
        getFrameworks(),
        getTemplates(),
        getPacks(),
      ]);

      const templates = templatesRes.data || [];
      const publishedCount = templates.filter(t => t.status === 'published').length;

      setStats({
        frameworks: frameworksRes.data?.length || 0,
        templates: templates.length,
        publishedTemplates: publishedCount,
        packs: packsRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Failed to fetch rubric stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const workflowSteps = [
    {
      step: 1,
      title: 'Frameworks',
      action: 'Build',
      icon: AccountTreeIcon,
      color: '#1976d2',
      bgColor: '#e3f2fd',
      path: '/home/rubrics/frameworks',
      count: stats.frameworks,
      countLabel: 'frameworks',
      description: 'Define the criteria that assessors will evaluate. Organize criteria into sections within frameworks.',
      tooltip: 'Start here! Create frameworks with sections and criteria. These are the building blocks for all assessments. Each framework contains sections, and each section contains specific evaluation criteria.',
    },
    {
      step: 2,
      title: 'Templates',
      action: 'Assemble',
      icon: DescriptionIcon,
      color: '#00897b',
      bgColor: '#e0f2f1',
      path: '/home/rubrics/templates',
      count: stats.templates,
      countLabel: 'templates',
      extraStat: `${stats.publishedTemplates} published`,
      description: 'Select criteria from frameworks to create focused assessment checklists for specific scenarios.',
      tooltip: 'Pick and choose criteria from your frameworks to build templates. Templates must be published before they can be used in packs. You can create different templates for different assessment types (e.g., generic communication skills vs clinical content).',
    },
    {
      step: 3,
      title: 'Packs',
      action: 'Bundle',
      icon: Inventory2Icon,
      color: '#7b1fa2',
      bgColor: '#f3e5f5',
      path: '/home/rubrics/packs',
      count: stats.packs,
      countLabel: 'packs',
      description: 'Bundle published templates together. Packs are assigned to activities for student assessments.',
      tooltip: 'Combine multiple templates into packs. Only published templates can be added to packs. When you create an activity, you assign a pack to determine which criteria will be used for assessment.',
    },
  ];

  return (
    <Box sx={{ ...commonStyles.pageContainer, minHeight: 'auto' }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
          Rubrics Management
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Build and manage assessment criteria for evaluating student performance
        </Typography>
      </Box>

      {/* How It Works Section */}
      <Paper
        elevation={0}
        sx={{
          ...commonStyles.paperCard,
          mb: 4,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)',
          border: '1px solid #e0e0e0',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <InfoOutlinedIcon sx={{ color: 'primary.main' }} />
          How It Works
        </Typography>

        {/* Workflow Diagram */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: { xs: 2, md: 0 },
            mb: 2,
          }}
        >
          {workflowSteps.map((step, index) => (
            <React.Fragment key={step.step}>
              {/* Step Box */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: { xs: '100%', sm: 140, md: 160 },
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: step.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                    boxShadow: `0 4px 12px ${step.color}40`,
                  }}
                >
                  <step.icon sx={{ color: 'white', fontSize: 24 }} />
                </Box>
                <Chip
                  label={`Step ${step.step}`}
                  size="small"
                  sx={{
                    mb: 0.5,
                    backgroundColor: step.bgColor,
                    color: step.color,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {step.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  {step.action}
                </Typography>
              </Box>

              {/* Arrow between steps */}
              {index < workflowSteps.length - 1 && (
                <Box
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    alignItems: 'center',
                    px: 2,
                  }}
                >
                  <EastIcon sx={{ color: 'text.disabled', fontSize: 32 }} />
                </Box>
              )}
            </React.Fragment>
          ))}
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            textAlign: 'center',
            mt: 2,
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          Create criteria in <strong>Frameworks</strong>, assemble them into <strong>Templates</strong>,
          bundle templates into <strong>Packs</strong>, then assign packs to <strong>Activities</strong>.
        </Typography>
      </Paper>

      {/* Navigation Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {workflowSteps.map((step) => (
          <Grid item xs={12} md={4} key={step.step}>
            <Paper
              elevation={0}
              sx={{
                ...commonStyles.paperCard,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                border: `2px solid transparent`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px ${step.color}20`,
                  borderColor: step.color,
                },
              }}
              onClick={() => navigate(step.path)}
            >
              {/* Card Header */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Box
                  sx={{
                    backgroundColor: step.bgColor,
                    borderRadius: 2,
                    p: 1.5,
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <step.icon sx={{ color: step.color, fontSize: 28 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`Step ${step.step}`}
                      size="small"
                      sx={{
                        backgroundColor: step.bgColor,
                        color: step.color,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                    <Tooltip title={step.tooltip} arrow placement="top">
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                    {step.title}
                  </Typography>
                </Box>
              </Box>

              {/* Stats */}
              <Paper
                elevation={0}
                sx={{
                  backgroundColor: step.bgColor,
                  p: 2,
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                    <CircularProgress size={24} sx={{ color: step.color }} />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: step.color }}>
                      {step.count}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {step.countLabel}
                    </Typography>
                    {step.extraStat && (
                      <Chip
                        label={step.extraStat}
                        size="small"
                        sx={{ ml: 'auto', backgroundColor: 'white' }}
                      />
                    )}
                  </Box>
                )}
              </Paper>

              {/* Description */}
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  mb: 2,
                  flex: 1,
                  lineHeight: 1.6,
                }}
              >
                {step.description}
              </Typography>

              {/* Action Button */}
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(step.path);
                }}
                sx={{
                  backgroundColor: step.color,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1,
                  '&:hover': {
                    backgroundColor: step.color,
                    filter: 'brightness(0.9)',
                  },
                }}
              >
                Manage {step.title}
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Legacy System Link */}
      <Paper
        elevation={0}
        sx={{
          ...commonStyles.paperCard,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          backgroundColor: '#fafafa',
          border: '1px dashed #ccc',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              backgroundColor: '#f5f5f5',
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HistoryIcon sx={{ color: 'text.secondary' }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Legacy Rubrics (v1)
              </Typography>
              <Chip label="Legacy" size="small" color="warning" />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Access the original category-based rubric system
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          color="inherit"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/home/rubrics/legacy')}
          sx={{
            textTransform: 'none',
            borderColor: '#ccc',
            color: 'text.secondary',
            '&:hover': {
              borderColor: '#999',
              backgroundColor: '#f5f5f5',
            },
          }}
        >
          Open Legacy System
        </Button>
      </Paper>
    </Box>
  );
};

export default RubricsHome;
