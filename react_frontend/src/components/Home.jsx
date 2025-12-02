import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Button,
  Chip,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/authSlice';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

const HomeComponent = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const userName = useSelector((state) => state.auth.user);
  const role = useSelector((state) => state.auth.role);

  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    handleClose();
  };

  const isHome = location.pathname === '/home';

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: { xs: 0.5, sm: 1 }, minHeight: { xs: 56, sm: 64 } }}>
          {/* Logo/Brand */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.75, sm: 1 },
              cursor: 'pointer',
            }}
            onClick={() => navigate('/home')}
          >
            <LocalHospitalIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: '#FF5630' }} />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: 'white',
                letterSpacing: '-0.5px',
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}
            >
              MedComm
            </Typography>
          </Box>

          {/* Right Side */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1, md: 2 } }}>
            {!isHome && (
              <Button
                startIcon={<HomeIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                onClick={() => navigate('/home')}
                sx={{
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: { xs: 1, sm: 1.5, md: 2 },
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                  display: { xs: 'none', sm: 'flex' },
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Dashboard
              </Button>
            )}

            {/* Mobile Home Icon Button */}
            {!isHome && (
              <IconButton
                onClick={() => navigate('/home')}
                sx={{
                  color: 'white',
                  display: { xs: 'flex', sm: 'none' },
                  p: 1,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <HomeIcon sx={{ fontSize: 20 }} />
              </IconButton>
            )}

            <Chip
              label={role === 'admin' ? 'Admin' : 'Student'}
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontWeight: 600,
                fontSize: { sm: '0.75rem', md: '0.8125rem' },
                display: { xs: 'none', sm: 'flex' },
                height: { sm: 24, md: 28 },
              }}
            />

            <IconButton
              size="large"
              aria-label="account menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              sx={{
                color: 'white',
                p: { xs: 0.5, sm: 1 },
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <Avatar
                sx={{
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  bgcolor: '#FF5630',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  fontWeight: 700,
                }}
              >
                {userName?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>

            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  borderRadius: 2,
                  minWidth: 200,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #DFE1E6' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#172B4D' }}>
                  {userName || 'User'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#5E6C84' }}>
                  {role === 'admin' ? 'Administrator' : 'Student'}
                </Typography>
              </Box>
              <MenuItem
                onClick={handleLogout}
                sx={{
                  py: 1.5,
                  gap: 1.5,
                  '&:hover': {
                    bgcolor: '#FFEBE6',
                    color: '#DE350B',
                  },
                }}
              >
                <LogoutIcon fontSize="small" />
                <Typography>Log out</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ minHeight: 'calc(100vh - 64px)' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default HomeComponent;
