import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
} from '@mui/material';
import { post } from '../services/apiService';

const Signup = () => {
  const [username, setUsername]           = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPwd]  = useState('');
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in every field.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await post('/api/create_users', {    // <-- Updated to match Flask API
        username,
        email,
        password,
        role: 'student',
      });
      setSuccess('Account created – you can now log in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const apiMsg = err.response?.data?.message;
      setError(apiMsg || 'Sign‑up failed. Please try again.');
    }
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',       // American spelling
          mt: 8,
        }}
      >
        <Typography component="h1" variant="h4" sx={{ color: '#003366', mb: 2 }}>
          Create an Account
        </Typography>
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
            {success}
          </Alert>
        )}
        <Box component="form" sx={{ width: '100%' }} onSubmit={handleSubmit}>
          <TextField
            required fullWidth margin="normal"
            label="Username" autoComplete="username"
            value={username} onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            required fullWidth margin="normal"
            label="Email Address" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            required fullWidth margin="normal"
            label="Password" type="password" autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <TextField
            required fullWidth margin="normal"
            label="Confirm Password" type="password"
            value={confirmPassword} onChange={(e) => setConfirmPwd(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, backgroundColor: '#003366', color: '#ffffff' }}
          >
            Sign Up
          </Button>
          <Link
            component={RouterLink}
            to="/login"
            variant="body2"
            sx={{ display: 'block', mt: 1, color: '#003366' }}
          >
            Already have an account? Log in
          </Link>
        </Box>
      </Box>
    </Container>
  );
};

export default Signup;
