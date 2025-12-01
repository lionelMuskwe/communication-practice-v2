import React from 'react';
import { Box, Card, CardContent, Typography, Container, Grid, Fade, Chip, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GradingIcon from '@mui/icons-material/Grading';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import { useSelector } from 'react-redux';

const HomeDefault = () => {
  const navigate = useNavigate();
  const role = useSelector((state) => state.auth.role);
  const userName = useSelector((state) => state.auth.user);

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

  const dashboardCards = [
    {
      title: 'Start Practice',
      description: 'Begin your communication skills training with AI patients',
      icon: ChatIcon,
      color: '#0052CC',
      bgGradient: 'linear-gradient(135deg, #0052CC 20%, #0747A6 100%)',
      onClick: () => navigate('/home/talk'),
      enabled: true,
      featured: true,
    },
    {
      title: 'Manage Characters',
      description: 'Configure patient personas and scenarios',
      icon: PeopleIcon,
      color: '#00B8D9',
      bgGradient: 'linear-gradient(135deg, #00B8D9 20%, #0052CC 100%)',
      onClick: handleManageClick,
      enabled: isAdmin,
      adminOnly: true,
    },
    {
      title: 'Manage Activities',
      description: 'Create and organize practice activities',
      icon: AssignmentIcon,
      color: '#6554C0',
      bgGradient: 'linear-gradient(135deg, #6554C0 20%, #5243AA 100%)',
      onClick: handleActivities,
      enabled: isAdmin,
      adminOnly: true,
    },
    {
      title: 'Manage Rubrics',
      description: 'Define assessment criteria and scoring',
      icon: GradingIcon,
      color: '#FF5630',
      bgGradient: 'linear-gradient(135deg, #FF5630 20%, #DE350B 100%)',
      onClick: handleRubrics,
      enabled: isAdmin,
      adminOnly: true,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        background: 'linear-gradient(180deg, #F4F5F7 0%, #FFFFFF 100%)',
        py: 6,
      }}
    >
      <Container maxWidth="lg">
        {/* Welcome Section */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: '#172B4D',
                    mb: 1,
                  }}
                >
                  Welcome back, {userName || 'Student'}! 👋
                </Typography>
                <Typography variant="h6" sx={{ color: '#5E6C84', fontWeight: 400 }}>
                  Continue your medical communication training
                </Typography>
              </Box>
              <Chip
                label={isAdmin ? 'Administrator' : 'Student'}
                sx={{
                  bgcolor: isAdmin ? '#FF5630' : '#0052CC',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  px: 2,
                  py: 2.5,
                }}
              />
            </Box>

            {/* Quick Stats */}
            <Grid container spacing={2} sx={{ mt: 3 }}>
              <Grid item xs={12} sm={4}>
                <Card
                  elevation={0}
                  sx={{
                    background: 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)',
                    color: 'white',
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                          12
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Sessions Completed
                        </Typography>
                      </Box>
                      <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card
                  elevation={0}
                  sx={{
                    background: 'linear-gradient(135deg, #00B8D9 0%, #0052CC 100%)',
                    color: 'white',
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                          8.5
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Average Score
                        </Typography>
                      </Box>
                      <GradingIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card
                  elevation={0}
                  sx={{
                    background: 'linear-gradient(135deg, #FF5630 0%, #DE350B 100%)',
                    color: 'white',
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                          24
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Hours Practiced
                        </Typography>
                      </Box>
                      <AssignmentIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Fade>

        {/* Action Cards */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#172B4D', mb: 3 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={3}>
            {dashboardCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={3} key={card.title}>
                <Fade in timeout={1000 + index * 200}>
                  <Card
                    onClick={card.enabled ? card.onClick : undefined}
                    sx={{
                      height: '100%',
                      borderRadius: 4,
                      cursor: card.enabled ? 'pointer' : 'not-allowed',
                      opacity: card.enabled ? 1 : 0.5,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '2px solid transparent',
                      position: 'relative',
                      overflow: 'visible',
                      '&:hover': card.enabled
                        ? {
                            transform: 'translateY(-8px)',
                            boxShadow: `0 12px 24px rgba(0, 82, 204, 0.2)`,
                            borderColor: card.color,
                          }
                        : {},
                    }}
                  >
                    {card.featured && (
                      <Chip
                        label="Popular"
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: -10,
                          right: 16,
                          bgcolor: '#FF5630',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    )}
                    <CardContent sx={{ p: 3 }}>
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          background: card.bgGradient,
                          mb: 2,
                        }}
                      >
                        <card.icon sx={{ fontSize: 32 }} />
                      </Avatar>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: '#172B4D',
                          mb: 1,
                        }}
                      >
                        {card.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#5E6C84',
                          lineHeight: 1.6,
                        }}
                      >
                        {card.description}
                      </Typography>
                      {card.adminOnly && !isAdmin && (
                        <Chip
                          label="Admin Only"
                          size="small"
                          sx={{
                            mt: 2,
                            bgcolor: '#FFEBE6',
                            color: '#DE350B',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Info Banner */}
        <Fade in timeout={1600}>
          <Card
            elevation={0}
            sx={{
              mt: 4,
              background: 'linear-gradient(135deg, #E6FCFF 0%, #F4F5F7 100%)',
              border: '1px solid #B3D4FF',
              borderRadius: 3,
              p: 3,
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: '#0052CC',
                  }}
                >
                  <TrendingUpIcon sx={{ fontSize: 28 }} />
                </Avatar>
              </Grid>
              <Grid item xs>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#172B4D', mb: 0.5 }}>
                  Keep up the great work!
                </Typography>
                <Typography variant="body2" sx={{ color: '#5E6C84' }}>
                  You're making excellent progress in developing your communication skills. Practice
                  regularly to maintain momentum.
                </Typography>
              </Grid>
            </Grid>
          </Card>
        </Fade>
      </Container>
    </Box>
  );
};

export default HomeDefault;
