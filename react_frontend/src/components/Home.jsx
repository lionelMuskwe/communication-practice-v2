import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Box, Typography, Menu, MenuItem } from '@mui/material';
import { useDispatch } from 'react-redux';
import { logout } from '../features/authSlice';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const HomeComponent = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [anchorEl, setAnchorEl] = useState(null);

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login'); // Redirect to login after logout
        handleClose();
    };

    return (
        <Box sx={{ flexGrow: 1, height: '30vh' }}>
            <AppBar position="static">
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="h6" component="div">
                        Dashboard
                    </Typography>
                    <div>
                        <IconButton
                            size="large"
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleMenu}
                            color="inherit"
                        >
                            <AccountCircleIcon />
                        </IconButton>
                        
                        <Menu
                            id="fade-menu"
                            anchorEl={anchorEl}
                            keepMounted
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                            
                            >
                            <MenuItem onClick={handleLogout}>Log out</MenuItem>
                            </Menu>
                        
                    </div>
                </Toolbar>
            </AppBar>
            <Box sx={{ padding: 0, minHeight: 'calc(100vh - 64px)'}}>
                <Outlet />
            </Box>
        </Box>
    );
};

export default HomeComponent;
