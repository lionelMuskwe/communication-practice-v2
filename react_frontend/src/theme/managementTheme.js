// Modern professional theme configuration for management pages
export const managementTheme = {
  // Color palette - Modern professional colors
  colors: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrast: '#ffffff',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
      elevated: '#fafbfc',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
      disabled: '#9e9e9e',
    },
    divider: '#e0e0e0',
  },

  // Spacing system (8px base)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  // Border radius
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  // Typography
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h5: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.43,
    },
  },
};

// Common MUI sx props for reusable components
export const commonStyles = {
  // Page container
  pageContainer: {
    p: 4,
    backgroundColor: 'background.default',
    minHeight: '100vh',
  },

  // Page header
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 4,
  },

  // Paper card wrapper
  paperCard: {
    p: 3,
    borderRadius: 2,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    backgroundColor: '#ffffff',
    transition: 'box-shadow 0.3s ease-in-out',
    '&:hover': {
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
    },
  },

  // Elevated paper (for nested content)
  paperElevated: {
    p: 2,
    borderRadius: 1.5,
    backgroundColor: '#fafbfc',
    border: '1px solid #e0e0e0',
  },

  // Action buttons container
  actionButtons: {
    display: 'flex',
    gap: 1,
    justifyContent: 'flex-end',
  },

  // Icon button with hover effect
  iconButton: {
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      transform: 'scale(1.1)',
    },
  },

  // Primary button
  primaryButton: {
    px: 3,
    py: 1.5,
    borderRadius: 2,
    textTransform: 'none',
    fontWeight: 600,
    boxShadow: '0 2px 4px rgba(25, 118, 210, 0.25)',
    '&:hover': {
      boxShadow: '0 4px 8px rgba(25, 118, 210, 0.35)',
    },
  },

  // Secondary button
  secondaryButton: {
    px: 3,
    py: 1.5,
    borderRadius: 2,
    textTransform: 'none',
    fontWeight: 500,
  },

  // DataGrid container
  dataGridContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 2,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    '& .MuiDataGrid-root': {
      border: 'none',
    },
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: '#f5f7fa',
      borderBottom: '2px solid #e0e0e0',
      fontWeight: 600,
    },
    '& .MuiDataGrid-row': {
      '&:hover': {
        backgroundColor: '#f5f7fa',
      },
    },
  },

  // Dialog with modern styling
  modernDialog: {
    '& .MuiDialog-paper': {
      borderRadius: 3,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
  },

  // Tabs with modern styling
  modernTabs: {
    borderBottom: '2px solid #e0e0e0',
    '& .MuiTab-root': {
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '0.9375rem',
      minHeight: 48,
    },
    '& .Mui-selected': {
      fontWeight: 600,
    },
  },

  // List item with hover
  listItem: {
    borderRadius: 2,
    mb: 1,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      backgroundColor: '#f5f7fa',
      transform: 'translateX(4px)',
    },
  },

  // Form field
  formField: {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      '&:hover fieldset': {
        borderColor: '#1976d2',
      },
    },
  },
};
