import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../features/authSlice';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  InputAdornment,
  IconButton,
  Fade,
  Grid,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { post } from '../services/apiService';

const LoginPage = () => {
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Signup dialog states
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupValues, setSignupValues] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin'
  });
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);

  // Login form submit
 const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await post('/login/', { email, password });
      console.log('Login successful:', response.data);

      // Django JWT response: { token, refresh, role, name }
      const { token, refresh, role, name } = response.data;

      // Dispatch the login action with user data
      dispatch(login({ token, refresh, role, name }));

      // Navigate to the home page
      navigate('/home');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setErrorMessage('Invalid username or password.');
      } else {
        setErrorMessage('An error occurred during login. Please try again.');
      }
    }
  };
  // Signup field change
  const handleSignupChange = (e) => {
    setSignupValues({ ...signupValues, [e.target.name]: e.target.value });
  };

  // Signup submit
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');
    setSignupSuccess('');

    const { username, email, password, confirmPassword, role } = signupValues;

    if (!username || !email || !password || !confirmPassword) {
      setSignupError('Please fill in every field.');
      return;
    }

    if (password !== confirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    try {
      const res = await post('/create_users/', { username, email, password, confirmPassword, role});

      if (res.status === 201 || res.data?.message === 'User created') {
        setSignupSuccess('User created successfully. You may now login.');
        setSignupValues({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'admin'
        });
      } else {
        setSignupError(res.data?.message || 'Signup failed. Try again.');
      }
    } catch {
      setSignupError('An error occurred during signup. Please try again.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0052CC 0%, #0747A6 50%, #172B4D 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center">
          {/* Left Side - Branding */}
          <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Fade in timeout={1000}>
              <Box sx={{ color: 'white', pr: { md: 4 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <LocalHospitalIcon sx={{ fontSize: { xs: 50, md: 60 }, mr: 2, color: '#FF5630' }} />
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 700,
                      letterSpacing: '-0.5px',
                      fontSize: { xs: '2rem', md: '3rem' }
                    }}
                  >
                    MedComm
                  </Typography>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 600,
                    mb: 3,
                    lineHeight: 1.3,
                    fontSize: { xs: '1.75rem', md: '2.125rem' }
                  }}
                >
                  Master Clinical Communication Skills
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 4,
                    opacity: 0.9,
                    fontWeight: 300,
                    fontSize: { xs: '1rem', md: '1.25rem' }
                  }}
                >
                  An AI-powered platform designed to help medical students practice and perfect
                  patient communication through realistic simulations.
                </Typography>
                <Box sx={{ display: 'flex', gap: { xs: 3, md: 4 }, mt: 4, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 700,
                        color: '#FF5630',
                        fontSize: { xs: '2rem', md: '3rem' }
                      }}
                    >
                      500+
                    </Typography>
                    <Typography sx={{ opacity: 0.8, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                      Practice Scenarios
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 700,
                        color: '#FF5630',
                        fontSize: { xs: '2rem', md: '3rem' }
                      }}
                    >
                      95%
                    </Typography>
                    <Typography sx={{ opacity: 0.8, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                      Student Satisfaction
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Fade>
          </Grid>

          {/* Right Side - Login Form */}
          <Grid item xs={12} md={6}>
            <Fade in timeout={1200}>
              <Paper
                elevation={24}
                sx={{
                  p: { xs: 3, sm: 4, md: 5 },
                  borderRadius: { xs: 3, md: 4 },
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {/* Mobile-only branding */}
                <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', alignItems: 'center', mb: 3 }}>
                  <LocalHospitalIcon sx={{ fontSize: 40, mr: 1.5, color: '#FF5630' }} />
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#0052CC' }}>
                    MedComm
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', mb: { xs: 3, md: 4 } }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: '#172B4D',
                      mb: 1,
                      fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' }
                    }}
                  >
                    Welcome Back
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#5E6C84',
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    Sign in to continue your learning journey
                  </Typography>
                </Box>

                {(errorMessage || auth.error) && (
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {errorMessage || auth.error}
                  </Alert>
                )}

                {/* Login Form */}
                <Box component="form" onSubmit={handleSubmit}>
                  <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: '#0052CC' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': { borderColor: '#0052CC' },
                        '&.Mui-focused fieldset': { borderColor: '#0052CC', borderWidth: 2 },
                      },
                    }}
                  />
                  <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: '#0052CC' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: '#5E6C84' }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': { borderColor: '#0052CC' },
                        '&.Mui-focused fieldset': { borderColor: '#0052CC', borderWidth: 2 },
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{
                      mt: 4,
                      mb: 2,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)',
                      borderRadius: 2,
                      textTransform: 'none',
                      boxShadow: '0 4px 14px 0 rgba(0, 82, 204, 0.4)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #0747A6 0%, #0052CC 100%)',
                        boxShadow: '0 6px 20px 0 rgba(0, 82, 204, 0.6)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    Sign In
                  </Button>

                  <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      onClick={() => setSignupOpen(true)}
                      sx={{
                        color: '#0052CC',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        '&:hover': { color: '#0747A6', textDecoration: 'underline' },
                      }}
                    >
                      <PersonAddIcon fontSize="small" />
                      New here? Create an account
                    </Link>
                  </Box>
                </Box>

                <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #DFE1E6', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#5E6C84', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <LockIcon fontSize="small" />
                    Your data is encrypted and secure
                  </Typography>
                </Box>
              </Paper>
            </Fade>
          </Grid>
        </Grid>
      </Container>

      {/* Signup Dialog */}
      <Dialog
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: { xs: '90%', sm: 500 },
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)',
          color: 'white',
          fontWeight: 700,
          fontSize: '1.5rem',
        }}>
          Create Your Account
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          {signupError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {signupError}
            </Alert>
          )}
          {signupSuccess && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              {signupSuccess}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSignupSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Username"
              name="username"
              value={signupValues.username}
              onChange={handleSignupChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { borderColor: '#0052CC' },
                  '&.Mui-focused fieldset': { borderColor: '#0052CC', borderWidth: 2 },
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={signupValues.email}
              onChange={handleSignupChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { borderColor: '#0052CC' },
                  '&.Mui-focused fieldset': { borderColor: '#0052CC', borderWidth: 2 },
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={signupValues.password}
              onChange={handleSignupChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { borderColor: '#0052CC' },
                  '&.Mui-focused fieldset': { borderColor: '#0052CC', borderWidth: 2 },
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={signupValues.confirmPassword}
              onChange={handleSignupChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { borderColor: '#0052CC' },
                  '&.Mui-focused fieldset': { borderColor: '#0052CC', borderWidth: 2 },
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)',
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0747A6 0%, #0052CC 100%)',
                },
              }}
            >
              Create Account
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setSignupOpen(false)}
            sx={{
              color: '#5E6C84',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginPage;
