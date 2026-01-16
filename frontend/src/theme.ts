import { createTheme } from '@mui/material/styles';

/**
 * Material UI theme configured to match the existing design system
 */
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6F8DAE', // --tc-accent-primary
      light: '#A2885B', // --tc-accent-secondary
      dark: '#5a7089',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#A2885B', // --tc-accent-secondary
      light: '#b89d6f',
      dark: '#8a7249',
      contrastText: '#ffffff',
    },
    error: {
      main: '#C74A3D', // --tc-role-dps
      light: '#d66b5f',
      dark: '#a03a2e',
      contrastText: '#ffffff',
    },
    success: {
      main: '#27AE60', // --tc-status-current
      light: '#4cbf7a',
      dark: '#1d7a44',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#E67E22', // --tc-spec-off
      light: '#eb9950',
      dark: '#b1621b',
      contrastText: '#ffffff',
    },
    info: {
      main: '#5DADE2', // --tc-aug-tome
      light: '#7dbee8',
      dark: '#4a8ab4',
      contrastText: '#ffffff',
    },
    background: {
      default: '#1B1F27', // --tc-bg-dark
      paper: '#2A2F38', // --tc-bg-surface / --tc-bg-card
    },
    text: {
      primary: '#EDEDED', // --tc-text-main
      secondary: '#A0A8B8', // --tc-text-muted
    },
    divider: '#3A3F4A', // --tc-border
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    fontSize: 18, // Base font size
    h1: {
      fontSize: '2rem', // ~36px
    },
    h2: {
      fontSize: '1.75rem', // ~31.5px
    },
    h3: {
      fontSize: '1.5rem', // ~27px
    },
    h4: {
      fontSize: '1.25rem', // ~22.5px
    },
    body1: {
      fontSize: '1rem', // ~18px
    },
    body2: {
      fontSize: '0.875rem', // ~15.75px
    },
    button: {
      textTransform: 'none', // Keep button text as-is, don't uppercase
      fontWeight: 500,
      fontSize: '1rem', // ~18px
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          padding: '10px 20px', // Increased from 8px 16px
          fontSize: '1rem', // ~18px, increased from 14px
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: 'none',
          },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': {
            borderWidth: '1px',
          },
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #6F8DAE',
            outlineOffset: '2px',
          },
        },
      },
    },
  },
});

