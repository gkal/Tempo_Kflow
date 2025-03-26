import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Create a theme that matches your existing color scheme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#52796f',
    },
    secondary: {
      main: '#84a98c',
    },
    background: {
      default: '#2f3e46',
      paper: '#354f52',
    },
    text: {
      primary: '#cad2c5',
      secondary: '#84a98c',
    },
  },
  components: {
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#2f3e46',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(53, 79, 82, 0.5)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(82, 121, 111, 0.3)',
        },
        head: {
          color: '#84a98c',
          fontWeight: 'normal',
        },
        body: {
          color: '#cad2c5',
        },
      },
    },
  },
});

interface MuiThemeProviderProps {
  children: React.ReactNode;
}

export const MuiThemeProvider: React.FC<MuiThemeProviderProps> = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default MuiThemeProvider; 