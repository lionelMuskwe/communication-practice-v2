import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../features/authSlice';
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
} from '@mui/material';

const LoginPage = () => {
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Signup dialog states
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupValues, setSignupValues] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);

  // Handle login form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const result = await dispatch(loginUser({ email, password }));
      if (loginUser.fulfilled.match(result)) {
        navigate('/home');
      } else {
        setErrorMessage(result.payload || 'Invalid username or password.');
      }
    } catch {
      setErrorMessage('An error occurred during login. Please try again.');
    }
  };

  // Signup logic
  const handleSignupChange = (e) => {
    setSignupValues({
      ...signupValues,
      [e.target.name]: e.target.value,
    });
  };

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
      const res = await fetch('/api/create_users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role }),
      });
      const data = await res.json();
      if (res.status === 201) {
        setSignupSuccess('User created successfully. You may now login.');
        setSignupValues({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'student'
        });
      } else {
        setSignupError(data.message || 'Signup failed. Try again.');
      }
    } catch {
      setSignupError('An error occurred during signup. Please try again.');
    }
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 8,
        }}
      >
        <Typography component="h1" variant="h4" sx={{ color: '#003366', mb: 2 }}>
          Medical Student Learning Portal
        </Typography>
        <Typography component="h2" variant="h6" sx={{ color: '#003366', mb: 4 }}>
          Welcome to your personalised learning experience
        </Typography>
        {(errorMessage || auth.error) && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {errorMessage || auth.error}
          </Alert>
        )}
        <Box component="form" sx={{ width: '100%' }} onSubmit={handleSubmit}>
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
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            label="Password"
            name="password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, backgroundColor: '#003366', color: '#fff' }}
          >
            Login
          </Button>
          {/* No forgot password link */}
          <Link
            component="button"
            variant="body2"
            sx={{ display: 'block', mt: 1, color: '#003366' }}
            onClick={() => setSignupOpen(true)}
          >
            New here? Sign Up
          </Link>
        </Box>
        <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 4 }}>
          Your data is secure with us.
        </Typography>
      </Box>

      {/* Signup Dialog */}
      <Dialog open={signupOpen} onClose={() => setSignupOpen(false)}>
        <DialogTitle>Sign Up</DialogTitle>
        <DialogContent>
          {signupError && <Alert severity="error" sx={{ mb: 2 }}>{signupError}</Alert>}
          {signupSuccess && <Alert severity="success" sx={{ mb: 2 }}>{signupSuccess}</Alert>}
          <Box component="form" onSubmit={handleSignupSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Username"
              name="username"
              value={signupValues.username}
              onChange={handleSignupChange}
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
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 2, backgroundColor: '#003366', color: '#fff' }}
            >
              Register
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignupOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LoginPage;
