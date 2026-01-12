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
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/authSlice';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MenuIcon from '@mui/icons-material/Menu';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GradingIcon from '@mui/icons-material/Grading';
import FeedbackIcon from '@mui/icons-material/Feedback';

const DRAWER_WIDTH = 280;

const HomeComponent = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const userName = useSelector((state) => state.auth.user);
  const role = useSelector((state) => state.auth.role);
  const isAdmin = role === 'admin';

  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const isHome = location.pathname === '/home';
  const isChatRoute = location.pathname === '/home/talk';

  // Navigation items for sidebar
  const navigationItems = [
    { title: 'Start Practice', icon: ChatIcon, path: '/home/talk', color: '#0052CC' },
    { title: 'Conversation History', icon: HistoryIcon, path: '/home/conversations', color: '#36B37E' },
    { title: 'My Feedback', icon: FeedbackIcon, path: '/home/feedback/my-feedback', color: '#FFAB00' },
    ...(isAdmin ? [
      { divider: true },
      { title: 'Characters', icon: PeopleIcon, path: '/home/manage', color: '#00B8D9' },
      { title: 'Activities', icon: AssignmentIcon, path: '/home/manage_activities', color: '#6554C0' },
      { title: 'Rubrics', icon: GradingIcon, path: '/home/rubrics', color: '#FF5630' },
      { title: 'Manage Feedback', icon: FeedbackIcon, path: '/home/feedback/manage', color: '#FF5630' },
    ] : []),
  ];

  // Drawer content
  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, borderBottom: '1px solid #E0E0E0' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#172B4D' }}>
          Navigation
        </Typography>
        <Typography variant="caption" sx={{ color: '#5E6C84' }}>
          {isAdmin ? 'Administrator' : 'Student'} Dashboard
        </Typography>
      </Box>
      <List sx={{ flex: 1, py: 2 }}>
        {navigationItems.map((item, index) => {
          if (item.divider) {
            return (
              <Divider key={`divider-${index}`} sx={{ my: 2, mx: 2 }}>
                <Chip label="Admin" size="small" sx={{ bgcolor: '#DFE1E6', color: '#5E6C84' }} />
              </Divider>
            );
          }

          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <ListItem key={item.title} disablePadding sx={{ px: 2, mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) handleDrawerToggle();
                }}
                sx={{
                  borderRadius: 2,
                  backgroundColor: isActive ? `${item.color}15` : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive ? `${item.color}25` : '#F4F5F7',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Icon sx={{ color: isActive ? item.color : '#5E6C84', fontSize: 22 }} />
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? item.color : '#172B4D',
                    fontSize: '0.9375rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
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

      {/* Conditional Layout: Sidebar for all pages except chat */}
      {!isChatRoute ? (
        <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
          {/* Sidebar Navigation */}
          <Box
            component="nav"
            sx={{
              width: { md: DRAWER_WIDTH },
              flexShrink: { md: 0 },
            }}
          >
            {/* Mobile Drawer */}
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true, // Better mobile performance
              }}
              sx={{
                display: { xs: 'block', md: 'none' },
                '& .MuiDrawer-paper': {
                  boxSizing: 'border-box',
                  width: DRAWER_WIDTH,
                  borderRight: '1px solid #E0E0E0',
                },
              }}
            >
              {drawer}
            </Drawer>

            {/* Desktop Drawer */}
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: 'none', md: 'block' },
                '& .MuiDrawer-paper': {
                  boxSizing: 'border-box',
                  width: DRAWER_WIDTH,
                  borderRight: '1px solid #E0E0E0',
                  position: 'relative',
                  height: 'calc(100vh - 64px)',
                  overflow: 'auto',
                },
              }}
              open
            >
              {drawer}
            </Drawer>
          </Box>

          {/* Main Content Area */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            }}
          >
            {/* Mobile Menu Button */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{
                m: 2,
                display: { md: 'none' },
                bgcolor: '#F4F5F7',
                '&:hover': {
                  bgcolor: '#DFE1E6',
                },
              }}
            >
              <MenuIcon />
            </IconButton>

            <Outlet />
          </Box>
        </Box>
      ) : (
        <Box sx={{ minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Box>
      )}
    </Box>
  );
};

export default HomeComponent;
