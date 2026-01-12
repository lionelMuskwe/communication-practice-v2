import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Container,
  Grid,
  Fade,
  Chip,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ChatIcon from '@mui/icons-material/Chat';
import GradingIcon from '@mui/icons-material/Grading';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HistoryIcon from '@mui/icons-material/History';
import MessageIcon from '@mui/icons-material/Message';
import { useSelector } from 'react-redux';
import { getDashboardStats } from '../services/apiService';

const HomeDefault = () => {
  const navigate = useNavigate();
  const role = useSelector((state) => state.auth.role);
  const userName = useSelector((state) => state.auth.user);
  const isAdmin = role === 'admin';

  // Dashboard stats state
  const [stats, setStats] = useState({
    sessionsCompleted: 0,
    averageScore: 0,
    totalMessages: 0,
    loading: true,
    error: false,
  });

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch aggregated stats from backend
        const response = await getDashboardStats();

        if (response.status === 200) {
          const { sessions_completed, total_messages, average_score } = response.data;

          setStats({
            sessionsCompleted: sessions_completed,
            averageScore: average_score !== null ? Number(average_score).toFixed(1) : 'N/A',
            totalMessages: total_messages,
            loading: false,
            error: false,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats((prev) => ({
          ...prev,
          loading: false,
          error: true,
        }));
      }
    };

    fetchStats();
  }, []);

  // Quick Actions - Only Start Practice and Conversation History
  const quickActions = [
    {
      title: 'Start Practice',
      description: 'Begin your communication skills training with AI patients',
      icon: ChatIcon,
      color: '#0052CC',
      bgGradient: 'linear-gradient(135deg, #0052CC 20%, #0747A6 100%)',
      onClick: () => navigate('/home/talk'),
      featured: true,
    },
    {
      title: 'Conversation History',
      description: 'View and resume your past conversations',
      icon: HistoryIcon,
      color: '#36B37E',
      bgGradient: 'linear-gradient(135deg, #36B37E 20%, #00875A 100%)',
      onClick: () => navigate('/home/conversations'),
      featured: false,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        background: 'linear-gradient(180deg, #F4F5F7 0%, #FFFFFF 100%)',
        py: { xs: 3, sm: 4, md: 6 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2 } }}>
        {/* Welcome Section */}
        <Fade in timeout={800}>
          <Box sx={{ mb: { xs: 4, md: 6 } }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                mb: { xs: 2, md: 2 },
                gap: { xs: 2, sm: 0 }
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: '#172B4D',
                    mb: 1,
                    fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' }
                  }}
                >
                  Welcome back, {userName || 'Student'}! 👋
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#5E6C84',
                    fontWeight: 400,
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                  }}
                >
                  Continue your medical communication training
                </Typography>
              </Box>
              <Chip
                label={isAdmin ? 'Administrator' : 'Student'}
                sx={{
                  bgcolor: isAdmin ? '#FF5630' : '#0052CC',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.9rem' },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 2, sm: 2.5 },
                  alignSelf: { xs: 'flex-start', sm: 'center' }
                }}
              />
            </Box>

            {/* Quick Stats - Live Data */}
            <Grid container spacing={{ xs: 2, md: 2 }} sx={{ mt: { xs: 2, md: 3 } }}>
              <Grid item xs={12} sm={4}>
                <Card
                  elevation={0}
                  sx={{
                    background: 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)',
                    color: 'white',
                    borderRadius: { xs: 2, md: 3 },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        {stats.loading ? (
                          <CircularProgress size={32} sx={{ color: 'white', mb: 0.5 }} />
                        ) : (
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 700,
                              mb: 0.5,
                              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' }
                            }}
                          >
                            {stats.error ? '--' : stats.sessionsCompleted}
                          </Typography>
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            opacity: 0.9,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}
                        >
                          Sessions Completed
                        </Typography>
                      </Box>
                      <TrendingUpIcon sx={{ fontSize: { xs: 32, sm: 36, md: 40 }, opacity: 0.8 }} />
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
                    borderRadius: { xs: 2, md: 3 },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        {stats.loading ? (
                          <CircularProgress size={32} sx={{ color: 'white', mb: 0.5 }} />
                        ) : (
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 700,
                              mb: 0.5,
                              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' }
                            }}
                          >
                            {stats.error ? '--' : stats.averageScore}
                          </Typography>
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            opacity: 0.9,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}
                        >
                          Average Score
                        </Typography>
                      </Box>
                      <GradingIcon sx={{ fontSize: { xs: 32, sm: 36, md: 40 }, opacity: 0.8 }} />
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
                    borderRadius: { xs: 2, md: 3 },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        {stats.loading ? (
                          <CircularProgress size={32} sx={{ color: 'white', mb: 0.5 }} />
                        ) : (
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 700,
                              mb: 0.5,
                              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' }
                            }}
                          >
                            {stats.error ? '--' : stats.totalMessages}
                          </Typography>
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            opacity: 0.9,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}
                        >
                          Total Messages
                        </Typography>
                      </Box>
                      <MessageIcon sx={{ fontSize: { xs: 32, sm: 36, md: 40 }, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Fade>

        {/* Quick Actions - Only Start Practice and Conversation History */}
        <Box sx={{ mb: { xs: 2, md: 3 } }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: '#172B4D',
              mb: { xs: 2, md: 3 },
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.5rem' }
            }}
          >
            Quick Actions
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            {quickActions.map((card, index) => (
              <Grid item xs={12} sm={6} key={card.title}>
                <Fade in timeout={1000 + index * 200}>
                  <Card
                    onClick={card.onClick}
                    sx={{
                      height: '100%',
                      borderRadius: { xs: 3, md: 4 },
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '2px solid transparent',
                      position: 'relative',
                      overflow: 'visible',
                      '&:hover': {
                        transform: { xs: 'none', md: 'translateY(-8px)' },
                        boxShadow: `0 12px 24px rgba(0, 82, 204, 0.2)`,
                        borderColor: card.color,
                      },
                      '&:active': {
                        transform: { xs: 'scale(0.98)', md: 'translateY(-8px) scale(0.98)' },
                      },
                    }}
                  >
                    {card.featured && (
                      <Chip
                        label="Popular"
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: -10,
                          right: { xs: 12, md: 16 },
                          bgcolor: '#FF5630',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: { xs: '0.625rem', md: '0.7rem' },
                          height: { xs: 20, md: 24 },
                        }}
                      />
                    )}
                    <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                      <Avatar
                        sx={{
                          width: { xs: 56, sm: 60, md: 64 },
                          height: { xs: 56, sm: 60, md: 64 },
                          background: card.bgGradient,
                          mb: 2,
                        }}
                      >
                        <card.icon sx={{ fontSize: { xs: 28, sm: 30, md: 32 } }} />
                      </Avatar>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: '#172B4D',
                          mb: 1,
                          fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' }
                        }}
                      >
                        {card.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#5E6C84',
                          lineHeight: 1.6,
                          fontSize: { xs: '0.8125rem', sm: '0.875rem' }
                        }}
                      >
                        {card.description}
                      </Typography>
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
              mt: { xs: 3, md: 4 },
              background: 'linear-gradient(135deg, #E6FCFF 0%, #F4F5F7 100%)',
              border: '1px solid #B3D4FF',
              borderRadius: { xs: 2, md: 3 },
              p: { xs: 2, sm: 2.5, md: 3 },
            }}
          >
            <Grid container spacing={{ xs: 1.5, md: 2 }} alignItems="center">
              <Grid item sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Avatar
                  sx={{
                    width: { sm: 48, md: 56 },
                    height: { sm: 48, md: 56 },
                    bgcolor: '#0052CC',
                  }}
                >
                  <TrendingUpIcon sx={{ fontSize: { sm: 24, md: 28 } }} />
                </Avatar>
              </Grid>
              <Grid item xs>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: '#172B4D',
                    mb: 0.5,
                    fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' }
                  }}
                >
                  Keep up the great work!
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#5E6C84',
                    fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                    lineHeight: 1.6
                  }}
                >
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
