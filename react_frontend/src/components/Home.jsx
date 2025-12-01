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
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          {/* Logo/Brand */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/home')}
          >
            <LocalHospitalIcon sx={{ fontSize: 32, color: '#FF5630' }} />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: 'white',
                letterSpacing: '-0.5px',
              }}
            >
              MedComm
            </Typography>
          </Box>

          {/* Right Side */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {!isHome && (
              <Button
                startIcon={<HomeIcon />}
                onClick={() => navigate('/home')}
                sx={{
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Dashboard
              </Button>
            )}

            <Chip
              label={role === 'admin' ? 'Admin' : 'Student'}
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontWeight: 600,
                display: { xs: 'none', sm: 'flex' },
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
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: '#FF5630',
                  fontSize: '1rem',
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
